import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import {
  AdminAccountSummary,
  apiAdminListAccounts,
  apiAdminUpdateAccountPlan,
} from "../api";

interface MasterAdminModalProps {
  token: string;
  onClose: () => void;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({
  token,
  onClose,
}) => {
  const [accounts, setAccounts] = useState<AdminAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiAdminListAccounts(token);
      setAccounts(data);
    } catch (err: any) {
      console.error("Erro ao carregar contas:", err);
      setError(err.message || "Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleChangePlan(accountId: string, newPlan: string) {
    try {
      setSavingId(accountId);
      const updated = await apiAdminUpdateAccountPlan(
        accountId,
        newPlan,
        token
      );

      setAccounts((current) =>
        current.map((acc) =>
          acc.id === accountId ? { ...acc, plan: updated.plan } : acc
        )
      );

      toast({
        title: "Plano atualizado",
        description: `Conta atualizada para plano: ${updated.plan}`,
        status: "success",
        duration: 3000,
      });
    } catch (err: any) {
      console.error("Erro ao atualizar plano:", err);
      toast({
        title: "Erro ao atualizar plano",
        description: err.message || "Tente novamente",
        status: "error",
        duration: 3000,
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.600"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
    >
      <Box
        bg="white"
        borderRadius="md"
        boxShadow="lg"
        maxW="900px"
        w="100%"
        maxH="80vh"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        <Box
          px={6}
          py={4}
          borderBottom="1px solid"
          borderColor="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Heading size="md">Admin de Contas (Master)</Heading>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </Box>

        <Box px={6} pt={3} pb={2}>
          <Text fontSize="sm" color="gray.600">
            Aqui você visualiza todas as contas do sistema, o plano de cada
            uma e o volume básico de uso. As alterações de plano são aplicadas
            imediatamente.
          </Text>
        </Box>

        <Box flex="1" px={6} pb={4} overflowY="auto">
          {loading ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              py={10}
            >
              <Spinner mr={3} />
              <Text>Carregando contas...</Text>
            </Box>
          ) : error ? (
            <Box py={4}>
              <Text color="red.500" mb={2}>
                {error}
              </Text>
              <Button size="sm" onClick={loadAccounts}>
                Tentar novamente
              </Button>
            </Box>
          ) : accounts.length === 0 ? (
            <Text>Não há contas cadastradas.</Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Plano</Th>
                  <Th>Usuários</Th>
                  <Th>Leads</Th>
                  <Th>Criada em</Th>
                </Tr>
              </Thead>
              <Tbody>
                {accounts.map((acc) => (
                  <Tr key={acc.id}>
                    <Td>{acc.name}</Td>
                    <Td>
                      <Select
                        value={acc.plan}
                        size="sm"
                        maxW="120px"
                        onChange={(e) =>
                          handleChangePlan(acc.id, e.target.value)
                        }
                        isDisabled={savingId === acc.id}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </Select>
                    </Td>
                    <Td>{acc.usersCount}</Td>
                    <Td>{acc.leadsCount}</Td>
                    <Td fontSize="xs">
                      {new Date(acc.createdAt).toLocaleString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </Box>
  );
};
