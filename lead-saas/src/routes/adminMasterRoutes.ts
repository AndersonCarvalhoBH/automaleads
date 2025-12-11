// src/routes/adminMasterRoutes.ts

import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "seuSegredoSuperSeguro123";

export const adminMasterRoutes = Router();

/**
 * Garante que o usuário logado é MASTER
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
 * GET /admin/master/dashboard
 * Visão geral global da plataforma
 */
adminMasterRoutes.get(
  "/dashboard",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const [totalAccounts, totalUsers, totalLeads] = await Promise.all([
        prisma.account.count(),
        prisma.user.count(),
        prisma.lead.count(),
      ]);

      const accountsActive = await prisma.account.count({
        where: { status: "active" },
      });
      const accountsInactive = totalAccounts - accountsActive;

      const jobsQueued = await prisma.backgroundJob.count({
        where: { status: "queued" },
      });
      const jobsRunning = await prisma.backgroundJob.count({
        where: { status: "running" },
      });
      const jobsFailed = await prisma.backgroundJob.count({
        where: { status: "failed" },
      });

      const paidInvoices = await prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid" },
      });

      const monthlyMRR = paidInvoices._sum.amount || 0;
      const arr = monthlyMRR * 12;

      const lastEvents = await prisma.leadEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          lead: {
            select: { id: true, email: true, name: true, accountId: true },
          },
        },
      });

      return res.json({
        totalAccounts,
        totalUsers,
        totalLeads,
        accountsActive,
        accountsInactive,
        jobs: {
          queued: jobsQueued,
          running: jobsRunning,
          failed: jobsFailed,
        },
        finance: {
          mrr: monthlyMRR,
          arr,
        },
        lastEvents: lastEvents.map((e) => ({
          id: e.id,
          type: e.type,
          leadId: e.leadId,
          leadEmail: e.lead?.email,
          leadName: e.lead?.name,
          createdAt: e.createdAt,
        })),
      });
    } catch (error) {
      console.error("Erro em /admin/master/dashboard:", error);
      return res
        .status(500)
        .json({ error: "Erro ao carregar visão geral da plataforma." });
    }
  }
);

/**
 * GET /admin/master/accounts
 * Listagem completa de contas com indicadores
 */
adminMasterRoutes.get(
  "/accounts",
  authMiddleware,
  ensureMaster,
  async (_req: AuthRequest, res: Response) => {
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

          const invoicesAgg = await prisma.invoice.aggregate({
            _sum: { amount: true },
            _count: { _all: true },
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
            invoicesCount: invoicesAgg._count._all,
            totalBilled: invoicesAgg._sum.amount || 0,
          };
        })
      );

      return res.json(result);
    } catch (error) {
      console.error("Erro em /admin/master/accounts:", error);
      return res
        .status(500)
        .json({ error: "Erro ao listar contas (MASTER)." });
    }
  }
);

/**
 * GET /admin/master/accounts/:accountId
 * Detalhe da conta
 */
adminMasterRoutes.get(
  "/accounts/:accountId",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;

      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      const [users, leads, invoices] = await Promise.all([
        prisma.user.findMany({
          where: { accountId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.lead.findMany({
          where: { accountId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.invoice.findMany({
          where: { accountId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return res.json({
        account,
        users,
        leads,
        invoices,
      });
    } catch (error) {
      console.error("Erro em /admin/master/accounts/:accountId:", error);
      return res
        .status(500)
        .json({ error: "Erro ao carregar detalhes da conta." });
    }
  }
);

/**
 * PATCH /admin/master/accounts/:accountId
 * Atualiza dados básicos da conta
 */
adminMasterRoutes.patch(
  "/accounts/:accountId",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const { name, domain, plan, status } = req.body as {
        name?: string;
        domain?: string | null;
        plan?: string;
        status?: string;
      };

      const account = await prisma.account.update({
        where: { id: accountId },
        data: {
          name,
          domain,
          plan,
          status,
        },
      });

      return res.json(account);
    } catch (error) {
      console.error("Erro em PATCH /admin/master/accounts/:accountId:", error);
      return res
        .status(500)
        .json({ error: "Erro ao atualizar dados da conta." });
    }
  }
);

// ----------------- IMPERSONATE -----------------

/**
 * POST /admin/master/accounts/:accountId/impersonate
 * Gera um token para entrar como cliente (impersonate)
 */
adminMasterRoutes.post(
  "/accounts/:accountId/impersonate",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { accountId } = req.params;

      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      // Escolhe um usuário admin ou, se não tiver, qualquer usuário da conta
      let targetUser = await prisma.user.findFirst({
        where: {
          accountId,
          role: "admin",
        },
        orderBy: { createdAt: "asc" },
      });

      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { accountId },
          orderBy: { createdAt: "asc" },
        });
      }

      if (!targetUser) {
        return res.status(404).json({
          error: "Nenhum usuário encontrado para essa conta.",
        });
      }

      // Gera token com impersonatedBy
      const token = jwt.sign(
        {
          userId: targetUser.id,
          accountId: targetUser.accountId,
          role: targetUser.role,
          impersonatedBy: req.user?.id,
        },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      // Registra log de auditoria
      await prisma.systemLog.create({
        data: {
          level: "audit",
          message: `Impersonate: MASTER ${req.user?.email} entrou como ${targetUser.email} na conta ${account.name}`,
          accountId: account.id,
          userId: targetUser.id,
          module: "auth",
          context: JSON.stringify({
            impersonatedBy: req.user?.id,
            impersonatedByEmail: req.user?.email,
          }),
        },
      });

      return res.json({
        token,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          accountId: targetUser.accountId,
        },
      });
    } catch (error) {
      console.error("Erro em POST /admin/master/accounts/:accountId/impersonate:", error);
      return res
        .status(500)
        .json({ error: "Erro ao realizar impersonate para esta conta." });
    }
  }
);

// ----------------- Gestão Global de Usuários -----------------

adminMasterRoutes.get(
  "/users",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { q, role } = req.query as { q?: string; role?: string };

      const users = await prisma.user.findMany({
        where: {
          AND: [
            q
              ? {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {},
            role ? { role } : {},
          ],
        },
        orderBy: { createdAt: "desc" },
        include: {
          account: {
            select: { id: true, name: true, plan: true, status: true },
          },
        },
      });

      return res.json(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          account: u.account,
        }))
      );
    } catch (error) {
      console.error("Erro em /admin/master/users:", error);
      return res
        .status(500)
        .json({ error: "Erro ao listar usuários globais." });
    }
  }
);

