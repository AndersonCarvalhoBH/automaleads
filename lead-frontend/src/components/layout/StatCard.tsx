// src/components/layout/StatCard.tsx
import React from "react";
import { Box, Text } from "@chakra-ui/react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helper?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  helper,
}) => {
  return (
    <Box
      flex="1"
      minW="180px"
      p={4}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.100"
      bg="white"
      boxShadow="md"
    >
      <Text fontSize="xs" textTransform="uppercase" color="gray.400">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
      {helper && (
        <Text fontSize="xs" color="gray.500">
          {helper}
        </Text>
      )}
    </Box>
  );
};
