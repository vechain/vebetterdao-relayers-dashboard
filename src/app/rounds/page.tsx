"use client";

import { VStack } from "@chakra-ui/react";
import dynamic from "next/dynamic";

const RoundsList = dynamic(
  () => import("@/components/Rounds").then((m) => m.RoundsList),
  { ssr: false },
);

export default function RoundsPage() {
  return (
    <VStack w="full" gap={{ base: 8, md: 12 }} align="stretch">
      <RoundsList />
    </VStack>
  );
}
