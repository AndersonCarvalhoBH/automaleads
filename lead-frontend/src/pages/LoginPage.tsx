// src/pages/LoginPage.tsx

import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { apiLogin, LoginResponse } from "../api";

interface LoginPageProps {
  onLoginSuccess: (auth: LoginResponse) => void;
  onOpenSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onOpenSignup,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    try {
      setLoading(true);
      const auth = await apiLogin(email, password);

      if (!auth.token) {
        throw new Error("API nao retornou token de autenticacao.");
      }

      const userRole = auth.user?.role || "";
      const userJson = JSON.stringify(auth.user || {});

      if (remember) {
        localStorage.setItem("authToken", auth.token);
        localStorage.setItem("authRole", userRole);
        localStorage.setItem("authUser", userJson);
      } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authRole");
        localStorage.removeItem("authUser");
      }

      toast({
        title: "Login bem-sucedido",
        status: "success",
        duration: 2000,
      });

      onLoginSuccess(auth);
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError(err.message || "Erro ao fazer login.");
      toast({
        title: "Erro ao fazer login",
        description: err.message || "Verifique suas credenciais.",
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
        maxW="420px"
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
                Painel do cliente
              </Text>
            </Stack>
          </HStack>
          <Text
            color="teal.600"
            cursor="pointer"
            onClick={onOpenSignup}
            fontSize="sm"
            fontWeight="semibold"
          >
            Criar conta
          </Text>
        </HStack>

        <Heading size="md" mb={2} textAlign="center">
          Login
        </Heading>
        <Text fontSize="sm" color="gray.500" mb={6} textAlign="center">
          Acesse seu painel para gerenciar leads, scraping e automacoes.
        </Text>

        <form onSubmit={handleSubmit}>
          <VStack align="stretch" spacing={3}>
            <Input
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <HStack justify="space-between">
              <Checkbox
                isChecked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              >
                Lembrar de mim
              </Checkbox>
              <Text fontSize="sm" color="gray.500">
                Ambiente seguro
              </Text>
            </HStack>

            <Button colorScheme="teal" type="submit" isLoading={loading}>
              Entrar
            </Button>

            {error && <Box color="red.500">{error}</Box>}

            <Text fontSize="sm" color="gray.500" textAlign="center">
              Seu acesso eh vinculado a sua conta de cliente.
            </Text>
          </VStack>
        </form>
      </Box>
    </Flex>
  );
};
