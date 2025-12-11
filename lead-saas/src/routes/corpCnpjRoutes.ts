// src/routes/corpCnpjRoutes.ts

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const corpCnpjRoutes = Router();

/**
 * POST /corp/cnpj/import
 * Recebe empresas vindas de API de CNPJ e converte em leads
 */
corpCnpjRoutes.post("/import", async (req: Request, res: Response) => {
  try {
    const { account_id, source_type, context, companies, options } = req.body;

    // 1) Validação básica
    if (!account_id) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'account_id' é obrigatório"
      });
    }

    if (!Array.isArray(companies)) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'companies' precisa ser um array"
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
      api_name: context?.api_name || "",
      filter: context?.filter || ""
    };

    const opts = {
      dedupe: options?.dedupe ?? true,
      dry_run: options?.dry_run ?? false
    };

    const importedLeads: any[] = [];
    const errors: any[] = [];
    let totalInvalid = 0;
    let totalDuplicates = 0;

    // 2) Processar cada empresa
    for (let i = 0; i < companies.length; i++) {
      const c = companies[i];

      const cnpj = c.cnpj || "";

      const nome =
        c.nome_fantasia ||
        c.razao_social ||
        c.razaoSocial ||
        c.nomeFantasia ||
        "";

      const email = c.email || "";
      const telefone = c.telefone || c.telefone1 || c.telefone2 || "";

      const origem = "cnpj_api";
      const categoria = "api_cnpj";

      const uf =
        c.endereco?.estado ||
        c.uf ||
        c.estado ||
        (c.endereco?.uf || "");

      const cnaePrincipal =
        c.cnae_principal ||
        c.cnaePrincipal ||
        c.atividade_principal?.code ||
        "";

      // Tags: fonte, cnae e UF
      const tagsBase = ["cnpj_api"];
      const tagsExtra = [cnaePrincipal, uf].filter(
        (t) => !!t && typeof t === "string"
      );
      const tags = Array.from(new Set([...tagsBase, ...tagsExtra]));

      const endereco = {
        logradouro:
          c.endereco?.logradouro || c.logradouro || c.address?.street || "",
        numero: c.endereco?.numero || c.numero || c.address?.number || "",
        bairro:
          c.endereco?.bairro || c.bairro || c.address?.neighborhood || "",
        cidade: c.endereco?.cidade || c.cidade || c.address?.city || "",
        estado: uf || "",
        cep:
          c.endereco?.cep || c.cep || c.address?.postal_code || ""
      };

      const dados_extras = {
        cnpj,
        razao_social:
          c.razao_social || c.razaoSocial || "",
        nome_fantasia:
          c.nome_fantasia || c.nomeFantasia || "",
        cnae_principal: cnaePrincipal,
        atividade_principal:
          c.atividade_principal?.descricao ||
          c.atividade_principal?.text ||
          c.atividade_principal ||
          "",
        atividades_secundarias:
          c.atividades_secundarias || c.atividadesSecundarias || [],
        situacao_cadastral:
          c.situacao_cadastral || c.situacaoCadastral || "",
        data_abertura:
          c.data_abertura || c.dataAbertura || "",
        capital_social:
          c.capital_social || c.capitalSocial || null,
        socios: c.socios || [],
        context_api_name: ctx.api_name,
        context_filter: ctx.filter,
        raw: c.raw || {}
      };

      // 3) Validação: pelo menos CNPJ OU (email/telefone)
      if (!cnpj && !email && !telefone) {
        totalInvalid++;
        errors.push({
          index: i,
          company: {
            razao_social: c.razao_social,
            nome_fantasia: c.nome_fantasia
          },
          message: "Empresa sem CNPJ, email ou telefone. Ignorada."
        });
        continue;
      }

      // 4) Deduplicação (CNPJ > email > telefone)
      if (opts.dedupe && (cnpj || email || telefone)) {
        const whereOR: any[] = [];

        if (cnpj) whereOR.push({ cnpj });
        if (email) whereOR.push({ email });
        if (telefone) whereOR.push({ phone: telefone });

        const existing = await prisma.lead.findFirst({
          where: {
            accountId: account.id,
            OR: whereOR
          }
        });

        if (existing) {
          totalDuplicates++;
          errors.push({
            index: i,
            company: {
              cnpj,
              razao_social: c.razao_social,
              nome_fantasia: c.nome_fantasia
            },
            message: "Lead duplicado (CNPJ/email/telefone já existente)"
          });
          continue;
        }
      }

      // 5) Dry-run? Só simula
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
          cnpj,
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
          dadosExtras: JSON.stringify(dados_extras),
          cnpj: cnpj || null
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
        cnpj,
        accountId: created.accountId,
        createdAt: created.createdAt
      });
    }

    const totalReceived = companies.length;
    const totalValid = totalReceived - totalInvalid;
    const totalImported = importedLeads.length;

    return res.json({
      status: "success",
      summary: {
        account_id: account.id,
        source_type: source_type || "cnpj_api",
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
    console.error("Erro na importação via CNPJ:", error);
    return res.status(500).json({
      status: "error",
      message: "Falha ao processar importação via CNPJ"
    });
  }
});
