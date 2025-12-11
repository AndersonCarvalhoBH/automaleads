import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

export const userRoutes = Router();

function ensureAccountAdmin(req: AuthRequest, res: any) {
  if (!req.user) {
    res.status(401).json({ error: "Nao autenticado" });
    return false;
  }
  if (req.user.role !== "admin" && req.user.role !== "master") {
    res.status(403).json({ error: "Apenas admin da conta pode gerenciar usuarios." });
    return false;
  }
  return true;
}

/**
 * GET /users - lista usuários da conta do token
 */
userRoutes.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Nao autenticado" });

    const users = await prisma.user.findMany({
      where: { accountId: req.user.accountId },
      orderBy: { createdAt: "asc" },
    });
    const safe = users.map(({ password, ...rest }) => rest);
    return res.json({ success: true, data: safe });
  } catch (error) {
    console.error("Erro ao listar usuarios:", error);
    return res.status(500).json({ error: "Erro ao listar usuarios" });
  }
});

/**
 * POST /users - cria usuário na conta do token (admin/master)
 */
userRoutes.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!ensureAccountAdmin(req, res)) return;

    const { name, email, password, role } = req.body;
    const accountId = req.user!.accountId;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Campos name, email e password são obrigatorios." });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Já existe um usuario com esse email." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role && role !== "master" ? role : "user",
        accountId,
      },
      select: { id: true, name: true, email: true, role: true, accountId: true, createdAt: true, updatedAt: true },
    });

    return res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    console.error("Erro ao criar usuario:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Email já cadastrado." });
    }
    return res.status(500).json({ error: "Erro ao criar usuario" });
  }
});

/**
 * PUT /users/:id - atualiza nome/role (mesma conta)
 */
userRoutes.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!ensureAccountAdmin(req, res)) return;
    const { id } = req.params;
    const { name, role } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.accountId !== req.user!.accountId) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? user.name,
        role: role && role !== "master" ? role : user.role,
      },
      select: { id: true, name: true, email: true, role: true, accountId: true, createdAt: true, updatedAt: true },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Erro ao atualizar usuario:", error);
    return res.status(500).json({ error: "Erro ao atualizar usuario" });
  }
});

/**
 * DELETE /users/:id - remove usuario da mesma conta
 */
userRoutes.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!ensureAccountAdmin(req, res)) return;
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.accountId !== req.user!.accountId) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir usuario:", error);
    return res.status(500).json({ error: "Erro ao excluir usuario" });
  }
});
