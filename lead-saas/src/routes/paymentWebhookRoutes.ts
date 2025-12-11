// src/routes/paymentWebhookRoutes.ts
import { Router, Response, Request } from "express";
import paymentWebhookController from "../webhooks/paymentWebhookController";
import { rawBody } from "../middlewares/rawBody";

/**
 * Rota pública de webhook de pagamentos.
 * Ex.: POST /payments/webhook/stripe
 */
export const paymentWebhookRoutes = Router();

paymentWebhookRoutes.post(
  "/:gateway",
  rawBody, // necessário para validar assinatura
  async (req: Request, res: Response) => paymentWebhookController.handle(req, res)
);

export default paymentWebhookRoutes;
