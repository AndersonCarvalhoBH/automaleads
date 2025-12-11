// src/routes/socialInstagramRoutes.ts

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const socialInstagramRoutes = Router();

/**
 * POST /social/instagram/import
 * Recebe perfis scrapados do Instagram e converte em leads
 */
socialInstagramRoutes.post("/import", async (req: Request, res: Response) => {
  try {
    const { account_id, source_type, context, profiles, options } = req.body;

    // 1) Validação básica
    if (!account_id) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'account_id' é obrigatório"
      });
    }

    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'profiles' precisa ser um array"
      });
    }

    const account = await prisma.account.findUnique({
      where: { id: Number(account_id) }
    });

    if (!account) {
      return res.status(400).json({
        status: "error",
        message: "Conta (account_id) não encontrada"
      });
    }

    const ctx = {
      mode: context?.mode || "unknown",
      source_value: context?.source_value || ""
    };

    const opts = {
      dedupe: options?.dedupe ?? true,
      dry_run: options?.dry_run ?? false
    };

    const importedLeads: any[] = [];
    const errors: any[] = [];
    let totalInvalid = 0;
    let totalDuplicates = 0;

    // 2) Processar cada profile
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];

      // Nome: full_name ou username
      const nome = p.full_name || p.username || "";

      // Telefone: prioriza whatsapp, depois phone
      const telefone = p.whatsapp || p.phone || "";

      // Email pode estar direto no profile
      const email = p.email || "";

      // Origem: instagram + modo
      const origem = `instagram_${ctx.mode}`;

      // Categoria padrão para Instagram
      const categoria = "social_instagram";

      // Tags padrão
      const tagsBase = ["instagram", ctx.mode];
      const tagsExtra =
        ctx.source_value && typeof ctx.source_value === "string"
          ? [ctx.source_value]
          : [];
      const tags = Array.from(new Set([...tagsBase, ...tagsExtra]));

      // Endereço: só cidade/estado se existir
      const endereco = {
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: p.city || "",
        estado: p.state || "",
        cep: ""
      };

      const dados_extras = {
        username: p.username || "",
        full_name: p.full_name || "",
        website: p.website || "",
        bio: p.bio || "",
        country: p.country || "",
        context_mode: ctx.mode,
        context_source: ctx.source_value,
        raw: p.raw || {}
      };

      // 3) Validação: se não tiver email NEM telefone, ignorar
      if (!email && !telefone) {
        totalInvalid++;
        errors.push({
          index: i,
          profile: {
            username: p.username,
            full_name: p.full_name
          },
          message: "Perfil sem email e sem telefone. Ignorado."
        });
        continue;
      }

      // 4) Deduplicação por email/telefone
      if (opts.dedupe && (email || telefone)) {
        const existing = await prisma.lead.findFirst({
          where: {
            accountId: account.id,
            OR: [
              email ? { email } : undefined,
              telefone ? { phone: telefone } : undefined
            ].filter(Boolean) as any
          }
        });

        if (existing) {
          totalDuplicates++;
          errors.push({
            index: i,
            profile: {
              username: p.username,
              full_name: p.full_name
            },
            message: "Lead duplicado (email/telefone já existente)"
          });
          continue;
        }
      }

      // 5) Se for dry_run, não salva
      if (opts.dry_run) {
        importedLeads.push({
          id: null,
          nome,
          telefone,
          email,
          origem,
          categoria,
          tags,
          endereco,
          dados_extras,
          accountId: account.id
        });
        continue;
      }

      // 6) Salvar no banco
      const created = await prisma.lead.create({
        data: {
          name: nome || null,
          email: email || null,
          phone: telefone || null,
          origin: origem || null,
          stage: "new",
          accountId: account.id,
          categoria: categoria,
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          endereco: JSON.stringify(endereco),
          dadosExtras: JSON.stringify(dados_extras)
        }
      });

      importedLeads.push({
        id: created.id,
        nome,
        telefone,
        email,
        origem,
        categoria,
        tags,
        endereco,
        dados_extras,
        accountId: created.accountId,
        createdAt: created.createdAt
      });
    }

    const totalReceived = profiles.length;
    const totalValid = totalReceived - totalInvalid;
    const totalImported = importedLeads.length;

    return res.json({
      status: "success",
      summary: {
        account_id: account.id,
        source_type: source_type || "instagram",
        context: ctx,
        total_received: totalReceived,
        total_valid: totalValid,
        total_imported: totalImported,
        total_duplicates: totalDuplicates,
        total_invalid: totalInvalid,
        dry_run: opts.dry_run
      },
      leads_imported: importedLeads,
      errors
    });
  } catch (error) {
    console.error("Erro na importação de Instagram:", error);
    return res.status(500).json({
      status: "error",
      message: "Falha ao processar importação de Instagram"
    });
  }
});
