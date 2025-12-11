// lead-saas/src/server.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { accountRoutes } from "./routes/accountRoutes";
import { userRoutes } from "./routes/userRoutes";
import { authRoutes } from "./routes/authRoutes";
import { meRoutes } from "./routes/meRoutes";
import { leadRoutes } from "./routes/leadRoutes";
import { formWebhookRoutes } from "./routes/formWebhookRoutes";
import { socialInstagramRoutes } from "./routes/socialInstagramRoutes";
import { mapsGoogleRoutes } from "./routes/mapsGoogleRoutes";
import { corpCnpjRoutes } from "./routes/corpCnpjRoutes";
import { brandingRoutes } from "./routes/brandingRoutes";
import { adminAccountRoutes } from "./routes/adminAccountRoutes";
import { adminMasterRoutes } from "./routes/adminMasterRoutes";
import masterSettingsRoutes from "./routes/masterSettingsRoutes";
import { billingRoutes } from "./routes/billingRoutes";
import paymentWebhookRoutes from "./routes/paymentWebhookRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
  })
);

// Webhook precisa do raw body antes do express.json
app.use("/payments/webhook", paymentWebhookRoutes);

// Demais rotas usam JSON normal
app.use(express.json());

// ---------- ROTAS PÚBLICAS ----------
app.use("/auth", authRoutes);

// ---------- ROTAS PRINCIPAIS DO SAAS (AUTENTICADAS) ----------
app.use("/accounts", accountRoutes);
app.use("/users", userRoutes);
app.use("/me", meRoutes);
app.use("/leads", leadRoutes);
app.use("/webhooks/forms", formWebhookRoutes);
app.use("/social/instagram", socialInstagramRoutes);
app.use("/maps/google", mapsGoogleRoutes);
app.use("/corp/cnpj", corpCnpjRoutes);
app.use("/branding", brandingRoutes);
app.use("/billing", billingRoutes);

// ---------- ROTAS ADMIN / MASTER ----------
app.use("/admin", adminAccountRoutes);      // rotas já usadas pelo MasterAdminModal
app.use("/admin/master", adminMasterRoutes); // novo painel MASTER (superadmin)
app.use("/master/settings", masterSettingsRoutes);

// Rota raiz
app.get("/", (_req, res) => {
  res.json({ message: "Lead SaaS API rodando 🚀" });
});

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
