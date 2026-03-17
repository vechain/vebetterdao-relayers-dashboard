"use client";

import {
  Box,
  HStack,
  Skeleton,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";

export function RelayersListSkeleton() {
  return (
    <VStack w="full" gap="4" align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap="3">
        <HStack gap="2" align="center">
          <Skeleton height="8" width="120px" rounded="md" />
          <Skeleton height="5" width="8" rounded="md" />
        </HStack>
        <Skeleton height="9" width="180px" rounded="full" />
      </HStack>

      <HStack gap="3" mt={4} flexWrap="wrap" justify="space-between">
        <Skeleton
          flex="1"
          minW="200px"
          maxW="400px"
          height="9"
          rounded="md"
        />
        <HStack gap="1" hideBelow="md">
          <Skeleton height="8" width="14" rounded="md" />
          <Skeleton height="8" width="14" rounded="md" />
          <Skeleton height="8" width="16" rounded="md" />
        </HStack>
      </HStack>

      <Box mt="4" hideBelow="md" px="5">
        <SimpleGrid columns={5} gap="4" w="full">
          <Skeleton height="4" width="60px" rounded="sm" />
          <Skeleton height="4" width="70px" rounded="sm" />
          <Skeleton height="4" width="70px" rounded="sm" />
          <Skeleton height="4" width="50px" rounded="sm" />
        </SimpleGrid>
      </Box>

      <VStack gap="3" align="stretch" mt={2}>
        <Skeleton w="full" height="16" rounded="xl" />
        <Skeleton w="full" height="16" rounded="xl" />
        <Skeleton w="full" height="16" rounded="xl" />
      </VStack>
    </VStack>
  );
}
