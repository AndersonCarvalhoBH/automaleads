// src/masterSettingsApi.ts

// URL base da API â€” mantÃ©m o mesmo padrÃ£o do restante do projeto
const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

export interface BrandingSettings {
  logoDataUrl: string | null; // data:image/... ou URL
  primaryColor?: string | null;
  secondaryColor?: string | null;
  faviconDataUrl?: string | null;
}

function getAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Busca as configuraÃ§Ãµes globais de branding
 * GET /master/settings/branding
 */
export async function apiGetBrandingSettings(
  token: string
): Promise<BrandingSettings> {
  const res = await fetch(`${API_URL}/master/settings/branding`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Erro ao carregar configuraÃ§Ãµes de branding");
  }

  // Esperamos algo como: { logoDataUrl: string | null }
  return res.json();
}

/**
 * Atualiza as configuraÃ§Ãµes globais de branding
 * POST /master/settings/branding
 * Body: { logoDataUrl: string | null }
 */
export async function apiUpdateBrandingSettings(
  payload: BrandingSettings,
  token: string
): Promise<BrandingSettings> {
  const res = await fetch(`${API_URL}/master/settings/branding`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Erro ao salvar configuraÃ§Ãµes de branding");
  }

  return res.json();
}
