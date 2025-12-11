// src/routes/leadRoutes.ts

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";
import { LeadService } from "../services/leadService";

/**
 * Aqui usamos export NOMEADO, porque o server.ts faz:
 *   import { leadRoutes } from "./routes/leadRoutes";
 */
export const leadRoutes = Router();

/**
 * Tipo do lead bruto que esperamos no body da importação manual.
 * Ele é flexível para aceitar variações de nomes de campos:
 * - name / nome
 * - phone / telefone / telefone1
 * - source / origem
 * - etc.
 */
interface RawLeadFromBody {
  name?: string;
  nome?: string;

  email?: string;

  phone?: string;
  telefone?: string;
  telefone1?: string;

  cnpj?: string;

  source?: string;
  origem?: string;

  stage?: string;
  categoria?: string;

  // Extras opcionais
  tags?: string[] | string;
  endereco?: any;
  dadosExtras?: any;

  // Qualquer outro campo que venha
  [key: string]: any;
}

/**
 * GET /leads
 *
 * Lista os leads da conta logada.
 * Endpoint final: GET /leads
 * (porque no server.ts temos app.use("/leads", leadRoutes))
 */
leadRoutes.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const accountId = req.user.accountId;

      const page = parseInt(req.query.page as string, 10) || 1;
      const perPage = parseInt(req.query.perPage as string, 10) || 20;

      const skip = (page - 1) * perPage;
      const take = perPage;

      const [total, leads] = await Promise.all([
        prisma.lead.count({
          where: { accountId: String(accountId) },
        }),
        prisma.lead.findMany({
          where: { accountId: String(accountId) },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
      ]);

      return res.json({
        success: true,
        data: {
          total,
          page,
          perPage,
          leads,
        },
      });
    } catch (error) {
      console.error("[GET /leads] Erro ao listar leads:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erro ao buscar leads.",
        },
      });
    }
  }
);

/**
 * POST /leads/import/manual
 *
 * Importação manual de múltiplos leads a partir do dashboard.
 *
 * Body esperado:
 * {
 *   "leads": [
 *     {
 *       "nome": "Fulano",
 *       "email": "fulano@teste.com",
 *       "telefone": "(11) 99999-8888",
 *       "origem": "planilha",
 *       "categoria": "cliente potencial",
 *       "tags": ["planilha", "manual"],
 *       "endereco": { ... },
 *       "dadosExtras": { ... }
 *     },
 *     ...
 *   ]
 * }
 *
 * Endpoint final: POST /leads/import/manual
 */
leadRoutes.post(
  "/import/manual",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const accountId = String(req.user.accountId);

      const rawLeads = req.body.leads as RawLeadFromBody[] | undefined;

      if (!rawLeads || !Array.isArray(rawLeads) || rawLeads.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: 'Envie um array "leads" com pelo menos um item.',
          },
        });
      }

      let importedCount = 0;
      let mergedCount = 0;

      const results: any[] = [];

      for (const raw of rawLeads) {
        // 1) Normaliza variações de campos
        const name = raw.name || raw.nome || null;
        const email = raw.email || null;

        const phone =
          raw.phone ||
          raw.telefone ||
          raw.telefone1 ||
          null;

        const cnpj = raw.cnpj || null;

        const source = raw.source || raw.origem || "manual_import";

        const stage = raw.stage || "new";

        const categoria = raw.categoria || null;
        const tags = raw.tags || null;
        const endereco = raw.endereco || null;
        const dadosExtras = raw.dadosExtras || null;

        // Monta objeto "data" com extras
        const data: any = {
          categoria,
          tags,
          endereco,
          dadosExtras,
          // Se você quiser, pode guardar o payload original:
          // originalPayload: raw,
        };

        // Remove chaves nulas/undefined do data
        Object.keys(data).forEach((key) => {
          const value = (data as any)[key];
          if (value === null || value === undefined) {
            delete (data as any)[key];
          }
        });

        // 2) Usa o LeadService para criar ou fazer merge
        const result = await LeadService.createOrMerge({
          accountId,
          name,
          email,
          phone,
          cnpj,
          source,
          stage,
          data: Object.keys(data).length > 0 ? data : undefined,
        });

        if (result.wasMerged) {
          mergedCount += 1;
        } else {
          importedCount += 1;
        }

        results.push({
          leadId: result.lead.id,
          wasMerged: result.wasMerged,
          eventType: result.eventType,
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          totalReceived: rawLeads.length,
          importedCount,
          mergedCount,
          items: results,
        },
      });
    } catch (error) {
      console.error("[POST /leads/import/manual] Erro:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erro ao importar leads manualmente.",
        },
      });
    }
  }
);
