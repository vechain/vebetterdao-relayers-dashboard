"use client"

import { Box, Heading, SimpleGrid, VStack } from "@chakra-ui/react"

import { AppsAsRelayersCard } from "@/components/AppsAsRelayers"
import { AiSkillBanner, FeelLostBanner } from "@/components/Banners"
import { BecomeRelayerCard } from "@/components/RelayerInfo"
import { RoundsChart, RoundsList } from "@/components/Rounds"
import { StatsCards } from "@/components/StatsCards"

export default function DashboardContent() {
  return (
    <VStack w="full" gap={{ base: 10, md: 14 }} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
        <BecomeRelayerCard />
        <AppsAsRelayersCard />
      </SimpleGrid>

      <VStack w="full" gap={4} align="stretch">
        <Heading size="lg">{"Overview"}</Heading>

        <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 2 }} gap="4">
          <StatsCards />
          <RoundsChart />
        </SimpleGrid>
      </VStack>

      <RoundsList />

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <FeelLostBanner />
        <Box gridColumn={{ md: "span 2" }}>
          <AiSkillBanner />
        </Box>
      </SimpleGrid>
    </VStack>
  )
}
