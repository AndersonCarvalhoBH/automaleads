// src/accountApi.ts

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
    // mantém mensagem padrão
  }

  throw new Error(message);
}

export interface MyAccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
  accountId: string;
}

export interface MyAccountAccount {
  id: string;
  name: string;
  plan: string;
  status: string;
}

export interface MyAccountData {
  user: MyAccountUser;
  account: MyAccountAccount | null;
  impersonatedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export async function apiGetMyAccount(
  token: string
): Promise<MyAccountData> {
  const resp = await fetch(`${API_URL}/accounts/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao carregar dados da conta.");
  }

  return resp.json();
}

export async function apiUpdateMyAccount(
  data: { name?: string; email?: string },
  token: string
): Promise<MyAccountData> {
  const resp = await fetch(`${API_URL}/accounts/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    await handleErrorResponse(resp, "Erro ao atualizar dados da conta.");
  }

  return resp.json();
}
