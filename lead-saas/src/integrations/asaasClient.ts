import axios from "axios";

const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

const client = axios.create({
  baseURL: ASAAS_BASE_URL,
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    access_token: ASAAS_API_KEY,
  },
  timeout: 10000,
});

export interface AsaasCustomerPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

export interface AsaasSubscriptionPayload {
  customer: string; // asaas customer id
  billingType: "CREDIT_CARD" | "BOLETO" | "PIX";
  value: number;
  nextDueDate?: string; // YYYY-MM-DD
  cycle: "MONTHLY" | "YEARLY";
  description?: string;
  creditCardToken?: string;
}

export async function asaasCreateCustomer(payload: AsaasCustomerPayload) {
  const { data } = await client.post("/customers", payload);
  return data;
}

export async function asaasCreateSubscription(payload: AsaasSubscriptionPayload) {
  const { data } = await client.post("/subscriptions", payload);
  return data;
}

export async function asaasCancelSubscription(subscriptionId: string) {
  const { data } = await client.delete(`/subscriptions/${subscriptionId}`);
  return data;
}

export async function asaasGetSubscription(subscriptionId: string) {
  const { data } = await client.get(`/subscriptions/${subscriptionId}`);
  return data;
}
