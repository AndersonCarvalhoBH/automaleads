// src/components/layout/AppTopbar.tsx
import React from "react";
import {
  Avatar,
  Box,
  Flex,
  Heading,
  HStack,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { CopyIcon } from "@chakra-ui/icons";

interface AppTopbarProps {
  title: string;
  subtitle?: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  accountId?: string;
  planStatus?: string;
  avatarUrl?: string | null;
  onAvatarClick?: () => void;
  rightSlot?: React.ReactNode; // caso o Master precise de algo a mais no topo
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  title,
  subtitle = "Navegue pelas secoes usando o menu lateral.",
  userName = "Usuario",
  userEmail,
  userId,
  accountId,
  planStatus,
  avatarUrl,
  onAvatarClick,
  rightSlot,
}) => {
  const statusColor =
    planStatus && planStatus.toLowerCase() === "active" ? "green.500" : "orange.500";

  return (
    <Box
      as="header"
      px={6}
      py={3}
      borderBottomWidth="1px"
      borderColor="gray.100"
      bg="white"
    >
      <Flex align="center" justify="space-between" position="relative">
        <Box>
          <Heading size="md">{title}</Heading>
          <Text fontSize="xs" color="gray.500">
            {subtitle}
          </Text>
        </Box>

        {/* Status centralizado */}
        {planStatus && (
          <HStack
            position="absolute"
            left="50%"
            transform="translateX(-50%)"
            spacing={3}
            align="center"
          >
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={statusColor}
              borderWidth="1px"
              borderColor="gray.200"
            />
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              Status: {planStatus}
            </Text>
          </HStack>
        )}

        <HStack spacing={4}>
          {rightSlot}

          <HStack
            spacing={3}
            cursor={onAvatarClick ? "pointer" : "default"}
            onClick={onAvatarClick}
          >
            <Box textAlign="right">
              <Text fontSize="sm" fontWeight="medium">
                {userName}
              </Text>
              <Text fontSize="xs" color="blue.500">
                Minha conta
              </Text>
              {userEmail && (
                <Text fontSize="xs" color="gray.500">
                  {userEmail}
                </Text>
              )}
              {userId && (
                <HStack justify="flex-end" spacing={1}>
                  <Text fontSize="xs" color="gray.400">
                    ID: {userId}
                  </Text>
                  <IconButton
                    aria-label="Copiar ID do usuario"
                    icon={<CopyIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(userId);
                      } catch (err) {
                        console.error("Clipboard error", err);
                      }
                    }}
                  />
                </HStack>
              )}
              {accountId && (
                <HStack justify="flex-end" spacing={1}>
                  <Text fontSize="xs" color="gray.500">
                    Conta: {accountId}
                  </Text>
                  <IconButton
                    aria-label="Copiar ID da conta"
                    icon={<CopyIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(accountId);
                      } catch (err) {
                        console.error("Clipboard error", err);
                      }
                    }}
                  />
                </HStack>
              )}
            </Box>
            <Avatar
              size="sm"
              src={avatarUrl || undefined}
              name={userName}
              bg="purple.500"
              color="white"
            />
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
};
