import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  asaasCreateCustomer,
  asaasCreateSubscription,
  asaasCancelSubscription,
} from "../integrations/asaasClient";

export const billingRoutes = Router();

// Lista planos disponíveis
billingRoutes.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
    });
    res.json({ success: true, data: plans });
  } catch (err: any) {
    console.error("Erro ao listar planos:", err);
    res.status(500).json({ success: false, error: { message: "Erro ao listar planos" } });
  }
});

interface CreateSubscriptionBody {
  accountId: string;
  planId: string;
  billingType: "CREDIT_CARD" | "BOLETO" | "PIX";
  cycle?: "monthly" | "yearly";
  customer: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  };
}

// Cria assinatura no Asaas e salva na base
billingRoutes.post("/subscriptions", async (req: Request, res: Response) => {
  const body = req.body as CreateSubscriptionBody;
  try {
    if (!process.env.ASAAS_API_KEY) {
      return res.status(500).json({ success: false, error: { message: "ASAAS_API_KEY nao configurada" } });
    }

    const account = await prisma.account.findUnique({ where: { id: body.accountId } });
    const plan = await prisma.plan.findUnique({ where: { id: body.planId } });

    if (!account || !plan) {
      return res.status(404).json({ success: false, error: { message: "Conta ou plano nao encontrado" } });
    }

    // Customer Asaas: reutiliza se houver assinatura anterior com asaasCustomerId
    let asaasCustomerId: string | null = null;
    const lastSub = await prisma.subscription.findFirst({
      where: { accountId: account.id, asaasCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (lastSub?.asaasCustomerId) {
      asaasCustomerId = lastSub.asaasCustomerId;
    } else {
      const createdCustomer = await asaasCreateCustomer({
        name: body.customer.name,
        email: body.customer.email,
        cpfCnpj: body.customer.cpfCnpj,
        mobilePhone: body.customer.phone,
      });
      asaasCustomerId = createdCustomer?.id;
    }

    const cycle = body.cycle === "yearly" ? "YEARLY" : "MONTHLY";
    const value = cycle === "YEARLY" && plan.priceYearly > 0 ? plan.priceYearly : plan.priceMonthly;

    const createdSub = await asaasCreateSubscription({
      customer: asaasCustomerId as string,
      billingType: body.billingType,
      value,
      cycle: cycle === "YEARLY" ? "YEARLY" : "MONTHLY",
      description: `Plano ${plan.name}`,
    });

    const saved = await prisma.subscription.create({
      data: {
        accountId: account.id,
        planId: plan.id,
        status: "active",
        billingCycle: cycle.toLowerCase(),
        price: value,
        asaasCustomerId: asaasCustomerId || null,
        asaasSubscriptionId: createdSub?.id || null,
      },
      include: { plan: true },
    });

    return res.json({ success: true, data: saved, asaas: createdSub });
  } catch (err: any) {
    console.error("Erro ao criar assinatura Asaas:", err?.response?.data || err);
    res.status(500).json({
      success: false,
      error: { message: "Erro ao criar assinatura", detail: err?.response?.data || err?.message },
    });
  }
});

// Cancela assinatura Asaas e atualiza base
billingRoutes.post("/subscriptions/:id/cancel", async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    });
    if (!subscription) {
      return res.status(404).json({ success: false, error: { message: "Assinatura nao encontrada" } });
    }

    if (subscription.asaasSubscriptionId) {
      await asaasCancelSubscription(subscription.asaasSubscriptionId);
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "canceled", canceledAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("Erro ao cancelar assinatura:", err?.response?.data || err);
    res.status(500).json({
      success: false,
      error: { message: "Erro ao cancelar assinatura", detail: err?.response?.data || err?.message },
    });
  }
});