// ----------------- Módulos / Logs / Infra / Tickets / Reports -----------------

adminMasterRoutes.get(
  "/modules",
  authMiddleware,
  ensureMaster,
  async (_req: AuthRequest, res: Response) => {
    try {
      const usages = await prisma.moduleUsage.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          account: { select: { id: true, name: true, plan: true } },
        },
      });

      return res.json(
        usages.map((u) => ({
          id: u.id,
          account: u.account,
          module: u.module,
          period: u.period,
          used: u.used,
          limit: u.limit,
          createdAt: u.createdAt,
        }))
      );
    } catch (error) {
      console.error("Erro em /admin/master/modules:", error);
      return res
        .status(500)
        .json({ error: "Erro ao listar uso de módulos." });
    }
  }
);

adminMasterRoutes.get(
  "/logs",
  authMiddleware,
  ensureMaster,
  async (req: AuthRequest, res: Response) => {
    try {
      const { level, module } = req.query as {
        level?: string;
        module?: string;
      };

      const logs = await prisma.systemLog.findMany({
        where: {
          AND: [
            level ? { level } : {},
            module ? { module } : {},
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return res.json(logs);
    } catch (error) {
      console.error("Erro em /admin/master/logs:", error);
      return res
        .status(500)
        .json({ error: "Erro ao listar logs de sistema." });
    }
  }
);

adminMasterRoutes.get(
  "/infra",
  authMiddleware,
  ensureMaster,
  async (_req: AuthRequest, res: Response) => {
    try {
      return res.json({
        app: {
          status: "ok",
          uptimeSeconds: Math.floor(process.uptime()),
          version: "1.0.0",
        },
        resources: {
          cpu: {
            usagePercent: 35,
          },
          memory: {
            usedMB: 512,
            totalMB: 2048,
          },
        },
      });
    } catch (error) {
      console.error("Erro em /admin/master/infra:", error);
      return res
        .status(500)
        .json({ error: "Erro ao carregar status de infraestrutura." });
    }
  }
);

adminMasterRoutes.get(
  "/tickets",
  authMiddleware,
  ensureMaster,
  async (_req: AuthRequest, res: Response) => {
    try {
      const tickets = await prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          account: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json(
        tickets.map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt,
          account: t.account,
          user: t.user,
        }))
      );
    } catch (error) {
      console.error("Erro em /admin/master/tickets:", error);
      return res
        .status(500)
        .json({ error: "Erro ao listar tickets de suporte." });
    }
  }
);

adminMasterRoutes.get(
  "/reports",
  authMiddleware,
  ensureMaster,
  async (_req: AuthRequest, res: Response) => {
    try {
      const leadsByAccount = await prisma.lead.groupBy({
        by: ["accountId"],
        _count: { _all: true },
      });

      const accounts = await prisma.account.findMany({
        where: {
          id: {
            in: leadsByAccount.map((l) => l.accountId),
          },
        },
      });

      const ranking = leadsByAccount
        .map((l) => {
          const acc = accounts.find((a) => a.id === l.accountId);
          return {
            accountId: l.accountId,
            accountName: acc?.name || "Conta desconhecida",
            leads: l._count._all,
          };
        })
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 20);

      return res.json({
        rankingAccountsByLeads: ranking,
      });
    } catch (error) {
      console.error("Erro em /admin/master/reports:", error);
      return res
        .status(500)
        .json({ error: "Erro ao gerar relatórios globais." });
    }
  }
);
