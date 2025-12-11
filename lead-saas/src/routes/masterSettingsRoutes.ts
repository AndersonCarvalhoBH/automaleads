// src/routes/masterSettingsRoutes.ts
import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();

function ensureMaster(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Nao autenticado." });
  }

  if (req.user.role !== "master") {
    return res
      .status(403)
      .json({ error: "Apenas usuarios MASTER podem acessar." });
  }

  return next();
}

/**
 * GET /master/settings/branding
 * Retorna { logoDataUrl, primaryColor, secondaryColor, faviconDataUrl }
 */
router.get(
  "/branding",
  authMiddleware,
  ensureMaster,
  async (_req, res) => {
    try {
      const [logo, primary, secondary, favicon] = await Promise.all([
        prisma.globalSetting.findUnique({
          where: { key: "brandingLogoDataUrl" },
        }),
        prisma.globalSetting.findUnique({
          where: { key: "brandingPrimaryColor" },
        }),
        prisma.globalSetting.findUnique({
          where: { key: "brandingSecondaryColor" },
        }),
        prisma.globalSetting.findUnique({
          where: { key: "brandingFaviconDataUrl" },
        }),
      ]);

      return res.json({
        logoDataUrl: logo ? logo.value : null,
        primaryColor: primary ? primary.value : null,
        secondaryColor: secondary ? secondary.value : null,
        faviconDataUrl: favicon ? favicon.value : null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Erro ao carregar configuracoes de branding",
      });
    }
  }
);

/**
 * POST /master/settings/branding
 * Body: { logoDataUrl: string | null, primaryColor?: string | null, secondaryColor?: string | null, faviconDataUrl?: string | null }
 */
router.post(
  "/branding",
  authMiddleware,
  ensureMaster,
  async (req, res) => {
    try {
      const { logoDataUrl, primaryColor, secondaryColor, faviconDataUrl } = req.body as {
        logoDataUrl: string | null;
        primaryColor?: string | null;
        secondaryColor?: string | null;
        faviconDataUrl?: string | null;
      };

      const value = logoDataUrl || "";
      const primaryVal = primaryColor || "";
      const secondaryVal = secondaryColor || "";
      const faviconVal = faviconDataUrl || "";

      const [logo, primary, secondary, favicon] = await Promise.all([
        prisma.globalSetting.upsert({
          where: { key: "brandingLogoDataUrl" },
          update: { value },
          create: {
            key: "brandingLogoDataUrl",
            value,
          },
        }),
        prisma.globalSetting.upsert({
          where: { key: "brandingPrimaryColor" },
          update: { value: primaryVal },
          create: { key: "brandingPrimaryColor", value: primaryVal },
        }),
        prisma.globalSetting.upsert({
          where: { key: "brandingSecondaryColor" },
          update: { value: secondaryVal },
          create: { key: "brandingSecondaryColor", value: secondaryVal },
        }),
        prisma.globalSetting.upsert({
          where: { key: "brandingFaviconDataUrl" },
          update: { value: faviconVal },
          create: { key: "brandingFaviconDataUrl", value: faviconVal },
        }),
      ]);

      return res.json({
        logoDataUrl: logo.value || null,
        primaryColor: primary.value || null,
        secondaryColor: secondary.value || null,
        faviconDataUrl: favicon.value || null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Erro ao salvar configuracoes de branding",
      });
    }
  }
);

export default router;
