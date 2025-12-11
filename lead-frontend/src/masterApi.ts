// src/masterApi.ts

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function handleErrorResponse(resp: Response, defaultMessage: string) {
  let message = defaultMessage;

  try {
    const data = await resp.json();
    if (data) {
      if (typeof data === "string") {
        message = data;
      } else if ((data as any).error) {
        const err = (data as any).error;
        if (typeof err === "string") {
          message = err;
        } else if (err.message) {
          message = err.message;
        } else {
          message = JSON.stringify(err);
        }
      } else {
        message = JSON.stringify(data);
      }
    }
  } catch {
    // fica mensagem padrão
  }

  throw new Error(message);
}

// ------------------------ TIPOS MASTER ------------------------

export interface MasterDashboardStats {
  totalAccounts: number;
  totalUsers: number;
  totalLeads: number;
  accountsActive: number;
  accountsInactive: number;
  jobs: {
    queued: number;
    running: number;
    failed: number;
  };
  finance: {
    mrr: number;
    arr: number;
  };
  lastEvents: {
    id: string;
    type: string;
    leadId: string;
    leadEmail?: string | null;
    leadName?: string | null;
    createdAt: string;
  }[];
}

export interface MasterAccountSummary {
  id: string;
  name: string;
  domain?: string | null;
  status?: string;
  plan: string;
  createdAt: string;
  usersCount: number;
  leadsCount: number;
  invoicesCount?: number;
  totalBilled?: number;
}

export interface MasterAccountDetails {
  account: {
    id: string;
    name: string;
    plan: string;
    status?: string;
    domain?: string | null;
    createdAt?: string;
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  leads: any[];
  invoices: {
    id: string;
    amount: number;
    status: string;
    dueDate: string;
    paidAt?: string | null;
  }[];
}

export interface MasterGlobalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  account?: {
    id: string;
    name: string;
    plan: string;
    status?: string;
  } | null;
}

export interface MasterModuleUsage {
  id: string;
  module: string;
  period: string;
  used: number;
  limit?: number | null;
  createdAt: string;
  account?: {
    id: string;
    name: string;
    plan: string;
  } | null;
}

export interface MasterSystemLog {
  id: string;
  level: string;
  message: string;
  context?: string | null;
  module?: string | null;
  accountId?: string | null;
  userId?: string | null;
  createdAt: string;
}

export interface MasterInfraStatus {
  app: {
    status: string;
    uptimeSeconds: number;
    version: string;
  };
  resources: {
    cpu: {
      usagePercent: number;
    };
    memory: {
      usedMB: number;
      totalMB: number;
    };
  };
}

export interface MasterSupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  account?: {
    id: string;
    name: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface MasterReports {
  rankingAccountsByLeads: {
    accountId: string;
    accountName: string;
    leads: number;
  }[];
}

export interface MasterImpersonateResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    accountId: string;
  };
}

export interface MasterAccountUpdatePayload {
  name?: string;
  domain?: string | null;
  plan?: string;
  status?: string;
}

// ------------------------ HELPERS HTTP ------------------------

async function masterGet(path: string, token: string) {
  const resp = await fetch(`${API_URL}/admin/master${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao carregar dados do painel master");
  }

  return resp.json();
}

async function masterPost(path: string, token: string, body?: any) {
  const resp = await fetch(`${API_URL}/admin/master${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro na operação do painel master");
  }

  return resp.json();
}

// ------------------------ FUNÇÕES PÚBLICAS ------------------------

export async function apiMasterGetDashboard(
  token: string
): Promise<MasterDashboardStats> {
  return masterGet("/dashboard", token);
}

export async function apiMasterListAccounts(
  token: string
): Promise<MasterAccountSummary[]> {
  return masterGet("/accounts", token);
}

export async function apiMasterGetAccountDetails(
  accountId: string,
  token: string
): Promise<MasterAccountDetails> {
  return masterGet(`/accounts/${accountId}`, token);
}

export async function apiMasterImpersonateAccount(
  accountId: string,
  token: string
): Promise<MasterImpersonateResponse> {
  return masterPost(`/accounts/${accountId}/impersonate`, token);
}

export async function apiMasterUpdateAccount(
  accountId: string,
  payload: MasterAccountUpdatePayload,
  token: string
): Promise<MasterAccountSummary> {
  const resp = await fetch(`${API_URL}/admin/master/accounts/${accountId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao atualizar conta (master)");
  }

  return resp.json();
}

export async function apiMasterListUsers(
  token: string,
  opts?: { q?: string; role?: string }
): Promise<MasterGlobalUser[]> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.role) params.set("role", opts.role);

  const qs = params.toString();
  const path = qs ? `/users?${qs}` : "/users";

  return masterGet(path, token);
}

export async function apiMasterListModules(
  token: string
): Promise<MasterModuleUsage[]> {
  return masterGet("/modules", token);
}

export async function apiMasterListLogs(
  token: string,
  opts?: { level?: string; module?: string }
): Promise<MasterSystemLog[]> {
  const params = new URLSearchParams();
  if (opts?.level) params.set("level", opts.level);
  if (opts?.module) params.set("module", opts.module);

  const qs = params.toString();
  const path = qs ? `/logs?${qs}` : "/logs";

  return masterGet(path, token);
}

export async function apiMasterGetInfraStatus(
  token: string
): Promise<MasterInfraStatus> {
  return masterGet("/infra", token);
}

export async function apiMasterListTickets(
  token: string
): Promise<MasterSupportTicket[]> {
  return masterGet("/tickets", token);
}

export async function apiMasterGetReports(
  token: string
): Promise<MasterReports> {
  return masterGet("/reports", token);
}
