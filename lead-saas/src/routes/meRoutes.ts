// src/routes/meRoutes.ts

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

export const meRoutes = Router();

// GET /me
// Retorna dados do usuário autenticado
meRoutes.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { password, ...safeUser } = user;

    return res.json(safeUser);
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    return res.status(500).json({ error: "Erro ao buscar dados do usuário" });
  }
});
