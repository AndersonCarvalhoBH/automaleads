// src/components/layout/StatsGrid.tsx
import React from "react";
import { Flex } from "@chakra-ui/react";

interface StatsGridProps {
  children: React.ReactNode;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ children }) => {
  return (
    <Flex gap={4} flexWrap="wrap" mb={6}>
      {children}
    </Flex>
  );
};
