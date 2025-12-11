type WelcomeEmailPayload = {
  to: string;
  tempPassword: string;
  loginUrl: string;
};

/**
 * Stub simples de envio de email.
 * Em produção, integre com provider (SES, SendGrid, etc).
 */
export async function sendWelcomeEmail(payload: WelcomeEmailPayload) {
  // TODO: integrar com provedor real
  console.log("[MAILER] Enviar boas-vindas para", payload.to, {
    loginUrl: payload.loginUrl,
    tempPassword: payload.tempPassword,
  });
}
