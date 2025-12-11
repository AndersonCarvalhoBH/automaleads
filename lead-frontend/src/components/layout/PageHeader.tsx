// src/components/layout/PageHeader.tsx
import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";

interface PageHeaderProps {
  title: string;
  description?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
}) => {
  return (
    <Box mb={4}>
      <Heading size="md" mb={description ? 1 : 0}>
        {title}
      </Heading>
      {description && (
        <Text fontSize="sm" color="gray.500">
          {description}
        </Text>
      )}
    </Box>
  );
};
