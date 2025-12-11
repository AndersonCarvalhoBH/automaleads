// src/components/layout/AppSidebar.tsx
import React from "react";
import {
  Box,
  Button,
  Divider,
  Image,
  Stack,
  VStack,
} from "@chakra-ui/react";

export interface SidebarItem {
  key: string;
  label: string;
}

interface AppSidebarProps {
  logoUrl?: string;
  items: SidebarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  width?: string | number;
  bottomSlot?: React.ReactNode; // ex.: botão Master + Sair
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  logoUrl = "/logo.svg",
  items,
  activeKey,
  onSelect,
  width = "260px",
  bottomSlot,
}) => {
  return (
    <Box
      w={width}
      bg="white"
      borderRightWidth="1px"
      borderColor="gray.100"
      boxShadow="md"
      display={{ base: "none", md: "flex" }}
      flexDirection="column"
    >
      {/* Logo full width, padding 20px */}
      <Box
        p={5} // 20px
        borderBottomWidth="1px"
        borderColor="gray.100"
      >
        <Image
          src={logoUrl || "/logo.svg"}
          alt="Logo"
          w="100%"
          maxH="64px"
          objectFit="contain"
          borderRadius="md"
        />
      </Box>

      <Box flex="1" p={3}>
        <Stack spacing={1}>
          {items.map((item) => (
            <Button
              key={item.key}
              size="sm"
              justifyContent="flex-start"
              variant={activeKey === item.key ? "solid" : "ghost"}
              colorScheme={activeKey === item.key ? "blue" : undefined}
              onClick={() => onSelect(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        {bottomSlot && (
          <VStack align="stretch" spacing={3} mt={4}>
            <Divider />
            {bottomSlot}
          </VStack>
        )}
      </Box>
    </Box>
  );
};
