// src/utils/normalization.ts
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  // Remove tudo que não for dígito
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  // Se quiser, pode manter apenas últimos 11 dígitos (Brasil)
  if (digits.length > 11) {
    return digits.slice(-11);
  }

  return digits;
}

export function normalizeName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  return trimmed || null;
}

/**
 * Faz merge raso de dois JSON strings.
 * Se um deles estiver vazio, retorna o outro.
 */
export function mergeJsonStrings(
  currentJson?: string | null,
  incomingJson?: string | null
): string | null {
  if (!currentJson && !incomingJson) return null;
  if (!currentJson) return incomingJson ?? null;
  if (!incomingJson) return currentJson ?? null;

  try {
    const current = JSON.parse(currentJson);
    const incoming = JSON.parse(incomingJson);
    const merged = { ...current, ...incoming };
    return JSON.stringify(merged);
  } catch {
    // Se der erro, prioriza o que já existia para não quebrar
    return currentJson ?? null;
  }
}
