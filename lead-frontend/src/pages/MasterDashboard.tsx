// src/pages/MasterDashboard.tsx

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Text,
  Image,
  useToast,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  TagLabel,
  Spinner,
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
} from "@chakra-ui/react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppTopbar } from "../components/layout/AppTopbar";
import { PageHeader } from "../components/layout/PageHeader";
import { StatsGrid } from "../components/layout/StatsGrid";
import { StatCard } from "../components/layout/StatCard";
import {
  apiGetBrandingSettings,
  apiUpdateBrandingSettings,
  BrandingSettings,
} from "../masterSettingsApi";
import { apiGetMyAccount, MyAccountData } from "../accountApi";
import {
  apiMasterGetDashboard,
  apiMasterListAccounts,
  apiMasterImpersonateAccount,
  apiMasterUpdateAccount,
  MasterDashboardStats,
  MasterAccountSummary,
  MasterAccountUpdatePayload,
} from "../masterApi";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

type MasterSection =
  | "overview"
  | "accounts"
  | "plans"
  | "users"
  | "modules"
  | "logs"
  | "infra"
  | "support"
  | "reports"
  | "global-settings"
  | "my-account";

interface MasterDashboardProps {
  token: string;
  onLogout: () => void;
  onClose?: () => void; // opcional: se nao vier, usamos onLogout
}

const menuItems = [
  { key: "overview", label: "Visao Geral" },
  { key: "accounts", label: "Contas" },
  { key: "plans", label: "Planos & Billing" },
  { key: "users", label: "Usuarios" },
  { key: "modules", label: "Modulos" },
  { key: "logs", label: "Logs" },
  { key: "infra", label: "Infraestrutura" },
  { key: "reports", label: "Relatorios & BI" },
  { key: "global-settings", label: "Configuracoes globais" },
];

