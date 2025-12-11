// lead-saas/src/routes/adminAccountRoutes.ts

import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

export const adminAccountRoutes = Router();

/**
 * Middleware interno para garantir que o usuário é MASTER
 */
function ensureMaster(req: AuthRequest, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  if (req.user.role !== "master") {
    return res
      .status(403)
      .json({ error: "Apenas usuários MASTER podem acessar." });
  }

  return next();
}

/**
 * GET /admin/accounts
 * Lista todas as contas com contagem de usuários e leads
 * (usado pelo MasterAdminModal E pode ser reutilizado pelo painel MASTER)
 */
adminAccountRoutes.get(
  "/accounts",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const accounts = await prisma.account.findMany({
        orderBy: { createdAt: "desc" },
      });

      const result = await Promise.all(
        accounts.map(async (acc) => {
          const usersCount = await prisma.user.count({
            where: { accountId: acc.id },
          });
          const leadsCount = await prisma.lead.count({
            where: { accountId: acc.id },
          });

          return {
            id: acc.id,
            name: acc.name,
            domain: acc.domain,
            plan: acc.plan,
            status: acc.status,
            createdAt: acc.createdAt,
            usersCount,
            leadsCount,
          };
        })
      );

      return res.json(result);
    } catch (error) {
      console.error("Erro ao listar contas (admin):", error);
      return res.status(500).json({ error: "Erro ao listar contas." });
    }
  }
);

/**
 * PUT /admin/accounts/:accountId/plan
 * Atualiza apenas o plano da conta (usado pelo MasterAdminModal atual).
 */
adminAccountRoutes.put(
  "/accounts/:accountId/plan",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const { plan } = req.body as { plan: string };

      if (!plan) {
        return res.status(400).json({ error: "Plano é obrigatório." });
      }

      const account = await prisma.account.update({
        where: { id: accountId },
        data: { plan },
      });

      return res.json({
        id: account.id,
        name: account.name,
        plan: account.plan,
        status: account.status,
      });
    } catch (error) {
      console.error("Erro ao atualizar plano da conta:", error);
      return res
        .status(500)
        .json({ error: "Erro ao atualizar plano da conta." });
    }
  }
);

/**
 * PATCH /admin/accounts/:accountId/status
 * Ativa ou suspende uma conta.
 */
adminAccountRoutes.patch(
  "/accounts/:accountId/status",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const { status } = req.body as { status: "active" | "suspended" };

      if (!status) {
        return res.status(400).json({ error: "Status é obrigatório." });
      }

      const account = await prisma.account.update({
        where: { id: accountId },
        data: { status },
      });

      return res.json({
        id: account.id,
        name: account.name,
        plan: account.plan,
        status: account.status,
      });
    } catch (error) {
      console.error("Erro ao alterar status da conta:", error);
      return res
        .status(500)
        .json({ error: "Erro ao alterar status da conta." });
    }
  }
);
