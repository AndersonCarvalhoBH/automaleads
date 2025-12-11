// src/routes/accountRoutes.ts

import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

export const accountRoutes = Router();

/**
 * GET /account/me
 * Retorna dados do usuário atual + conta
 */
accountRoutes.get(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const account = await prisma.account.findUnique({
        where: { id: user.accountId },
      });

      if (!account) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      // Se estiver em impersonate, traz info básica de quem iniciou
      let impersonatedBy: { id: string; name: string; email: string } | null =
        null;

      if (req.user.impersonatedBy) {
        const masterUser = await prisma.user.findUnique({
          where: { id: req.user.impersonatedBy },
        });

        if (masterUser) {
          impersonatedBy = {
            id: masterUser.id,
            name: masterUser.name,
            email: masterUser.email,
          };
        }
      }

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountId: user.accountId,
        },
        account: {
          id: account.id,
          name: account.name,
          plan: account.plan,
          status: account.status,
        },
        impersonatedBy,
      });
    } catch (error) {
      console.error("Erro em GET /account/me:", error);
      return res
        .status(500)
        .json({ error: "Erro ao carregar dados da conta do usuário." });
    }
  }
);

/**
 * PUT /account/me
 * Atualiza dados básicos do usuário (nome e e-mail)
 */
accountRoutes.put(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const { name, email } = req.body as {
        name?: string;
        email?: string;
      };

      if (!name && !email) {
        return res
          .status(400)
          .json({ error: "Nada para atualizar (nome ou e-mail)." });
      }

      // Se for trocar e-mail, valida se já não está sendo usado
      if (email) {
        const existing = await prisma.user.findFirst({
          where: {
            email,
            id: { not: req.user.id },
          },
        });

        if (existing) {
          return res
            .status(400)
            .json({ error: "Já existe um usuário com esse e-mail." });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: name ?? undefined,
          email: email ?? undefined,
        },
      });

      const account = await prisma.account.findUnique({
        where: { id: updatedUser.accountId },
      });

      return res.json({
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          accountId: updatedUser.accountId,
        },
        account: account
          ? {
              id: account.id,
              name: account.name,
              plan: account.plan,
              status: account.status,
            }
          : null,
      });
    } catch (error) {
      console.error("Erro em PUT /account/me:", error);
      return res
        .status(500)
        .json({ error: "Erro ao atualizar dados do usuário." });
    }
  }
);
