// lead-saas/src/routes/authRoutes.ts

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "seuSegredoSuperSeguro123";

export const authRoutes = Router();

/**
 * POST /auth/login
 * Faz login com email + senha e retorna token + user + account
 */
authRoutes.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "E-mail e senha são obrigatórios." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true },
    });

    if (!user || !user.account) {
      return res
        .status(401)
        .json({ error: "Credenciais inválidas (usuário)." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res
        .status(401)
        .json({ error: "Credenciais inválidas (senha)." });
    }

    if (user.account.status === "suspended") {
      return res.status(403).json({
        error: "Conta suspensa. Entre em contato com o suporte.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        accountId: user.accountId,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountId: user.accountId,
        account: {
          id: user.account.id,
          name: user.account.name,
          plan: user.account.plan,
          status: user.account.status,
        },
      },
      token,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: "Erro ao fazer login." });
  }
});
