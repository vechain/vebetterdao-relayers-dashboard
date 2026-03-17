"use client";

import { VStack } from "@chakra-ui/react";
import dynamic from "next/dynamic";

import { RelayersListSkeleton } from "@/components/Relayers";

const RelayersList = dynamic(
  () => import("@/components/Relayers").then((m) => m.RelayersList),
  { ssr: false, loading: () => <RelayersListSkeleton /> },
);

export default function RelayersPage() {
  return (
    <VStack w="full" gap={{ base: 8, md: 12 }} align="stretch">
      <RelayersList />
    </VStack>
  );
}
