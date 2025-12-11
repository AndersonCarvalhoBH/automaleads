// src/middlewares/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "seuSegredoSuperSeguro123";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    accountId: string;
    impersonatedBy?: string;
  };
  account?: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
}

interface JwtPayload {
  userId: string;
  accountId: string;
  role: string;
  impersonatedBy?: string;
  iat: number;
  exp: number;
}

/**
 * Middleware padrão de autenticação:
 * - Lê Authorization: Bearer <token>
 * - Valida JWT
 * - Carrega usuário e conta
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token não informado." });
    }

    const [, token] = authHeader.split(" ");
    if (!token) {
      return res.status(401).json({ error: "Token inválido." });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado." });
    }

    const account = await prisma.account.findUnique({
      where: { id: user.accountId },
    });

    if (!account) {
      return res.status(401).json({ error: "Conta não encontrada." });
    }

    if (account.status === "suspended") {
      return res.status(403).json({
        error: "Conta suspensa. Entre em contato com o suporte.",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountId: user.accountId,
      impersonatedBy: decoded.impersonatedBy,
    };

    req.account = {
      id: account.id,
      name: account.name,
      plan: account.plan,
      status: account.status,
    };

    return next();
  } catch (error) {
    console.error("Erro no authMiddleware:", error);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * Garante que o usuário atual é MASTER.
 */
export function ensureMasterRole(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  if (req.user.role !== "master") {
    return res.status(403).json({ error: "Apenas MASTER pode acessar esta rota." });
  }

  return next();
}
