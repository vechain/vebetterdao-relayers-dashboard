"use client"

import { VStack } from "@chakra-ui/react"

import { RelayersOverviewCards } from "@/components/Relayers"
import { RelayersList } from "@/components/Relayers"

export default function RelayersPage() {
  return (
    <VStack w="full" gap={{ base: 8, md: 12 }} align="stretch">
      <RelayersOverviewCards />
      <RelayersList />
    </VStack>
  )
}
