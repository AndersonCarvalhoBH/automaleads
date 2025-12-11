// src/webhooks/paymentWebhookController.ts
import { Request, Response } from "express";
import paymentService from "../services/paymentService";

const paymentWebhookController = {
  async handle(req: Request, res: Response) {
    const gateway = (req.params.gateway || "").toLowerCase();

    try {
      const event = await paymentService.validateAndParse({
        gateway,
        rawBody: (req as any).rawBody,
        headers: req.headers,
      });

      await paymentService.processEvent(event);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[WEBHOOK] payment error:", error?.message || error);
      return res.status(400).json({ success: false, error: error?.message || "Webhook error" });
    }
  },
};

export default paymentWebhookController;
