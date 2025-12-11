// src/api.ts

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ---------------- TIPOS ----------------

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    accountId: string;
    account?: {
      id: string;
      name: string;
      plan: string;
    } | null;
  };
  token: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  accountId: string;
}

export interface AdminAccountSummary {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  usersCount: number;
  leadsCount: number;
}

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  cnpj?: string | null;
  source?: string | null;
  stage?: string | null;
  score?: number | null;
  data?: string | null; // JSON serializado com extras
  createdAt?: string;
  updatedAt?: string;
  // extras possíveis
  empresa?: string | null;
  category?: string | null;
  categoria?: string | null;
  origem?: string | null;
  [key: string]: any;
}

export interface LeadCreatePayload {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  categoria?: string;
  origem?: string;
}

// ---------------- BILLING / PLANOS ----------------

export interface PlanDto {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxLeadsPerMonth?: number | null;
  maxScrapingPerMonth?: number | null;
  allowAutomation: boolean;
  allowWebhooks: boolean;
  allowApiAccess: boolean;
  allowWhiteLabel: boolean;
  allowReports: boolean;
}

export interface SubscriptionDto {
  id: string;
  planId: string;
  accountId: string;
  status: string;
  billingCycle: string;
  price: number;
  asaasSubscriptionId?: string | null;
  asaasCustomerId?: string | null;
}

// ---------------- USUARIOS POR CONTA ----------------

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  accountId: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function apiListUsers(token: string): Promise<UserDto[]> {
  const resp = await fetch(`${API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao listar usuarios");
  }
  const data = await resp.json();
  return data?.data || data || [];
}

export async function apiCreateUserForAccount(params: {
  token: string;
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<UserDto> {
  const resp = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      password: params.password,
      role: params.role || "user",
    }),
  });
  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao criar usuario");
  }
  const json = await resp.json();
  return json?.data || json;
}

export async function apiUpdateUserForAccount(params: {
  token: string;
  id: string;
  name?: string;
  role?: string;
}): Promise<UserDto> {
  const resp = await fetch(`${API_URL}/users/${params.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      role: params.role,
    }),
  });
  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao atualizar usuario");
  }
  const json = await resp.json();
  return json?.data || json;
}

export async function apiDeleteUserForAccount(params: {
  token: string;
  id: string;
}): Promise<void> {
  const resp = await fetch(`${API_URL}/users/${params.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
  });
  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao excluir usuario");
  }
}

export async function apiListPlans(token: string): Promise<PlanDto[]> {
  const resp = await fetch(`${API_URL}/billing/plans`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao listar planos");
  }
  const data = await resp.json();
  return data?.data || data || [];
}

export async function apiCreateSubscription(params: {
  token: string;
  accountId: string;
  planId: string;
  billingType: "CREDIT_CARD" | "BOLETO" | "PIX";
  cycle?: "monthly" | "yearly";
  customer: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  };
}): Promise<{ data: SubscriptionDto }> {
  const resp = await fetch(`${API_URL}/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountId: params.accountId,
      planId: params.planId,
      billingType: params.billingType,
      cycle: params.cycle || "monthly",
      customer: params.customer,
    }),
  });
  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao criar assinatura");
  }
  return resp.json();
}

// ---------------- HELPER GENÉRICO DE ERRO ----------------

async function handleErrorResponse(resp: Response, defaultMessage: string) {
  let message = defaultMessage;

  try {
    const data = await resp.json();
    if (data) {
      if (typeof data === "string") {
        message = data;
      } else if (data.error) {
        if (typeof data.error === "string") {
          message = data.error;
        } else if (data.error.message) {
          message = data.error.message;
        } else {
          message = JSON.stringify(data.error);
        }
      } else {
        message = JSON.stringify(data);
      }
    }
  } catch {
    try {
      const text = await resp.text();
      if (text) message = text;
    } catch {
      // ignora
    }
  }

  throw new Error(message);
}

// ---------------- AUTENTICAÇÃO ----------------

export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const resp = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao fazer login");
  }

  return resp.json();
}

