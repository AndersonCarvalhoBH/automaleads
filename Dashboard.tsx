// src/pages/Dashboard.tsx

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Tag,
  TagLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useDisclosure,
  useToast,
  Avatar,
  SimpleGrid,
  Tooltip,
  List,
  ListItem,
  ListIcon,
} from "@chakra-ui/react";

import { MasterAdminModal } from "../components/MasterAdminModal";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppTopbar } from "../components/layout/AppTopbar";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard } from "../components/layout/StatCard";
import { StatsGrid } from "../components/layout/StatsGrid";
const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

import {
  apiGetLeads,
  apiCreateManualLead,
  Lead,
  LeadCreatePayload,
  apiImportLeadsManual,
  LeadImportItem,
} from "../api";
import {
  apiGetMyAccount,
  apiUpdateMyAccount,
  MyAccountData,
} from "../accountApi";

// ---------- Tipos ----------

type DashboardSection =
  | "overview"
  | "leads"
  | "form-webhooks"
  | "scraping"
  | "automations"
  | "plans"
  | "users"
  | "finance"
  | "settings"
  | "profile";

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

interface MenuItem {
  key: Exclude<DashboardSection, "profile">;
  label: string;
}

interface BillingProfile {
  companyName: string;
  document: string; // CPF ou CNPJ
  phone: string;
  addressLine1: string;
  addressNumber: string;
  addressComplement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// ---------- Constantes ----------

const menuItems: MenuItem[] = [
  { key: "overview", label: "Dashboard" },
  { key: "leads", label: "Leads" },
  { key: "form-webhooks", label: "Importacao de lead por formulario" },
  { key: "scraping", label: "Scraping" },
  { key: "automations", label: "Automacoes" },
  { key: "plans", label: "Planos" },
  { key: "users", label: "Usuarios" },
  { key: "finance", label: "Financeiro" },
  { key: "settings", label: "Configuracoes" },
];
// ---------- Funções auxiliares ----------

function formatarData(dataIso?: string | null): string {
  if (!dataIso) return "-";
  const d = new Date(dataIso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function getEmpresaCategoria(lead: Lead): string {
  return (
    lead.empresa ||
    lead.categoria ||
    (lead as any).category ||
    lead.origem ||
    "-"
  );
}

function formatCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 11) {
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    return [part1, part2 ? `.${part2}` : "", part3 ? `.${part3}` : "", part4 ? `-${part4}` : ""].join("");
  }
  const c1 = digits.slice(0, 2);
  const c2 = digits.slice(2, 5);
  const c3 = digits.slice(5, 8);
  const c4 = digits.slice(8, 12);
  const c5 = digits.slice(12, 14);
  return [c1, c2 ? `.${c2}` : "", c3 ? `.${c3}` : "", c4 ? `/${c4}` : "", c5 ? `-${c5}` : ""].join("");
}

function formatPhoneBR(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55")) digits = digits.slice(2);
  const ddd = digits.slice(0, 2);
  const part1 = digits.slice(2, 7);
  const part2 = digits.slice(7, 11);
  if (digits.length <= 2) return ddd ? `(${ddd}` : "";
  if (digits.length <= 7) return `(${ddd}) ${part1}`;
  return `(${ddd}) ${part1}${part2 ? `-${part2}` : ""}`;
}

function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  if (!part1) return "";
  if (!part2) return part1;
  if (!part3) return `${part1}.${part2}`;
  return `${part1}.${part2}-${part3}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function calcCPFVerifier(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += parseInt(digits[i], 10) * (digits.length + 1 - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function isValidCPF(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const d1 = calcCPFVerifier(digits.slice(0, 9));
  const d2 = calcCPFVerifier(digits.slice(0, 10));
  return d1 === parseInt(digits[9], 10) && d2 === parseInt(digits[10], 10);
}

function isValidCNPJ(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i -= 1) {
      sum += parseInt(digits[len - i], 10) * pos;
      pos -= 1;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === parseInt(digits[12], 10) && d2 === parseInt(digits[13], 10);
}

function isValidPhoneBR(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55/, "");
  return digits.length >= 10; // DDD + n?mero
}

// ---------- Componente principal ----------

export const Dashboard: React.FC<DashboardProps> = ({
  token,
  onLogout,
}) => {
  const toast = useToast();

  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");
  const [showMasterModal, setShowMasterModal] = useState(false);

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // Usuário logado
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  // Logo dinâmica
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string>("/logo.svg");

  // Modal "Novo lead"
  const {
    isOpen: isLeadModalOpen,
    onOpen: onOpenLeadModal,
    onClose: onCloseLeadModal,
  } = useDisclosure();
  const {
    isOpen: isCsvTutorialOpen,
    onOpen: onOpenCsvTutorial,
    onClose: onCloseCsvTutorial,
  } = useDisclosure();
  const {
    isOpen: isFormTutorialOpen,
    onOpen: onOpenFormTutorial,
    onClose: onCloseFormTutorial,
  } = useDisclosure();

  const [newLead, setNewLead] = useState<LeadCreatePayload>({
    name: "",
    email: "",
    phone: "",
    source: "",
    categoria: "",
    origem: "",
  });

  // "Minha conta"
  const [profileData, setProfileData] = useState<MyAccountData | null>(
    null
  );
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const [billing, setBilling] = useState<BillingProfile>({
    companyName: "",
    document: "",
    phone: "",
    addressLine1: "",
    addressNumber: "",
    addressComplement: "",
    district: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Brasil",
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [lastFetchedCep, setLastFetchedCep] = useState("");
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [lastFetchedCnpj, setLastFetchedCnpj] = useState("");
  const [billingErrors, setBillingErrors] = useState<{
    document?: string;
    phone?: string;
    cep?: string;
  }>({});
  const [autoFillInfo, setAutoFillInfo] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [planStatus] = useState<string>("active");

  function setBillingError(field: "document" | "phone" | "cep", message?: string) {
    setBillingErrors((prev) => ({ ...prev, [field]: message }));
  }

  function getCachedValue<T>(key: string, id: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.[id] ?? null;
    } catch {
      return null;
    }
  }

  function setCachedValue<T>(key: string, id: string, value: T) {
    try {
      const raw = localStorage.getItem(key);
      const cache = raw ? JSON.parse(raw) : {};
      cache[id] = value;
      localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      // ignore cache errors
    }
  }

  // ---------- Efeitos ----------


  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // authUser (nome, e-mail)
    try {
      const raw = localStorage.getItem("authUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        setCurrentUserName(parsed.name || "");
        setCurrentUserEmail(parsed.email || "");
        if (parsed.id) setCurrentUserId(parsed.id);
        if (parsed.accountId) setCurrentAccountId(parsed.accountId);
        if (parsed.account?.plan) setCurrentPlan(parsed.account.plan);
      }
    } catch {}

    // logo global
    try {
      const logo = localStorage.getItem("brandingLogoUrl");
      if (logo) setBrandingLogoUrl(logo);
    } catch {}

    // avatar local
    try {
      const avatar = localStorage.getItem("userAvatarDataUrl");
      if (avatar) setAvatarDataUrl(avatar);
    } catch {}

    // billing local
    try {
      const billingRaw = localStorage.getItem("billingProfile");
      if (billingRaw) {
        const parsed = JSON.parse(billingRaw);
        setBilling((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Busca endereco via ViaCEP (chamada manual)
  async function fetchCepAddress(cepValue: string) {
    const digits = (cepValue || "").replace(/\D/g, "");
    if (digits.length !== 8) {
      setBillingError("cep", "Informe 8 digitos para o CEP.");
      return;
    }
    setBillingError("cep", undefined);
    if (digits === lastFetchedCep) return;

    const cached = getCachedValue<any>("cepCache", digits);
    if (cached) {
      setBilling((prev) => ({
        ...prev,
        zipCode: formatCep(digits),
        addressLine1: cached.logradouro || prev.addressLine1,
        district: cached.bairro || prev.district,
        city: cached.localidade || prev.city,
        state: cached.uf || prev.state,
        country: "Brasil",
      }));
      setAutoFillInfo("Endereco preenchido automaticamente (cache CEP).");
      setLastFetchedCep(digits);
      return;
    }

    try {
      setIsFetchingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        throw new Error("CEP não encontrado");
      }

      setBilling((prev) => ({
        ...prev,
        zipCode: formatCep(digits),
        addressLine1: data.logradouro || prev.addressLine1,
        district: data.bairro || prev.district,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
        country: "Brasil",
      }));
      setCachedValue("cepCache", digits, data);
      setAutoFillInfo("Endereco preenchido automaticamente pelo CEP.");
      setLastFetchedCep(digits);
    } catch (err: any) {
      toast({
        title: "CEP invalido ou não encontrado",
        description: err?.message || "Tente novamente.",
        status: "error",
        duration: 2500,
      });
    } finally {
      setIsFetchingCep(false);
    }
  }

  // Busca dados do CNPJ (tenta BrasilAPI e fallback ReceitaWS) e preenche billing

  async function fetchCnpjData(documentValue: string) {
    const digits = (documentValue || "").replace(/\D/g, "");
    if (digits.length === 0) return;
    if (digits.length !== 14) {
      setBillingError("document", "CNPJ deve ter 14 d?gitos.");
      return;
    }
    if (!isValidCNPJ(digits)) {
      setBillingError("document", "CNPJ inv?lido.");
      return;
    }
    setBillingError("document", undefined);
    if (digits === lastFetchedCnpj) return;

    const cached = getCachedValue<any>("cnpjCache", digits);
    if (cached) {
      setBilling((prev) => ({
        ...prev,
        document: formatCpfCnpj(digits),
        companyName: cached.razao_social || cached.nome_fantasia || prev.companyName,
        addressLine1: cached.logradouro || prev.addressLine1,
        addressNumber: cached.numero || prev.addressNumber,
        addressComplement: cached.complemento || prev.addressComplement,
        district: cached.bairro || prev.district,
        city: cached.municipio || prev.city,
        state: cached.uf || prev.state,
        zipCode: cached.cep ? formatCep(cached.cep) : prev.zipCode,
        phone: cached.telefone ? formatPhoneBR(cached.telefone) : prev.phone,
        country: "Brasil",
      }));
      setLastFetchedCnpj(digits);
      setAutoFillInfo("Dados da empresa preenchidos automaticamente (cache CNPJ).");
      return;
    }

    try {
      setIsFetchingCnpj(true);
      let data: any = null;

      // Primeiro tenta BrasilAPI (tende a permitir CORS)
      try {
        const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
        if (resBrasil.ok) {
          data = await resBrasil.json();
        } else {
          throw new Error("BrasilAPI falhou");
        }
      } catch {
        // Fallback ReceitaWS (pode bloquear CORS)
        const resReceita = await fetch(`https://www.receitaws.com.br/v1/cnpj/${digits}`);
        const dataReceita = await resReceita.json();
        if (!resReceita.ok || dataReceita?.status === "ERROR" || dataReceita?.erro) {
          throw new Error(dataReceita?.message || dataReceita?.erro || "CNPJ n?o encontrado");
        }
        data = {
          razao_social: dataReceita.nome,
          nome_fantasia: dataReceita.fantasia,
          logradouro: dataReceita.logradouro,
          numero: dataReceita.numero,
          complemento: dataReceita.complemento,
          bairro: dataReceita.bairro,
          municipio: dataReceita.municipio,
          uf: dataReceita.uf,
          cep: dataReceita.cep,
          telefone: dataReceita.telefone,
        };
      }

      setBilling((prev) => ({
        ...prev,
        document: formatCpfCnpj(digits),
        companyName: data.razao_social || data.nome_fantasia || prev.companyName,
        addressLine1: data.logradouro || prev.addressLine1,
        addressNumber: data.numero || prev.addressNumber,
        addressComplement: data.complemento || prev.addressComplement,
        district: data.bairro || prev.district,
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
        zipCode: data.cep ? formatCep(data.cep) : prev.zipCode,
        phone: data.telefone ? formatPhoneBR(data.telefone) : prev.phone,
        country: "Brasil",
      }));
      setCachedValue("cnpjCache", digits, data);
      setAutoFillInfo("Dados da empresa preenchidos automaticamente pelo CNPJ.");
      setLastFetchedCnpj(digits);
    } catch (err: any) {
      console.error("Erro ao buscar CNPJ:", err);
      toast({
        title: "Erro ao consultar CNPJ",
        description: err?.message || "Tente novamente.",
        status: "error",
        duration: 2500,
      });
    } finally {
      setIsFetchingCnpj(false);
    }
  }

  // ---------- Leads ----------

  async function loadLeads() {
    try {
      setLoadingLeads(true);
      setLeadsError(null);
      const data = await apiGetLeads(token);
      setLeads(data);
    } catch (error: any) {
      console.error("Erro ao carregar leads:", error);
      setLeadsError(error.message || "Erro ao carregar leads.");
      toast({
        title: "Erro ao carregar leads",
        description:
          "Não foi possível buscar os leads no backend. Verifique a API_URL e o token.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoadingLeads(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    onLogout();
  }

  function resetNewLead() {
    setNewLead({
      name: "",
      email: "",
      phone: "",
      source: "",
      categoria: "",
      origem: "",
    });
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();

    if (!newLead.name || !newLead.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos nome e e-mail.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await apiCreateManualLead(newLead, token);
      toast({
        title: "Lead criado",
        description: "O lead foi enviado para o backend com sucesso.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onCloseLeadModal();
      resetNewLead();
      await loadLeads();
    } catch (error: any) {
      console.error("Erro ao criar lead:", error);
      toast({
        title: "Erro ao criar lead",
        description:
          error.message || "Não foi possível criar o lead no backend.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }

  function parseCsv(text: string): LeadImportItem[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return [];
    const delimiter = lines[0].includes(";") && lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
    const records: LeadImportItem[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const row = lines[i].split(delimiter);
      if (row.length === 1 && row[0].trim() === "") continue;
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] ? row[idx].trim() : "";
      });
      const rawTags = obj.tags || "";
      const parsedTags =
        typeof rawTags === "string" && rawTags.length > 0
          ? rawTags.split(/[,;|]/).map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          : [];
      records.push({
        nome: obj.nome || obj.name,
        email: obj.email,
        telefone: obj.telefone || obj.phone,
        cnpj: obj.cnpj,
        origem: obj.origem || obj.source,
        categoria: obj.categoria,
        tags: parsedTags,
      });
    }
    return records;
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImportError(null);
    setCsvImportResult(null);
    try {
      const text = await file.text();
      const items = parseCsv(text);
      if (items.length === 0) {
        setCsvImportError("CSV vazio ou inv?lido.");
        return;
      }
      setCsvImporting(true);
      const resp = await apiImportLeadsManual(items, token);
      setCsvImportResult(
        `Importados: ${resp.data?.importedCount || 0} | Mesclados: ${resp.data?.mergedCount || 0}`
      );
      await loadLeads();
    } catch (err: any) {
      console.error("Erro ao importar CSV:", err);
      setCsvImportError(err?.message || "Erro ao importar CSV.");
    } finally {
      setCsvImporting(false);
    }
  }

  // ---------- Minha conta ----------

  async function loadProfile() {
    try {
      setLoadingProfile(true);
      const data = await apiGetMyAccount(token);
      setProfileData(data);
      if (data.account?.plan) setCurrentPlan(data.account.plan);

      setProfileName(data.user.name || "");
      setProfileEmail(data.user.email || "");
      if (data.user.id) setCurrentUserId(data.user.id);

      setCurrentUserName(data.user.name || "");
      setCurrentUserEmail(data.user.email || "");

      localStorage.setItem("authUser", JSON.stringify(data.user));
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao carregar Minha conta",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoadingProfile(false);
    }
  }

  function handleChangeBillingField<K extends keyof BillingProfile>(
    field: K,
    value: BillingProfile[K]
  ) {
    setBilling((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarDataUrl(base64);
      try {
        localStorage.setItem("userAvatarDataUrl", base64);
      } catch {
        //
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    // Valida??es b?sicas antes de salvar
    if (!profileName.trim() || !isValidEmail(profileEmail)) {
      toast({
        title: "Dados inv?lidos",
        description: "Informe um nome e um e-mail v?lido.",
        status: "warning",
      });
      return;
    }

    const errors: { document?: string; phone?: string; cep?: string } = {};
    const docDigits = billing.document.replace(/\D/g, "");
    if (docDigits) {
      if (docDigits.length === 11 && !isValidCPF(docDigits)) {
        errors.document = "CPF inv?lido.";
      } else if (docDigits.length === 14 && !isValidCNPJ(docDigits)) {
        errors.document = "CNPJ inv?lido.";
      } else if (docDigits.length !== 11 && docDigits.length !== 14) {
        errors.document = "Informe CPF (11) ou CNPJ (14 d?gitos).";
      }
    }

    const phoneDigits = billing.phone.replace(/\D/g, "");
    if (billing.phone && !isValidPhoneBR(phoneDigits)) {
      errors.phone = "Telefone deve ter DDD e n?mero (m?n. 10 d?gitos).";
    }

    const cepDigits = billing.zipCode.replace(/\D/g, "");
    if (billing.zipCode && cepDigits.length !== 8) {
      errors.cep = "CEP deve ter 8 d?gitos.";
    }

    setBillingErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast({
        title: "Corrija os campos antes de salvar",
        status: "warning",
      });
      return;
    }

    try {
      setSavingProfile(true);

      // Atualiza no backend
      const updated = await apiUpdateMyAccount(
        {
          name: profileName,
          email: profileEmail,
        },
        token
      );

      setProfileData(updated);
      if (updated.account?.plan) setCurrentPlan(updated.account.plan);
      setCurrentUserName(updated.user.name);
      setCurrentUserEmail(updated.user.email);
      if (updated.user.id) setCurrentUserId(updated.user.id);
      localStorage.setItem("authUser", JSON.stringify(updated.user));

      // Salva billing localmente (por enquanto)
      localStorage.setItem("billingProfile", JSON.stringify(billing));

      toast({
        title: "Dados salvos com sucesso!",
        description:
          "Suas informações de conta e faturamento foram atualizadas.",
        status: "success",
        duration: 2500,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao salvar Minha conta",
        description: err.message,
        status: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  function goToProfile() {
    setActiveSection("profile");
    loadProfile();
  }

  // ---------- Seções de conteúdo ----------

  function renderOverviewSection() {
    const totalLeads = leads.length;
    const novos7dias = Math.min(leads.length, 8);
    const taxaConversao = 27;

    return (
      <Box>
        <PageHeader
          title="Vis?o geral"
          description="Resumo rápido do que está acontecendo na sua operação de leads."
        />

        <StatsGrid>
          <StatCard
            label="Total de leads"
            value={totalLeads}
            helper="Leads registrados na sua conta"
          />
          <StatCard
            label="Leads novos (7 dias)"
            value={novos7dias}
            helper="Estimativa baseada nos dados recentes"
          />
          <StatCard
            label="Taxa de conversão (simulada)"
            value={`${taxaConversao}%`}
            helper="Exemplo para visualizar o funil"
          />
        </StatsGrid>

        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={4}
        >
          <Text fontSize="sm" fontWeight="semibold" mb={1}>
            Leads importados
          </Text>
          

          {loadingLeads ? (
            <Flex align="center" gap={2}>
              <Spinner size="sm" />
              <Text fontSize="xs">Carregando leads...</Text>
            </Flex>
          ) : leadsError ? (
            <Text fontSize="xs" color="red.500">
              {leadsError}
            </Text>
          ) : leads.length === 0 ? (
            <Text fontSize="xs" color="gray.500">
              Nenhum lead encontrado. Comece a integrar seus canais de
              entrada.
            </Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Empresa</Th>
                  <Th>E-mail</Th>
                  <Th>Data</Th>
                  <Th>Fonte</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leads.slice(0, 5).map((lead) => (
                  <Tr key={lead.id}>
                    <Td>{lead.name || "-"}</Td>
                    <Td>{getEmpresaCategoria(lead)}</Td>
                    <Td>{lead.email || "-"}</Td>
                    <Td>{formatarData(lead.createdAt)}</Td>
                    <Td>{lead.source || lead.origem || "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

      </Box>
    );
  }

  function renderLeadsSection() {
    return (
      <Box>
        <PageHeader
          title="Importação manual de leads"
          description="Listagem dos leads"
        />

        <Flex justify="space-between" align="center" mb={3} gap={3}>
          <Box />
          <Flex gap={2}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={onOpenCsvTutorial}
            >
              Tutorial CSV
            </Button>
            <Button
              as="label"
              size="sm"
              variant="outline"
              colorScheme="green"
              isLoading={csvImporting}
            >
              Importar CSV
              <Input
                type="file"
                accept=".csv,text/csv"
                display="none"
                onChange={handleCsvUpload}
              />
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              onClick={loadLeads}
            >
              Atualizar
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={onOpenLeadModal}
            >
              + Novo lead
            </Button>
          </Flex>
        </Flex>

        {csvImportResult && (
          <Text fontSize="sm" color="green.600" mb={2}>
            {csvImportResult}
          </Text>
        )}
        {csvImportError && (
          <Text fontSize="sm" color="red.600" mb={2}>
            {csvImportError}
          </Text>
        )}

        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={3}
        >
          {loadingLeads ? (
            <Flex align="center" gap={2}>
              <Spinner size="sm" />
              <Text fontSize="xs">Carregando leads...</Text>
            </Flex>
          ) : leadsError ? (
            <Text fontSize="xs" color="red.500">
              {leadsError}
            </Text>
          ) : leads.length === 0 ? (
            <Text fontSize="xs" color="gray.500">
              Nenhum lead retornado pela API ainda.
            </Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Empresa/Categoria</Th>
                  <Th>E-mail</Th>
                  <Th>Telefone</Th>
                  <Th>Data</Th>
                  <Th>Fonte</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leads.map((lead) => (
                  <Tr key={lead.id}>
                    <Td>{lead.name || "-"}</Td>
                    <Td>{getEmpresaCategoria(lead)}</Td>
                    <Td>{lead.email || "-"}</Td>
                    <Td>{lead.phone || "-"}</Td>
                    <Td>{formatarData(lead.createdAt)}</Td>
                    <Td>
                      <Tag size="sm" colorScheme="blue" variant="subtle">
                        <TagLabel>
                          {lead.source || lead.origem || "Não informado"}
                        </TagLabel>
                      </Tag>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        {/* Modal de novo lead */}
        <Modal isOpen={isLeadModalOpen} onClose={onCloseLeadModal} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Novo lead</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <form id="novo-lead-form" onSubmit={handleCreateLead}>
                <Stack spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Nome</FormLabel>
                    <Input
                      size="sm"
                      value={newLead.name}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm">E-mail</FormLabel>
                    <Input
                      type="email"
                      size="sm"
                      value={newLead.email}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Telefone</FormLabel>
                    <Input
                      size="sm"
                      value={newLead.phone || ""}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Fonte</FormLabel>
                    <Select
                      placeholder="Selecione..."
                      size="sm"
                      value={newLead.source || ""}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          source: e.target.value,
                          origem: e.target.value,
                        }))
                      }
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Google Maps">Google Maps</option>
                      <option value="Manual">Manual</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">
                      Categoria / Empresa
                    </FormLabel>
                    <Input
                      size="sm"
                      value={newLead.categoria || ""}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          categoria: e.target.value,
                        }))
                      }
                    />
                  </FormControl>
                </Stack>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="ghost"
                mr={3}
                size="sm"
                onClick={() => {
                  onCloseLeadModal();
                  resetNewLead();
                }}
              >
                Cancelar
              </Button>
              <Button
                colorScheme="blue"
                size="sm"
                type="submit"
                form="novo-lead-form"
              >
                Salvar lead
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Tutorial de CSV */}
        <Modal isOpen={isCsvTutorialOpen} onClose={onCloseCsvTutorial} isCentered size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Tutorial de importacao CSV</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text fontSize="sm" mb={3}>
                Estrutura recomendada (delimitador v?rgula ou ponto e v?rgula):
              </Text>
              <Box
                bg="gray.50"
                borderWidth="1px"
                borderColor="gray.100"
                borderRadius="md"
                p={3}
                fontFamily="monospace"
                fontSize="sm"
              >
                nome,email,telefone,cnpj,origem,categoria<br />
                Fulano,fulano@exemplo.com,(11) 99999-9999,12345678000199,planilha,cliente
              </Box>
              <List spacing={2} mt={4} fontSize="sm" color="gray.700">
                <ListItem>? Cabe?alho na primeira linha (campos aceitos: nome/name, email, telefone/phone, cnpj, origem/source, categoria, tags).</ListItem>
                <ListItem>? Delimitador autom?tico: v?rgula ou ponto e v?rgula.</ListItem>
                <ListItem>? Tags opcionais: separar por v?rgula dentro da coluna tags.</ListItem>
                <ListItem>? Valores de telefone e CNPJ podem ser enviados com ou sem m?scara.</ListItem>
              </List>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" onClick={onCloseCsvTutorial}>
                Fechar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

        function renderPlaceholder(title: string, description: string) {
    return (
      <Box>
        <PageHeader title={title} description={description} />
        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={4}
        >
          <Text fontSize="sm" color="gray.600">
            Aqui vamos conectar com o backend especifico desse modulo nas proximas etapas.
          </Text>
        </Box>
      </Box>
    );
  }

  function renderFormWebhooksSection() {
    const endpoint = `${API_URL}/webhooks/forms/generic`;
    const accountHint = currentAccountId || "<sua_account_id>";
    const samplePayload = `{
  "account_id": "${accountHint}",
  "source_type": "elementor",
  "lead": {
    "nome": "Fulano",
    "email": "fulano@exemplo.com",
    "telefone": "(11) 99999-9999",
    "origem": "form-elementor",
    "categoria": "cliente",
    "tags": ["webform", "landing"],
    "endereco": {
      "logradouro": "",
      "numero": "",
      "bairro": "",
      "cidade": "",
      "estado": "",
      "cep": ""
    },
    "dados_extras": {}
  }
}`;

    return (
      <Box>
        <PageHeader
          title="importacao de lead por formulario"
          description="Use este webhook para receber leads de Elementor, Jotform ou qualquer builder que envie HTTP POST."
        />

        <Flex justify="flex-end" mb={3}>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenFormTutorial}>
            Ver tutorial formulario / Webhook
          </Button>
        </Flex>

        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={4}
        >
          <Text fontWeight="semibold" mb={2}>
            Endpoint
          </Text>
          <Input value={endpoint} isReadOnly size="sm" mb={3} />
          <Text fontSize="sm" color="gray.600" mb={3}>
            Inclua no body JSON o campo obrigatorio <code>account_id</code> com o ID da sua conta e o objeto <code>lead</code> com os dados.
          </Text>

          <Text fontWeight="semibold" mb={2}>
            Exemplo de payload
          </Text>
          <Box
            as="pre"
            fontSize="xs"
            bg="gray.50"
            borderWidth="1px"
            borderColor="gray.100"
            borderRadius="md"
            p={3}
            whiteSpace="pre-wrap"
          >
            {samplePayload}
          </Box>

          <List spacing={2} mt={4} fontSize="sm" color="gray.700">
            <ListItem>- Configure o webhook no Elementor/Jotform apontando para o endpoint acima.</ListItem>
            <ListItem>- Campos aceitos: nome, email, telefone, origem, categoria, tags (array), endereco (objeto), dados_extras (objeto).</ListItem>
            <ListItem>- Duplicatas: o backend evita duplicar por email/telefone dentro da mesma conta.</ListItem>
          </List>
        </Box>

        <Modal isOpen={isFormTutorialOpen} onClose={onCloseFormTutorial} size="lg" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Tutorial detalhado (Elementor / Webhook)</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <List spacing={3} fontSize="sm" color="gray.700">
                <ListItem>1) Exponha o backend: gere uma URL publica (ex.: ngrok) e use {endpoint}.</ListItem>
                <ListItem>2) No Elementor crie campos com IDs: nome, email, telefone, categoria (opcional), tags (opcional).</ListItem>
                <ListItem>3) Adicione campos ocultos: account_id (ID da sua conta), source_type = elementor, origem = form-elementor.</ListItem>
                <ListItem>4) Em Actions After Submit, adicione Webhook e cole a URL {endpoint}.</ListItem>
                <ListItem>5) Publique a pagina, envie um teste e confira o lead na aba Leads.</ListItem>
                <ListItem>6) Se nao aparecer, verifique status HTTP na aba Network e confirme o account_id.</ListItem>
              </List>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" onClick={onCloseFormTutorial}>
                Fechar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

  function renderPlansSection() {
    return (
      <Box>
        <PageHeader
          title="Plano da conta"
          description="Plano definido pelo master/admin. Apenas visualização."
        />
        <Box
          borderWidth="1px"
          borderColor="gray.100"
          borderRadius="xl"
          bg="white"
          boxShadow="md"
          p={4}
        >
          <Text fontWeight="semibold" mb={2}>
            Plano atual
          </Text>
          <Text fontSize="lg" mb={1}>
            {currentPlan || "N/A"}
          </Text>
          <Text fontSize="sm" color={planStatus === "active" ? "green.600" : "red.500"}>
            Status: {planStatus}
          </Text>
        </Box>
      </Box>
    );
  }

  function renderProfileSection() {
    return (
      <Box as="form" onSubmit={handleSaveProfile}>
        <PageHeader
          title="Minha conta"
          description="Edite seus dados pessoais e informações de faturamento que serão usadas na cobrança."
        />

        {loadingProfile && !profileData && (
          <Flex align="center" gap={2} mb={4}>
            <Spinner size="sm" />
            <Text fontSize="xs">Carregando dados...</Text>
          </Flex>
        )}

        <Stack spacing={6} opacity={loadingProfile ? 0.6 : 1}>
          {/* Avatar + dados principais */}
          <Box
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.100"
            bg="white"
            boxShadow="md"
            p={4}
          >
            <Text fontWeight="semibold" mb={4}>
              Dados principais
            </Text>

            <Flex gap={6} align="center" mb={4} flexWrap="wrap">
              <Box textAlign="center">
                <Avatar
                  size="xl"
                  src={avatarDataUrl || undefined}
                  name={profileName || currentUserName || "Usuário"}
                  bg="purple.500"
                  color="white"
                  mb={2}
                />
                <Button
                  size="xs"
                  as="label"
                  htmlFor="avatar-upload"
                  variant="outline"
                >
                  Alterar avatar
                </Button>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  display="none"
                  onChange={handleAvatarChange}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Imagem sera salva localmente (Base64) neste dispositivo.
                </Text>
                {currentUserId && (
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    ID do usuario: {currentUserId}
                  </Text>
                )}
              </Box>

              <Stack flex="1" minW="240px">
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Nome</FormLabel>
                  <Input
                    size="sm"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm">E-mail</FormLabel>
                  <Input
                    type="email"
                    size="sm"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="seuemail@empresa.com"
                  />
                </FormControl>
              </Stack>
            </Flex>
          </Box>

          {/* Billing */}
          <Box
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.100"
            bg="white"
            boxShadow="md"
            p={4}
          >
            <Text fontWeight="semibold" mb={4}>
              Dados de faturamento (para pagamento)
            </Text>

            <SimpleGrid columns={[1, 2]} spacing={4} mb={4}>
              <FormControl>
                <FormLabel fontSize="sm">Nome da empresa</FormLabel>
                <Input
                  size="sm"
                  value={billing.companyName}
                  onChange={(e) =>
                    handleChangeBillingField("companyName", e.target.value)
                  }
                  placeholder="Razão social ou nome fantasia"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">CPF ou CNPJ</FormLabel>
                <Input
                  id="field-:r31:"
                  size="sm"
                  value={billing.document}
                  onChange={(e) =>
                    handleChangeBillingField(
                      "document",
                      formatCpfCnpj(e.target.value)
                    )
                  }
                  onBlur={(e) => fetchCnpjData(e.target.value)}
                  placeholder="Somente numeros"
                />
                {isFetchingCnpj && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Buscando dados da empresa...
                  </Text>
                )}
              </FormControl>

                            <FormControl>
                <FormLabel fontSize="sm">Telefone de contato</FormLabel>
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none" color="gray.500" fontSize="xs" w="70px">
                    BR +55
                  </InputLeftElement>
                  <Input
                    id="field-:r33:"
                    pl="70px"
                    value={billing.phone}
                    onChange={(e) =>
                      handleChangeBillingField("phone", formatPhoneBR(e.target.value))
                    }
                    placeholder="(11) 99999-9999"
                  />
                </InputGroup>
              </FormControl>

                                                        <FormControl>
                <FormLabel fontSize="sm">CEP</FormLabel>
                <Input
                  id="field-:r35:"
                  size="sm"
                  value={billing.zipCode}
                  onChange={(e) =>
                    handleChangeBillingField("zipCode", formatCep(e.target.value))
                  }
                  onBlur={(e) => fetchCepAddress(e.target.value)}
                  placeholder="XX.XXX-XXX"
                />
                {isFetchingCep && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Buscando endereco...
                  </Text>
                )}
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={[1, 3]} spacing={4} mb={4}>
              <FormControl>
                <FormLabel fontSize="sm">Endereço</FormLabel>
                <Input
                  size="sm"
                  value={billing.addressLine1}
                  onChange={(e) =>
                    handleChangeBillingField(
                      "addressLine1",
                      e.target.value
                    )
                  }
                  placeholder="Rua / Avenida"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Número</FormLabel>
                <Input
                  size="sm"
                  value={billing.addressNumber}
                  onChange={(e) =>
                    handleChangeBillingField(
                      "addressNumber",
                      e.target.value
                    )
                  }
                  placeholder="123"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Complemento</FormLabel>
                <Input
                  size="sm"
                  value={billing.addressComplement}
                  onChange={(e) =>
                    handleChangeBillingField(
                      "addressComplement",
                      e.target.value
                    )
                  }
                  placeholder="Apto / Sala / Bloco"
                />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={[1, 3]} spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Bairro</FormLabel>
                <Input
                  size="sm"
                  value={billing.district}
                  onChange={(e) =>
                    handleChangeBillingField("district", e.target.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Cidade</FormLabel>
                <Input
                  size="sm"
                  value={billing.city}
                  onChange={(e) =>
                    handleChangeBillingField("city", e.target.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Estado</FormLabel>
                <Input
                  size="sm"
                  value={billing.state}
                  onChange={(e) =>
                    handleChangeBillingField("state", e.target.value)
                  }
                  placeholder="SP, RJ..."
                />
              </FormControl>
            </SimpleGrid>

            <FormControl mt={4}>
              <FormLabel fontSize="sm">Pa?s</FormLabel>
              <Input
                size="sm"
                value={billing.country}
                onChange={(e) =>
                  handleChangeBillingField("country", e.target.value)
                }
              />
            </FormControl>
          </Box>

          <Flex justify="flex-end">
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={savingProfile}
              isDisabled={
                savingProfile ||
                isFetchingCep ||
                isFetchingCnpj ||
                Object.values(billingErrors).some(Boolean)
              }
            >
              Salvar altera??es
            </Button>
          </Flex>
        </Stack>
      </Box>
    );
  }

  // ---------- Sessoes de conteudo ----------

  function renderActiveSection() {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();
      case "leads":
        return renderLeadsSection();
      case "scraping":
        return renderPlaceholder(
          "Scraping",
          "Configure e visualize suas coletas de dados (simulacao por enquanto)."
        );
      case "form-webhooks":
        return renderFormWebhooksSection();
      case "automations":
        return renderPlaceholder(
          "Automacao",
          "Regras do tipo \"se lead entra por X, entao enviar Y\"."
        );
      case "settings":
        return renderPlaceholder(
          "Configuracoes",
          "Configuracoes gerais da conta, webhooks, etc."
        );
      case "plans":
        return renderPlansSection();
      case "users":
        return renderPlaceholder(
          "Usuarios",
          "Gestao de usuarios, convites e permissoes."
        );
      case "finance":
        return renderPlaceholder(
          "Financeiro",
          "Resumo de faturamento, MRR e faturas (mock)."
        );
      case "profile":
        return renderProfileSection();
      default:
        return renderOverviewSection();
    }
  }

  // ---------- Render principal ----------

  const sidebarBottomSlot = (
    <Stack spacing={2}>
      <Button
        size="sm"
        variant="ghost"
        colorScheme="red"
        onClick={handleLogout}
      >
        Sair
      </Button>
    </Stack>
  );

  const currentTitle =
    menuItems.find((m) => m.key === activeSection)?.label ||
    (activeSection === "profile" ? "Minha conta" : "Dashboard");

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* Sidebar reutilizável */}
      <AppSidebar
        logoUrl={brandingLogoUrl}
        items={menuItems}
        activeKey={activeSection === "profile" ? "overview" : activeSection}
        onSelect={(key) => setActiveSection(key as DashboardSection)}
        bottomSlot={sidebarBottomSlot}
      />

      {/* Conteúdo principal */}
      <Box flex="1" display="flex" flexDirection="column">
        <AppTopbar
          title={currentTitle}
          userName={currentUserName || "Usuario"}
          userEmail={currentUserEmail}
          userId={currentUserId}
          avatarUrl={avatarDataUrl}
          onAvatarClick={goToProfile}
        />

        <Box flex="1" p={4} bg="gray.50">
          {renderActiveSection()}
        </Box>
      </Box>
    </Flex>
  );
}


















