import { Request, Response, NextFunction } from "express";

/**
 * Middleware para preservar o corpo bruto da requisição (necessário para validar
 * assinatura de webhooks de pagamento).
 */
export function rawBody(req: Request, res: Response, next: NextFunction) {
  let data = Buffer.alloc(0);

  req.on("data", (chunk) => {
    data = Buffer.concat([data, chunk]);
  });

  req.on("end", () => {
    (req as any).rawBody = data;
    // Reatribui o body como string/JSON para evitar problemas em handlers simples.
    try {
      req.body = JSON.parse(data.toString("utf-8"));
    } catch {
      req.body = data.toString("utf-8");
    }
    next();
  });
}