export async function apiCreateAccount(
  name: string,
  domain: string | null,
  plan: string = "free"
) {
  const resp = await fetch(`${API_URL}/accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      domain,
      plan,
    }),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao criar conta");
  }

  return resp.json();
}

export async function apiCreateUser(payload: CreateUserPayload) {
  const resp = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao criar usuário");
  }

  return resp.json();
}

// ---------------- ADMIN (MASTER) ----------------

export async function apiAdminListAccounts(
  token: string
): Promise<AdminAccountSummary[]> {
  const resp = await fetch(`${API_URL}/admin/accounts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao listar contas");
  }

  const data = await resp.json();

  // backend: { success, data: { accounts: [...] } }
  if (data && data.data && Array.isArray(data.data.accounts)) {
    return data.data.accounts;
  }

  return Array.isArray(data) ? data : [];
}

export async function apiAdminUpdateAccountPlan(
  accountId: string,
  plan: string,
  token: string
): Promise<AdminAccountSummary> {
  const resp = await fetch(
    `${API_URL}/admin/accounts/${accountId}/plan`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    }
  );

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao atualizar plano da conta");
  }

  return resp.json();
}

// ---------------- LEADS (BACKEND INTEGRADO) ----------------

function normalizarLeads(lista: any[]): Lead[] {
  return lista.map((item: any) => {
    let extras: any = {};

    // Tenta ler JSON do campo data, se existir
    if (item.data && typeof item.data === "string") {
      try {
        extras = JSON.parse(item.data);
      } catch {
        // se der erro, ignora
      }
    }

    return {
      ...item,
      ...extras,
    };
  });
}

/**
 * Busca os leads do backend (GET /leads) usando o token JWT.
 *
 * Backend responde:
 * {
 *   success: true,
 *   data: { total, page, perPage, leads: [...] }
 * }
 */
export async function apiGetLeads(token: string): Promise<Lead[]> {
  const resp = await fetch(`${API_URL}/leads`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao buscar leads");
  }

  const json = await resp.json();

  let listaBruta: any[] = [];

  if (json && json.data && Array.isArray(json.data.leads)) {
    listaBruta = json.data.leads;
  } else if (Array.isArray(json)) {
    listaBruta = json;
  } else if (json && Array.isArray(json.leads)) {
    listaBruta = json.leads;
  }

  return normalizarLeads(listaBruta);
}

/**
 * Cria um lead via importação manual.
 *
 * Vamos enviar também um campo "data" com JSON serializado
 * contendo empresa/categoria para facilitar a leitura no front.
 */
export async function apiCreateManualLead(
  payload: LeadCreatePayload,
  token: string
): Promise<any> {
  const extras = {
    empresa: payload.categoria || null,
    categoria: payload.categoria || null,
  };

  const leadBackend = {
    nome: payload.name,
    email: payload.email,
    telefone: payload.phone || null,
    origem: payload.source || payload.origem || "manual",
    categoria: payload.categoria || null,
    tags: [],
    endereco: null,
    dadosExtras: null,
    data: JSON.stringify(extras),
  };

  const body = {
    leads: [leadBackend],
  };

  const resp = await fetch(`${API_URL}/leads/import/manual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao criar lead");
  }

  return resp.json();
}

// Importação em lote (CSV parseado) para /leads/import/manual
export interface LeadImportItem {
  nome?: string;
  name?: string;
  email?: string;
  telefone?: string;
  phone?: string;
  cnpj?: string;
  origem?: string;
  source?: string;
  categoria?: string;
  tags?: string[];
}

export async function apiImportLeadsManual(
  items: LeadImportItem[],
  token: string
): Promise<any> {
  const leads = items.map((item) => ({
    nome: item.nome || item.name || "",
    email: item.email || "",
    telefone: item.telefone || item.phone || "",
    cnpj: item.cnpj || "",
    origem: item.origem || item.source || "csv",
    categoria: item.categoria || "",
    tags: item.tags || [],
  }));

  const resp = await fetch(`${API_URL}/leads/import/manual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ leads }),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao importar leads");
  }

  return resp.json();
}
