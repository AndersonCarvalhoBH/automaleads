// src/routes/mapsGoogleRoutes.ts

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const mapsGoogleRoutes = Router();

/**
 * POST /maps/google/import
 * Recebe lugares do Google Maps via scrap externo e converte em leads
 */
mapsGoogleRoutes.post("/import", async (req: Request, res: Response) => {
  try {
    const { account_id, source_type, context, places, options } = req.body;

    // 1) Validação básica
    if (!account_id) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'account_id' é obrigatório"
      });
    }

    if (!Array.isArray(places)) {
      return res.status(400).json({
        status: "error",
        message: "Campo 'places' precisa ser um array"
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
      query: context?.query || "",
      location: context?.location || "",
      radius_meters: context?.radius_meters || null,
      category: context?.category || ""
    };

    const opts = {
      dedupe: options?.dedupe ?? true,
      dry_run: options?.dry_run ?? false
    };

    const importedLeads: any[] = [];
    const errors: any[] = [];
    let totalInvalid = 0;
    let totalDuplicates = 0;

    // 2) Processar cada place
    for (let i = 0; i < places.length; i++) {
      const p = places[i];

      const nome = p.name || "";

      // Telefone: prioriza international_phone, depois phone, depois formatted_phone
      const telefone =
        p.international_phone || p.phone || p.formatted_phone || "";

      const email = p.email || "";

      const origem = "google_maps";
      const categoria = "maps_google";

      // Tags: google_maps + categoria/contexto
      const tagsBase = ["google_maps"];
      const tagsExtra = [
        ctx.query || "",
        ctx.location || "",
        ctx.category || "",
        p.category || ""
      ].filter((t) => !!t && typeof t === "string");
      const tags = Array.from(new Set([...tagsBase, ...tagsExtra]));

      const endereco = {
        logradouro: p.address?.street || "",
        numero: p.address?.number || "",
        bairro: p.address?.neighborhood || "",
        cidade: p.address?.city || "",
        estado: p.address?.state || "",
        cep: p.address?.postal_code || ""
      };

      const dados_extras = {
        place_id: p.place_id || "",
        website: p.website || "",
        full_address: p.address?.full || "",
        rating: p.rating || null,
        user_ratings_total: p.user_ratings_total || null,
        maps_url: p.maps_url || "",
        context_query: ctx.query,
        context_location: ctx.location,
        context_category: ctx.category,
        raw: p.raw || {}
      };

      // 3) Validação: precisa ter email ou telefone
      if (!email && !telefone) {
        totalInvalid++;
        errors.push({
          index: i,
          place: {
            place_id: p.place_id,
            name: p.name
          },
          message: "Place sem email e sem telefone. Ignorado."
        });
        continue;
      }

      // 4) Deduplicação simples
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
            place: {
              place_id: p.place_id,
              name: p.name
            },
            message: "Lead duplicado (email/telefone já existente)"
          });
          continue;
        }
      }

      // 5) Dry-run? Não grava, só simula
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

    const totalReceived = places.length;
    const totalValid = totalReceived - totalInvalid;
    const totalImported = importedLeads.length;

    return res.json({
      status: "success",
      summary: {
        account_id: account.id,
        source_type: source_type || "google_maps",
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
    console.error("Erro na importação do Google Maps:", error);
    return res.status(500).json({
      status: "error",
      message: "Falha ao processar importação do Google Maps"
    });
  }
});
