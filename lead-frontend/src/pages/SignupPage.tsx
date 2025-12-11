// src/pages/SignupPage.tsx

import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  VStack,
  HStack,
  Text,
  Stack,
  useToast,
} from "@chakra-ui/react";
import {
  apiCreateAccount,
  apiCreateUser,
  apiLogin,
  LoginResponse,
} from "../api";

interface SignupPageProps {
  onSignupSuccess: (auth: LoginResponse) => void;
  onBackToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onSignupSuccess,
  onBackToLogin,
}) => {
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!companyName || !name || !email || !password) {
      setError("Preencha todos os campos obrigatorios.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      const account = await apiCreateAccount(
        companyName,
        companyDomain.trim() || null
      );

      const accountId = (account as any).id;
      if (!accountId) {
        throw new Error("API nao retornou o id da conta.");
      }

      await apiCreateUser({
        name,
        email,
        password,
        accountId,
        role: "admin",
      });

      const loginResp: LoginResponse = await apiLogin(email, password);
      if (!loginResp.token) {
        throw new Error("Login apos cadastro nao retornou token.");
      }

      localStorage.setItem("authToken", loginResp.token);
      localStorage.setItem("authRole", loginResp.user?.role || "");
      localStorage.setItem(
        "authUser",
        JSON.stringify(loginResp.user || {})
      );

      toast({
        title: "Conta criada com sucesso!",
        status: "success",
        duration: 2000,
      });

      onSignupSuccess(loginResp);
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      setError(err.message || "Erro ao criar conta");
      toast({
        title: "Erro ao criar conta",
        description: err.message || "Verifique os dados informados.",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" px={4}>
      <Box
        w="full"
        maxW="460px"
        bg="white"
        p={8}
        borderRadius="xl"
        boxShadow="xl"
        borderWidth="1px"
        borderColor="gray.100"
      >
        <HStack justify="space-between" mb={6}>
          <HStack spacing={3}>
            <Box
              w="36px"
              h="36px"
              borderRadius="md"
              bg="teal.500"
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="bold"
            >
              L
            </Box>
            <Stack spacing={0}>
              <Heading size="sm">LeadSaaS</Heading>
              <Text fontSize="xs" color="gray.500">
                Cadastro de conta
              </Text>
            </Stack>
          </HStack>
          <Text
            color="teal.600"
            cursor="pointer"
            onClick={onBackToLogin}
            fontSize="sm"
            fontWeight="semibold"
          >
            Já tenho conta
          </Text>
        </HStack>

        <Heading size="md" mb={2} textAlign="center">
          Criar conta
        </Heading>
        <Text fontSize="sm" color="gray.500" mb={6} textAlign="center">
          Configure a empresa e acesse o painel em poucos segundos.
        </Text>

        <form onSubmit={handleSubmit}>
          <VStack align="stretch" spacing={3}>
            <Input
              placeholder="Nome da empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input
              placeholder="Dominio (opcional)"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
            />
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="voce@empresa.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Senha de acesso"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button colorScheme="teal" type="submit" isLoading={loading}>
              Criar conta e acessar
            </Button>

            {error && <Box color="red.500">{error}</Box>}
          </VStack>
        </form>
      </Box>
    </Flex>
  );
};
