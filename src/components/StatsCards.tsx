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
import { LuChartLine, LuCircleCheck, LuCoins, LuRadar } from "react-icons/lu";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { useRegisteredRelayers } from "@/hooks/useRegisteredRelayers";
import { useReportData } from "@/hooks/useReportData";
import { formatNumber, formatToken } from "@/lib/format";
import { computeROI } from "@/lib/roi";
import { computeRoundCompletion, getRoundPhaseLabel } from "@/lib/round-utils";

interface StatItemProps {
  label: string;
  value: string;
  sublabel: string;
  icon: IconType;
  isLoading?: boolean;
}

function StatItem({ label, value, sublabel, icon, isLoading }: StatItemProps) {
  return (
    <Card.Root p={{ base: "4", md: "6" }} variant="action">
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
  const { data: report, isLoading, error } = useReportData();
  const { count: relayerCount, isLoading: relayersLoading } =
    useRegisteredRelayers();
  const b3trToVtho = useB3trToVthoRate();

  if (error) {
    return (
      <Text color="status.negative.primary" textStyle="sm">
        {"Failed to load report data."}
      </Text>
    );
  }

  const rounds = report?.rounds ?? [];

  const currentRoundData = rounds.find(
    (r) => r.roundId === report?.currentRound,
  );

  const rewardsRaw = currentRoundData
    ? currentRoundData.isRoundEnded
      ? currentRoundData.totalRelayerRewardsRaw
      : currentRoundData.estimatedRelayerRewardsRaw
    : "0";
  const expectedRoi = currentRoundData
    ? computeROI(rewardsRaw, currentRoundData.vthoSpentTotalRaw, b3trToVtho)
    : null;
  const roundCompletion =
    currentRoundData != null ? computeRoundCompletion(currentRoundData) : null;
  const roundPhase =
    currentRoundData != null ? getRoundPhaseLabel(currentRoundData) : "";

  return (
    <SimpleGrid w="full" columns={{ base: 2, md: 2, lg: 2 }} gap="4">
      <StatItem
        label="Current round"
        value={
          isLoading
            ? "..."
            : roundCompletion != null
              ? `${roundCompletion}%`
              : "\u2014"
        }
        sublabel={
          isLoading
            ? ""
            : currentRoundData
              ? `#${currentRoundData.roundId} · ${roundPhase}`
              : "no data"
        }
        icon={LuCircleCheck}
        isLoading={isLoading}
      />
      <StatItem
        label="Total relayers"
        value={relayersLoading ? "..." : String(relayerCount)}
        sublabel="registered"
        icon={LuRadar}
        isLoading={relayersLoading}
      />
      <StatItem
        label={
          currentRoundData && !currentRoundData.isRoundEnded
            ? "Projected rewards"
            : "Round rewards"
        }
        value={
          isLoading
            ? "..."
            : currentRoundData
              ? `${formatToken(
                  currentRoundData.isRoundEnded
                    ? currentRoundData.totalRelayerRewardsRaw
                    : currentRoundData.estimatedRelayerRewardsRaw,
                )} B3TR`
              : "\u2014"
        }
        sublabel={
          currentRoundData ? `for round #${currentRoundData.roundId}` : ""
        }
        icon={LuCoins}
        isLoading={isLoading}
      />
      <StatItem
        label={
          currentRoundData && !currentRoundData.isRoundEnded
            ? "Expected ROI"
            : "ROI"
        }
        value={
          isLoading
            ? "..."
            : expectedRoi != null
              ? `${formatNumber(Math.round(expectedRoi))}%`
              : "\u2014"
        }
        sublabel={
          currentRoundData ? `for round #${currentRoundData.roundId}` : ""
        }
        icon={LuChartLine}
        isLoading={isLoading}
      />
    </SimpleGrid>
  );
}
