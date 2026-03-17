"use client";

import {
  Box,
  Card,
  HStack,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { LuChartLine, LuCoins, LuFlame, LuRadar } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { useRelayerReportDerived } from "@/hooks/useRelayerReportDerived";
import { formatNumber, formatToken } from "@/lib/format";
import { computeAverageROI } from "@/lib/roi";

interface StatItemProps {
  label: string;
  value: string;
  sublabel: string;
  icon: IconType;
  isLoading?: boolean;
}

function StatItem({ label, value, sublabel, icon, isLoading }: StatItemProps) {
  return (
    <Card.Root p={{ base: "4", md: "6" }} variant="outline">
      <VStack flex={1} alignItems="start" gap="1">
        <HStack w="full" justifyContent="space-between" alignItems="center">
          <Text
            textStyle={{ base: "xs", md: "sm" }}
            color="text.subtle"
            lineClamp={1}
          >
            {label}
          </Text>
          <Box
            as="span"
            color="text.subtle"
            fontSize={{ base: "16px", md: "20px" }}
            lineHeight="1"
          >
            {icon({})}
          </Box>
        </HStack>
        <Skeleton loading={!!isLoading}>
          <Text textStyle={{ base: "lg", md: "2xl" }} fontWeight="semibold">
            {value}
          </Text>
        </Skeleton>
        <Text textStyle="xs" color="text.subtle">
          {sublabel}
        </Text>
      </VStack>
    </Card.Root>
  );
}

export function StatsCards() {
  const { report, overview, isLoading, error } = useRelayerReportDerived();
  const b3trToVtho = useB3trToVthoRate();

  const { t } = useTranslation();
  if (error) {
    return (
      <Text color="status.negative.primary" textStyle="sm">
        {t("Failed to load report data.")}
      </Text>
    );
  }

  const rounds = report?.rounds ?? [];
  const concludedRounds = rounds.filter(
    (r) => r.isRoundEnded && r.totalRelayerRewardsRaw !== "0",
  );
  const avgRoi = computeAverageROI(concludedRounds, b3trToVtho);

  return (
    <SimpleGrid w="full" columns={{ base: 2, md: 2, lg: 2 }} gap="4">
      <StatItem
        label={t("Active relayers")}
        value={
          isLoading
            ? "..."
            : overview != null
              ? String(overview.activeRelayers)
              : "\u2014"
        }
        sublabel={t("in last 3 rounds")}
        icon={LuRadar}
        isLoading={isLoading}
      />
      <StatItem
        label={t("Total VTHO Spent")}
        value={
          isLoading
            ? "..."
            : overview != null
              ? `${formatToken(overview.totalVthoSpentRaw)} VTHO`
              : "\u2014"
        }
        sublabel={t("for gas costs")}
        icon={LuFlame}
        isLoading={isLoading}
      />
      <StatItem
        label={t("Total B3TR distributed")}
        value={
          isLoading
            ? "..."
            : overview
              ? `${formatToken(overview.totalB3trDistributedRaw)} B3TR`
              : "\u2014"
        }
        sublabel={t("to relayers")}
        icon={LuCoins}
        isLoading={isLoading}
      />
      <StatItem
        label={t("Average ROI")}
        value={
          isLoading
            ? "..."
            : avgRoi != null
              ? `${formatNumber(Math.round(avgRoi))}%`
              : "\u2014"
        }
        sublabel={"for relayers"}
        icon={LuChartLine}
        isLoading={isLoading}
      />
    </SimpleGrid>
  );
}
