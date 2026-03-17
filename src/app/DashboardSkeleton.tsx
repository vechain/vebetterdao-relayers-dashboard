"use client";

import {
  Box,
  HStack,
  Skeleton,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";

export function DashboardSkeleton() {
  return (
    <VStack w="full" gap={{ base: 10, md: 14 }} align="stretch">
      <Skeleton w="full" height={{ base: "28", md: "32" }} rounded="xl" />

      <VStack w="full" gap={4} align="stretch">
        <Skeleton height="8" width="140px" rounded="md" />
        <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 2 }} gap="4">
          <Skeleton w="full" height="32" rounded="xl" />
          <Skeleton w="full" height="80" rounded="xl" />
        </SimpleGrid>
      </VStack>

      <VStack w="full" gap="4" align="stretch">
        <HStack justify="space-between" align="center">
          <Skeleton height="8" width="140px" rounded="md" />
          <Skeleton height="8" width="70px" rounded="md" />
        </HStack>
        <VStack w="full" gap="3" align="stretch">
          <Skeleton w="full" height="16" rounded="xl" />
          <Skeleton w="full" height="16" rounded="xl" />
          <Skeleton w="full" height="16" rounded="xl" />
        </VStack>
      </VStack>

      <VStack w="full" gap="4" align="stretch">
        <HStack justify="space-between" align="center">
          <Skeleton height="8" width="120px" rounded="md" />
          <Skeleton height="8" width="70px" rounded="md" />
        </HStack>
        <VStack w="full" gap="3" align="stretch">
          <Skeleton w="full" height="16" rounded="xl" />
          <Skeleton w="full" height="16" rounded="xl" />
          <Skeleton w="full" height="16" rounded="xl" />
        </VStack>
      </VStack>

      <SimpleGrid w="full" columns={{ base: 1, md: 3 }} gap="4">
        <Skeleton w="full" height="24" rounded="xl" />
        <Box gridColumn={{ md: "span 2" }}>
          <Skeleton w="full" height="24" rounded="xl" />
        </Box>
      </SimpleGrid>
    </VStack>
  );
}
