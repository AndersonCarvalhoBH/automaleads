// src/services/leadService.ts

import { PrismaClient, Lead } from '@prisma/client';
import {
  normalizeEmail,
  normalizePhone,
  normalizeName,
  mergeJsonStrings,
} from '../utils/normalization';

// ATENÇÃO:
// Se você já tiver um arquivo "prisma.ts" com um PrismaClient criado,
// você pode IMPORTAR dele em vez de criar um novo aqui.
// Exemplo: import prisma from '../prisma';
const prisma = new PrismaClient();

/**
 * Este tipo representa os dados necessários para criar/atualizar um Lead.
 * Todas as rotas que criarem lead vão enviar algo nesse formato.
 */
export type CreateLeadInput = {
  accountId: string;      // sempre obrigatório (multi-tenant)

  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  source: string;         // obrigatório (de onde veio o lead: "manual", "maps", "cnpj", etc.)
  stage?: string | null;  // opcional (ex: "new")
  score?: number;         // opcional (default 0)
  data?: any;             // objeto JS com extras (vamos salvar como JSON string)
};

/**
 * Resultado da operação de createOrMerge.
 * wasMerged = true  → lead já existia, foi atualizado.
 * wasMerged = false → lead novo foi criado.
 */
export type CreateOrMergeResult = {
  lead: Lead;
  wasMerged: boolean;
  eventType: 'created' | 'merged';
};

/**
 * LeadService
 * ----------
 * Centraliza a lógica de:
 *  - normalizar dados
 *  - encontrar lead existente (dedupe)
 *  - criar ou fazer merge
 *  - registrar LeadEvent
 */
export class LeadService {
  /**
   * Cria ou faz merge de um lead com base nas regras:
   *
   * 1) email
   * 2) phone
   * 3) cnpj
   * 4) name + phone (últimos 30 dias)
   */
  static async createOrMerge(input: CreateLeadInput): Promise<CreateOrMergeResult> {
    const accountId = input.accountId;

    // 1) Normaliza todos os campos importantes
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedName = normalizeName(input.name);
    const normalizedCnpj = input.cnpj ? input.cnpj.replace(/\D/g, '') : null;

    // Se vier um objeto JS em "data", transformamos em string JSON
    const dataJson = input.data ? JSON.stringify(input.data) : null;

    // 2) Tenta encontrar um lead existente
    const existingLead = await this.findExistingLead({
      accountId,
      email: normalizedEmail,
      phone: normalizedPhone,
      cnpj: normalizedCnpj,
      name: normalizedName,
    });

    // 3) Se NÃO existir → cria um lead novo
    if (!existingLead) {
      const newLead = await prisma.lead.create({
        data: {
          accountId,
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          cnpj: normalizedCnpj,
          source: input.source,
          stage: input.stage ?? 'new',
          score: input.score ?? 0,
          data: dataJson,
        },
      });

      // Cria LeadEvent de "created"
      await this.createLeadEvent(newLead.id, 'created', {
        source: input.source,
        dedupeStrategy: 'none',
      });

      return {
        lead: newLead,
        wasMerged: false,
        eventType: 'created',
      };
    }

    // 4) Se já existir → faz MERGE de dados
    const mergedLead = await this.mergeLead(existingLead, {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      cnpj: normalizedCnpj,
      source: input.source,
      stage: input.stage,
      score: input.score,
      dataJson,
    });

    // Cria LeadEvent de "merged"
    await this.createLeadEvent(mergedLead.id, 'merged', {
      source: input.source,
      mergedFrom: {
        id: existingLead.id,
      },
    });

    return {
      lead: mergedLead,
      wasMerged: true,
      eventType: 'merged',
    };
  }

  /**
   * Aplica a regra de deduplicação:
   * - primeiro tenta por email
   * - depois por phone
   * - depois por cnpj
   * - por fim, name + phone nos últimos 30 dias
   */
  private static async findExistingLead(params: {
    accountId: string;
    email: string | null;
    phone: string | null;
    cnpj: string | null;
    name: string | null;
  }): Promise<Lead | null> {
    const { accountId, email, phone, cnpj, name } = params;

    // Data limite para a regra de "name + phone" (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1) email
    if (email) {
      const byEmail = await prisma.lead.findFirst({
        where: { accountId, email },
      });
      if (byEmail) return byEmail;
    }

    // 2) phone
    if (phone) {
      const byPhone = await prisma.lead.findFirst({
        where: { accountId, phone },
      });
      if (byPhone) return byPhone;
    }

    // 3) cnpj
    if (cnpj) {
      const byCnpj = await prisma.lead.findFirst({
        where: { accountId, cnpj },
      });
      if (byCnpj) return byCnpj;
    }

    // 4) name + phone (dentro dos últimos 30 dias)
    if (name && phone) {
      const byNameAndPhone = await prisma.lead.findFirst({
        where: {
          accountId,
          name,
          phone,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });
      if (byNameAndPhone) return byNameAndPhone;
    }

    // Se nada foi encontrado → lead é novo
    return null;
  }

  /**
   * Faz o merge do lead existente com os dados novos.
   *
   * Regra simples:
   * - Se o campo antigo estiver vazio -> usa o novo
   * - Se o campo antigo já tiver valor -> mantém o antigo
   * - "data" (JSON string) é mesclado chave a chave
   */
  private static async mergeLead(
    existing: Lead,
    incoming: {
      name: string | null;
      email: string | null;
      phone: string | null;
      cnpj: string | null;
      source: string;
      stage?: string | null;
      score?: number;
      dataJson?: string | null;
    }
  ): Promise<Lead> {
    const updatedData = {
      name: existing.name || incoming.name,
      email: existing.email || incoming.email,
      phone: existing.phone || incoming.phone,
      cnpj: existing.cnpj || incoming.cnpj,
      source: existing.source || incoming.source,
      stage: existing.stage || incoming.stage || 'new',
      score: existing.score || incoming.score || 0,
      data: mergeJsonStrings(existing.data, incoming.dataJson ?? null),
    };

    const updatedLead = await prisma.lead.update({
      where: { id: existing.id },
      data: updatedData,
    });

    return updatedLead;
  }

  /**
   * Cria um registro de LeadEvent.
   * type: "created", "merged", "updated", etc.
   * payload: qualquer objeto (é salvo como JSON string)
   */
  private static async createLeadEvent(
    leadId: string,
    type: string,
    payload?: any
  ) {
    await prisma.leadEvent.create({
      data: {
        leadId,
        type,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });
  }
}
