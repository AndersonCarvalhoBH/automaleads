// src/routes/brandingRoutes.ts
import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

export const brandingRoutes = Router();

/**
 * GET /branding
 * Busca as configurações de branding da conta do usuário logado.
 */
brandingRoutes.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const accountId = req.user!.accountId;

      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: {
          brandName: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          sidebarBg: true,
          sidebarText: true,
          accentColor: true,
          themeMode: true
        }
      });

      return res.json({
        status: "success",
        branding: account
      });
    } catch (error) {
      console.error("Erro no GET /branding:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro ao buscar branding"
      });
    }
  }
);

/**
 * POST /branding
 * Atualiza as configurações de branding da conta do usuário logado.
 */
brandingRoutes.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const accountId = req.user!.accountId;

      const {
        brandName,
        logoUrl,
        primaryColor,
        secondaryColor,
        sidebarBg,
        sidebarText,
        accentColor,
        themeMode
      } = req.body;

      const updated = await prisma.account.update({
        where: { id: accountId },
        data: {
          brandName,
          logoUrl,
          primaryColor,
          secondaryColor,
          sidebarBg,
          sidebarText,
          accentColor,
          themeMode
        }
      });

      return res.json({
        status: "success",
        branding: {
          brandName: updated.brandName,
          logoUrl: updated.logoUrl,
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
          sidebarBg: updated.sidebarBg,
          sidebarText: updated.sidebarText,
          accentColor: updated.accentColor,
          themeMode: updated.themeMode
        }
      });
    } catch (error) {
      console.error("Erro no POST /branding:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro ao atualizar branding"
      });
    }
  }
);

/**
 * GET /branding
 * Busca as configurações de branding da conta do usuário logado.
 */
brandingRoutes.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const accountId = req.user!.accountId;
        const branding = await prisma.branding.findUnique({
          where: { accountId },
          select: {
            primaryColor: true,
            secondaryColor: true,
            sidebarColor: true,
            logoUrl: true,
            updatedAt: true
          }
        });

        return res.json({ status: "success", branding });
    } catch (error) {
      console.error("Erro no GET /branding:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro ao buscar branding"
      });
    }
  }
);

/**
 * POST /branding
 * Atualiza as configurações de branding da conta do usuário logado.
 */
brandingRoutes.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const accountId = req.user!.accountId;

      const {
        logoUrl,
        primaryColor,
        secondaryColor,
        sidebarColor
      } = req.body;

      // Usar upsert para criar ou atualizar as configurações de branding
      const result = await prisma.branding.upsert({
        where: { accountId },
        create: {
          accountId,
          logoUrl,
          primaryColor,
          secondaryColor,
          sidebarColor
        },
        update: {
          logoUrl,
          primaryColor,
          secondaryColor,
          sidebarColor
        }
      });

      return res.json({ status: "success", branding: result });
    } catch (error) {
      console.error("Erro no POST /branding:", error);
      return res.status(500).json({
        status: "error",
        message: "Erro ao atualizar branding"
      });
    }
  }
);
