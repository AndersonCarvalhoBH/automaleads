// src/services/paymentService.ts
import { prisma } from "../lib/prisma";
import { createHash, createHmac } from "crypto";
import { hashSync } from "bcryptjs";
import { sendWelcomeEmail } from "../utils/mailer";

type ParsedPaymentEvent = {
  gateway: string;
  gatewayEventId: string;
  status: "paid" | "failed" | "past_due" | "canceled";
  type: string;
  customerId?: string;
  subscriptionId?: string;
  planExternalId?: string;
  email?: string;
  name?: string;
  companyName?: string;
  raw: any;
};

function generateTempPassword() {
  return Math.random().toString(36).slice(-10);
}

function parseStripe(rawBody: Buffer, headers: any): ParsedPaymentEvent {
  const sig = headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe secret não configurado");

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

  const object = event.data.object;
  const isPaid = event.type === "invoice.paid";
  const isFail = event.type === "invoice.payment_failed";
  const isCanceled = event.type === "customer.subscription.deleted";

  return {
    gateway: "stripe",
    gatewayEventId: event.id,
    status: isPaid ? "paid" : isFail ? "failed" : isCanceled ? "canceled" : "past_due",
    type: event.type,
    customerId: object.customer,
    subscriptionId: object.subscription || object.id,
    planExternalId: object.lines?.data?.[0]?.price?.id,
    email: object.customer_email,
    name: object.customer_name,
    raw: event,
  };
}

function parsePagarme(rawBody: Buffer, headers: any): ParsedPaymentEvent {
  const signature = headers["x-hub-signature"] as string;
  const secret = process.env.PAGARME_POSTBACK_SECRET;
  if (!secret) throw new Error("Pagar.me secret não configurado");

  const computed = "sha1=" + createHmac("sha1", secret).update(rawBody).digest("hex");
  if (computed !== signature) throw new Error("Assinatura Pagar.me inválida");

  const body = JSON.parse(rawBody.toString("utf-8"));
  const status = body?.current_status;
  return {
    gateway: "pagarme",
    gatewayEventId: body.id,
    status: status === "paid" ? "paid" : status === "refused" ? "failed" : status === "canceled" ? "canceled" : "past_due",
    type: status,
    customerId: body.customer?.id,
    subscriptionId: body.subscription_id || body.id,
    planExternalId: body.plan?.id,
    email: body.customer?.email,
    name: body.customer?.name,
    raw: body,
  };
}

function parseMercadoPago(rawBody: Buffer, headers: any): ParsedPaymentEvent {
  // Simplificado: somente validação de assinatura HMAC com client secret
  const signature = headers["x-signature"] as string;
  const ts = headers["x-request-id"] as string;
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) throw new Error("MercadoPago secret não configurado");

  const computed = createHash("sha256").update(rawBody.toString("utf-8") + secret).digest("hex");
  if (computed !== signature) throw new Error("Assinatura MercadoPago inválida");

  const body = JSON.parse(rawBody.toString("utf-8"));
  const status = body?.data?.status;
  return {
    gateway: "mercadopago",
    gatewayEventId: body?.id?.toString() || ts,
    status: status === "approved" ? "paid" : status === "rejected" ? "failed" : status === "cancelled" ? "canceled" : "past_due",
    type: status,
    customerId: body?.data?.payer?.id?.toString(),
    subscriptionId: body?.data?.subscription_id?.toString(),
    planExternalId: body?.data?.plan_id,
    email: body?.data?.payer?.email,
    name: body?.data?.payer?.first_name,
    raw: body,
  };
}

async function validateAndParse(params: {
  gateway: string;
  rawBody: Buffer;
  headers: any;
}): Promise<ParsedPaymentEvent> {
  const { gateway, rawBody, headers } = params;
  if (!gateway) throw new Error("Gateway não informado");

  switch (gateway) {
    case "stripe":
      return parseStripe(rawBody, headers);
    case "pagarme":
      return parsePagarme(rawBody, headers);
    case "mercadopago":
      return parseMercadoPago(rawBody, headers);
    default:
      throw new Error("Gateway não suportado");
  }
}

async function processEvent(evt: ParsedPaymentEvent) {
  // Idempotência
  const exists = await prisma.paymentEvent.findUnique({
    where: { gatewayEventId: evt.gatewayEventId },
  });
  if (exists) return;

  await prisma.paymentEvent.create({
    data: {
      gateway: evt.gateway,
      gatewayEventId: evt.gatewayEventId,
      type: evt.type,
      payload: JSON.stringify(evt.raw),
    },
  });

  if (evt.status === "paid") {
    await handlePaid(evt);
  } else if (evt.status === "failed" || evt.status === "past_due") {
      await suspendByGatewaySub(evt.subscriptionId);
  } else if (evt.status === "canceled") {
    await cancelByGatewaySub(evt.subscriptionId);
  }
}

async function handlePaid(evt: ParsedPaymentEvent) {
  if (!evt.subscriptionId) throw new Error("subscriptionId ausente");

  const subscription = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId: evt.subscriptionId },
  });

  if (!subscription) {
    // Criar conta nova (fluxo: pagamento cria o tenant)
    const plan = await prisma.plan.findFirst({
      where: { externalId: evt.planExternalId || undefined },
    });
    if (!plan) throw new Error("Plano não encontrado para o gateway");

    const tempPassword = generateTempPassword();
    const account = await prisma.account.create({
      data: {
        name: evt.companyName || evt.email || "Nova conta",
        plan: plan.name,
        status: "active",
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: evt.email || `admin+${account.id}@example.com`,
        name: evt.name || "Admin",
        password: hashSync(tempPassword, 10),
        role: "admin",
        accountId: account.id,
      },
    });

    await prisma.subscription.create({
      data: {
        accountId: account.id,
        planId: plan.id,
        status: "active",
        gateway: evt.gateway,
        gatewayCustomerId: evt.customerId,
        gatewaySubscriptionId: evt.subscriptionId,
        billingCycle: "monthly",
        price: plan.priceMonthly,
      },
    });

    await prisma.invoice.create({
      data: {
        accountId: account.id,
        amount: plan.priceMonthly,
        currency: "BRL",
        status: "paid",
        dueDate: new Date(),
        paidAt: new Date(),
        externalId: evt.gatewayEventId,
      },
    });

    // Email de boas vindas
    await sendWelcomeEmail({
      to: admin.email,
      tempPassword,
      loginUrl: process.env.APP_URL || "http://localhost:3000",
    });
  } else {
    // Já existe: reativar
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "active" },
    });
    await prisma.account.update({
      where: { id: subscription.accountId },
      data: { status: "active", planStatus: "active" },
    });
  }
}

async function suspendByGatewaySub(gatewaySubscriptionId?: string) {
  if (!gatewaySubscriptionId) return;
  const sub = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "past_due" },
  });
  await prisma.account.update({
    where: { id: sub.accountId },
    data: { status: "suspended", planStatus: "past_due" },
  });
}

async function cancelByGatewaySub(gatewaySubscriptionId?: string) {
  if (!gatewaySubscriptionId) return;
  const sub = await prisma.subscription.findFirst({
    where: { gatewaySubscriptionId },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "canceled", canceledAt: new Date() },
  });
  await prisma.account.update({
    where: { id: sub.accountId },
    data: { status: "canceled", planStatus: "canceled" },
  });
}

export default {
  validateAndParse,
  processEvent,
};
