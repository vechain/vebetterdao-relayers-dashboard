"use client";

import { Box, Heading, SimpleGrid, VStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

import { AiSkillBanner, FeelLostBanner } from "@/components/Banners";
import { BecomeRelayerCard } from "@/components/RelayerInfo";
import { TopRelayers } from "@/components/Relayers";
import { RecentRounds, RoundsChart } from "@/components/Rounds";
import { StatsCards } from "@/components/StatsCards";

export default function DashboardContent() {
  const { t } = useTranslation();
  return (
    <VStack w="full" gap={{ base: 10, md: 14 }} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 1 }} gap="4">
        <BecomeRelayerCard forceBanner={true} />
      </SimpleGrid>

      <VStack w="full" gap={4} align="stretch">
        <Heading size="lg">{t("Overview")}</Heading>

        <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 2 }} gap="4">
          <StatsCards />
          <RoundsChart />
        </SimpleGrid>
      </VStack>

      <TopRelayers />

      <RecentRounds />

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <FeelLostBanner />
        <Box gridColumn={{ md: "span 2" }}>
          <AiSkillBanner />
        </Box>
      </SimpleGrid>
    </VStack>
  );
}
