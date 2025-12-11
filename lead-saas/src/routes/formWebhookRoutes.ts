// src/routes/formWebhookRoutes.ts

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const formWebhookRoutes = Router();

/**
 * POST /webhooks/forms/generic
 * Recebe 1 lead no padrao oficial e salva na conta indicada
 */
formWebhookRoutes.post("/generic", async (req: Request, res: Response) => {
  try {
    const { account_id, source_type, lead } = req.body;

    // 1) Validar estrutura minima
    if (!account_id) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'account_id' e obrigatorio",
      });
    }

    if (!lead || typeof lead !== "object") {
      return res.status(400).json({
        status: "error",
        message: "Campo 'lead' e obrigatorio e deve ser um objeto",
      });
    }

    // 2) Verificar se a conta existe
    const account = await prisma.account.findUnique({
      where: { id: Number(account_id) },
    });

    if (!account) {
      return res.status(400).json({
        status: "error",
        message: "Conta (account_id) nao encontrada",
      });
    }

    // 3) Padronizar o lead (garantir formato completo)
    const leadPadronizado = {
      nome: lead.nome || "",
      telefone: lead.telefone || "",
      email: lead.email || "",
      origem: lead.origem || "",
      categoria: lead.categoria || "",
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      endereco: {
        logradouro: lead.endereco?.logradouro || "",
        numero: lead.endereco?.numero || "",
        bairro: lead.endereco?.bairro || "",
        cidade: lead.endereco?.cidade || "",
        estado: lead.endereco?.estado || "",
        cep: lead.endereco?.cep || "",
      },
      dados_extras: lead.dados_extras || {},
    };

    // 4) Validacao simples (exemplo: e-mail)
    if (leadPadronizado.email && !leadPadronizado.email.includes("@")) {
      return res.status(400).json({
        status: "error",
        message: "E-mail invalido",
      });
    }

    // 5) Deduplicacao simples (email ou telefone na mesma conta)
    if (leadPadronizado.email || leadPadronizado.telefone) {
      const existing = await prisma.lead.findFirst({
        where: {
          accountId: account.id,
          OR: [
            leadPadronizado.email ? { email: leadPadronizado.email } : undefined,
            leadPadronizado.telefone ? { phone: leadPadronizado.telefone } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (existing) {
        return res.status(200).json({
          status: "success",
          message: "Lead duplicado (email/telefone ja existente). Nenhum novo registro criado.",
          lead: {
            id: existing.id,
            nome: existing.name,
            telefone: existing.phone,
            email: existing.email,
            origem: existing.origin,
            categoria: existing.categoria,
            tags: existing.tags ? JSON.parse(existing.tags) : [],
            endereco: existing.endereco ? JSON.parse(existing.endereco) : null,
            dados_extras: existing.dadosExtras ? JSON.parse(existing.dadosExtras) : null,
            accountId: existing.accountId,
            createdAt: existing.createdAt,
            source_type: source_type || null,
          },
        });
      }
    }

    // 6) Criar lead no banco
    const created = await prisma.lead.create({
      data: {
        name: leadPadronizado.nome || null,
        email: leadPadronizado.email || null,
        phone: leadPadronizado.telefone || null,
        origin: leadPadronizado.origem || null,
        stage: "new",
        accountId: account.id,
        categoria: leadPadronizado.categoria || null,
        tags:
          leadPadronizado.tags.length > 0
            ? JSON.stringify(leadPadronizado.tags)
            : null,
        endereco: JSON.stringify(leadPadronizado.endereco),
        dadosExtras: JSON.stringify(leadPadronizado.dados_extras),
      },
    });

    // 7) Montar resposta no padrao
    return res.json({
      status: "success",
      lead: {
        id: created.id,
        nome: leadPadronizado.nome,
        telefone: leadPadronizado.telefone,
        email: leadPadronizado.email,
        origem: leadPadronizado.origem,
        categoria: leadPadronizado.categoria,
        tags: leadPadronizado.tags,
        endereco: leadPadronizado.endereco,
        dados_extras: leadPadronizado.dados_extras,
        accountId: created.accountId,
        createdAt: created.createdAt,
        source_type: source_type || null,
      },
    });
  } catch (error) {
    console.error("Erro no webhook de formulario:", error);
    return res.status(500).json({
      status: "error",
      message: "Erro ao processar webhook de formulario",
    });
  }
});