export const MasterDashboard: React.FC<MasterDashboardProps> = ({
  token,
  onClose,
  onLogout,
}) => {
  const toast = useToast();
  const [activeSection, setActiveSection] =
    useState<MasterSection>("overview");

  const [branding, setBranding] = useState<BrandingSettings>({
    logoDataUrl: null,
    primaryColor: "#0ea5a4",
    secondaryColor: "#f43f5e",
    faviconDataUrl: null,
  });
  const [loadingBranding, setLoadingBranding] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string>("/logo.svg");

  const [stats, setStats] = useState<MasterDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [accounts, setAccounts] = useState<MasterAccountSummary[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<MasterAccountSummary | null>(null);
  const [editForm, setEditForm] = useState<MasterAccountUpdatePayload>({});

  const {
    isOpen: isEditOpen,
    onOpen: openEdit,
    onClose: closeEdit,
  } = useDisclosure();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onLogout();
    }
  };

  // Carrega user + branding + dados master quando o painel abre
  useEffect(() => {
    loadMyAccount();
    loadBranding();
    loadStats();
    loadAccounts();

    try {
      const logo = localStorage.getItem("brandingLogoUrl");
      if (logo) setBrandingLogoUrl(logo);
    } catch {
      // ignore
    }
    try {
      const avatar = localStorage.getItem("userAvatarDataUrl");
      if (avatar) setAvatarDataUrl(avatar);
    } catch {
      // ignore
    }
  }, [token]);

  async function loadMyAccount() {
    try {
      const data: MyAccountData = await apiGetMyAccount(token);
      setCurrentUserName(data.user.name || "Master");
      setCurrentUserEmail(data.user.email || "");
    } catch (err: any) {
      console.error(err);
    }
  }

  async function loadBranding() {
    try {
      setLoadingBranding(true);
      const data = await apiGetBrandingSettings(token);
      setBranding(data);
      try {
        if (data.logoDataUrl) localStorage.setItem("brandingLogoUrl", data.logoDataUrl);
        if (data.primaryColor) localStorage.setItem("brandingPrimaryColor", data.primaryColor);
        if (data.secondaryColor) localStorage.setItem("brandingSecondaryColor", data.secondaryColor);
        if (data.faviconDataUrl) localStorage.setItem("brandingFaviconDataUrl", data.faviconDataUrl);
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao carregar Configuracoes globais",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoadingBranding(false);
    }
  }

  async function loadStats() {
    try {
      setLoadingStats(true);
      const data = await apiMasterGetDashboard(token);
      setStats(data);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao carregar visao geral",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      const data = await apiMasterListAccounts(token);
      setAccounts(data);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao listar contas",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoadingAccounts(false);
    }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string; // data:image/...
      setBranding({ logoDataUrl: base64 });
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingBranding(true);
      const saved = await apiUpdateBrandingSettings(branding, token);
      setBranding(saved);

      try {
        if (saved.logoDataUrl) {
          localStorage.setItem("brandingLogoUrl", saved.logoDataUrl);
          setBrandingLogoUrl(saved.logoDataUrl);
        }
        if (saved.primaryColor) {
          localStorage.setItem("brandingPrimaryColor", saved.primaryColor);
        }
        if (saved.secondaryColor) {
          localStorage.setItem("brandingSecondaryColor", saved.secondaryColor);
        }
        if (saved.faviconDataUrl) {
          localStorage.setItem("brandingFaviconDataUrl", saved.faviconDataUrl);
          const link: HTMLLinkElement =
            (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
            document.createElement("link");
          link.type = "image/png";
          link.rel = "icon";
          link.href = saved.faviconDataUrl;
          document.getElementsByTagName("head")[0].appendChild(link);
        }
      } catch {
        // ignore
      }

      toast({
        title: "Configuracoes salvas com sucesso.",
        description: "A logo global foi atualizada.",
        status: "success",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao salvar Configuracoes globais",
        description: err.message,
        status: "error",
      });
    } finally {
      setSavingBranding(false);
    }
  }

  async function handleImpersonate(accountId: string) {
    try {
      setImpersonatingId(accountId);
      const result = await apiMasterImpersonateAccount(accountId, token);

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("authRole", result.user.role);
      localStorage.setItem("authUser", JSON.stringify(result.user));

      toast({
        title: "Entrou como cliente",
        description: `Agora voce esta impersonando ${result.user.email}.`,
        status: "success",
        duration: 2500,
      });

      handleClose();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao impersonar conta",
        description: err.message,
        status: "error",
      });
    } finally {
      setImpersonatingId(null);
    }
  }

  function handleOpenEdit(acc: MasterAccountSummary) {
    setSelectedAccount(acc);
    setEditForm({
      name: acc.name,
      domain: acc.domain || "",
      plan: acc.plan,
      status: acc.status,
    });
    openEdit();
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      setSavingAccount(true);
      const updated = await apiMasterUpdateAccount(
        selectedAccount.id,
        editForm,
        token
      );

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === updated.id ? { ...acc, ...updated } : acc))
      );

      toast({
        title: "Conta atualizada",
        description: "Dados salvos com sucesso.",
        status: "success",
      });

      closeEdit();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao salvar conta",
        description: err.message,
        status: "error",
      });
    } finally {
      setSavingAccount(false);
    }
  }

  // --------- Sessoes ---------

  function renderOverview() {
    const metrics = stats;

    return (
      <Box>
        <PageHeader
          title="Visao geral da plataforma"
          description="Metricas globais em tempo real do SaaS."
        />

        {loadingStats && (
          <Flex align="center" gap={2} mb={3}>
            <Spinner size="sm" />
            <Text fontSize="xs">Carregando...</Text>
          </Flex>
        )}

        <StatsGrid>
          <StatCard
            label="Total de contas"
            value={metrics ? metrics.totalAccounts : "-"}
            helper="Contas criadas no sistema"
          />
          <StatCard
            label="Total de usuarios"
            value={metrics ? metrics.totalUsers : "-"}
            helper="Usuarios somando todas as contas"
          />
          <StatCard
            label="Leads no sistema"
            value={metrics ? metrics.totalLeads : "-"}
            helper="Total acumulado"
          />
        </StatsGrid>

        <StatsGrid>
          <StatCard
            label="MRR"
            value={metrics ? `R$ ${metrics.finance.mrr.toFixed(2)}` : "-"}
            helper="Receita mensal recorrente"
          />
          <StatCard
            label="ARR"
            value={metrics ? `R$ ${metrics.finance.arr.toFixed(2)}` : "-"}
            helper="Receita anual recorrente"
          />
          <StatCard
            label="Jobs (fila/running/falha)"
            value={
              metrics
                ? `${metrics.jobs.queued}/${metrics.jobs.running}/${metrics.jobs.failed}`
                : "-"
            }
            helper="Background jobs"
          />
        </StatsGrid>

        <Box
          mt={4}
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={4}
        >
          <Text fontWeight="semibold" mb={2}>
            Ultimos eventos de leads
          </Text>
          {!metrics || metrics.lastEvents.length === 0 ? (
            <Text fontSize="sm" color="gray.600">
              Nenhum evento registrado.
            </Text>
          ) : (
            <Stack spacing={2}>
              {metrics.lastEvents.map((evt) => (
                <Flex key={evt.id} justify="space-between" fontSize="sm">
                  <Text>{evt.type}</Text>
                  <Text color="gray.500">{formatDate(evt.createdAt)}</Text>
                </Flex>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  function renderAccounts() {
    return (
      <Box>
        <PageHeader
          title="Gestao de contas"
          description="Lista de todas as contas do SaaS com opcoes de editar e impersonar."
        />

        {loadingAccounts ? (
          <Flex align="center" gap={2} mb={3}>
            <Spinner size="sm" />
            <Text fontSize="xs">Carregando contas...</Text>
          </Flex>
        ) : null}

        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={3}
        >
          {accounts.length === 0 ? (
            <Text fontSize="sm" color="gray.600">
              Nenhuma conta cadastrada.
            </Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Plano</Th>
                  <Th>Status</Th>
                  <Th>Usuarios</Th>
                  <Th>Leads</Th>
                  <Th>Criada</Th>
                  <Th>Acoes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {accounts.map((acc) => (
                  <Tr key={acc.id}>
                    <Td>{acc.name}</Td>
                    <Td>{acc.plan}</Td>
                    <Td>
                      <Tag size="sm" colorScheme={acc.status === "active" ? "green" : "gray"}>
                        <TagLabel>{acc.status || "-"}</TagLabel>
                      </Tag>
                    </Td>
                    <Td>{acc.usersCount}</Td>
                    <Td>{acc.leadsCount}</Td>
                    <Td>{formatDate(acc.createdAt)}</Td>
                    <Td>
                      <Stack direction="row" spacing={2}>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenEdit(acc)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          onClick={() => handleImpersonate(acc.id)}
                          isLoading={impersonatingId === acc.id}
                        >
                          Impersonar
                        </Button>
                      </Stack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        <Modal isOpen={isEditOpen} onClose={closeEdit} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Editar conta</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <form id="edit-account-form" onSubmit={handleSaveAccount}>
                <Stack spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Nome</FormLabel>
                    <Input
                      size="sm"
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Dominio</FormLabel>
                    <Input
                      size="sm"
                      value={editForm.domain || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          domain: e.target.value,
                        }))
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Plano</FormLabel>
                    <Select
                      size="sm"
                      value={editForm.plan || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          plan: e.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione...</option>
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Status</FormLabel>
                    <Select
                      size="sm"
                      value={editForm.status || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione...</option>
                      <option value="active">Ativa</option>
                      <option value="suspended">Suspensa</option>
                      <option value="trial">Trial</option>
                      <option value="canceled">Cancelada</option>
                    </Select>
                  </FormControl>
                </Stack>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={closeEdit} size="sm">
                Cancelar
              </Button>
              <Button
                colorScheme="blue"
                size="sm"
                type="submit"
                form="edit-account-form"
                isLoading={savingAccount}
              >
                Salvar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

  function renderGlobalSettings() {
    return (
      <Box as="form" onSubmit={handleSaveBranding}>
        <PageHeader
          title="Configuracoes globais"
          description="Defina o branding padrao do seu SaaS. Esta logo sera usada por padrao no painel do cliente, painel Master e em telas publicas."
        />

        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          bg="white"
          boxShadow="md"
          p={4}
        >
          <SimpleGrid columns={[1, 2]} spacing={6}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Logo principal
              </Text>
              <Text fontSize="xs" color="gray.500" mb={3}>
                Envie uma imagem em PNG ou SVG. Ela sera armazenada como
                Data URL (Base64) e aplicada automaticamente em toda a
                plataforma.
              </Text>

              <Button
                as="label"
                size="sm"
                variant="outline"
                cursor="pointer"
              >
                Selecionar arquivo
                <Input
                  type="file"
                  accept="image/*"
                  display="none"
                  onChange={handleLogoFile}
                />
              </Button>

              <Text fontSize="xs" color="gray.500" mt={2}>
                Tamanho sugerido: formato horizontal, fundo transparente.
              </Text>

              <Text fontSize="xs" color="gray.400" mt={1}>
                {loadingBranding ? "Carregando..." : ""}
              </Text>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Pre-visualizacao
              </Text>
              <Box
                borderWidth="1px"
                borderColor="gray.100"
                borderRadius="md"
                p={4}
                bg="gray.50"
                minH="120px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {branding.logoDataUrl ? (
                  <Image
                    src={branding.logoDataUrl}
                    alt="Logo atual"
                    maxW="100%"
                    maxH="80px"
                    objectFit="contain"
                  />
                ) : (
                  <Text fontSize="xs" color="gray.500">
                    Nenhuma logo configurada ainda.
                  </Text>
                )}
              </Box>
            </Box>
          </SimpleGrid>

          <Flex justify="flex-end" mt={6} gap={3}>
            <Button variant="ghost" size="sm" onClick={loadBranding}>
              Recarregar
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={savingBranding}
            >
              Salvar logo global
            </Button>
          </Flex>
        </Box>
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
            Em breve, esta sessao sera conectada ao backend com dados reais
            desse modulo.
          </Text>
        </Box>
      </Box>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "global-settings":
        return renderGlobalSettings();
      case "accounts":
        return renderAccounts();
      case "plans":
        return renderPlaceholder(
          "Planos & Billing",
          "Configuracao de planos, limites e indicadores financeiros (MRR, ARR)."
        );
      case "users":
        return renderPlaceholder(
          "Gestao global de usuarios",
          "Lista global, filtros, transferencia entre contas e superadmins."
        );
      case "modules":
        return renderPlaceholder(
          "Modulos do sistema",
          "Scraping, integracoes, automacoes, webhooks."
        );
      case "logs":
        return renderPlaceholder(
          "Logs & auditoria",
          "Eventos do sistema, seguranca, scraping e automacoes."
        );
      case "infra":
        return renderPlaceholder(
          "Infraestrutura",
          "Monitoramento de Redis, workers, jobs, CPU e memoria."
        );
      case "reports":
        return renderPlaceholder(
          "Relatorios & BI",
          "Visao global de leads, uso de scraping e ranking de contas."
        );
      case "my-account":
        return renderPlaceholder(
          "Minha conta (master)",
          "Edite seus dados no painel principal do cliente."
        );
      default:
        return renderOverview();
    }
  }

  const sidebarBottomSlot = (
    <>
      <Button
        size="sm"
        variant="outline"
        colorScheme="red"
        onClick={handleClose}
      >
        Fechar painel Master
      </Button>
    </>
  );

  const currentTitle =
    menuItems.find((m) => m.key === activeSection)?.label ||
    (activeSection === "global-settings"
      ? "Configuracoes globais"
      : "Visao Geral");

  return (
    <Flex minH="100vh" bg="gray.50">
      <AppSidebar
        logoUrl={brandingLogoUrl}
        items={menuItems}
        activeKey={activeSection}
        onSelect={(key) => setActiveSection(key as MasterSection)}
        bottomSlot={sidebarBottomSlot}
      />

      <Box flex="1" display="flex" flexDirection="column">
        <AppTopbar
          title={currentTitle}
          userName={currentUserName || "Master"}
          userEmail={currentUserEmail}
          avatarUrl={avatarDataUrl}
          onAvatarClick={() => setActiveSection("my-account")}
          rightSlot={
            <Button
              size="xs"
              variant="outline"
              onClick={handleClose}
            >
              Voltar ao painel do cliente
            </Button>
          }
        />

        <Box flex="1" p={4} bg="gray.50">
          {renderSection()}
        </Box>
      </Box>
    </Flex>
  );
};
