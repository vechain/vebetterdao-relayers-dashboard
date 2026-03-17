"use client";

import {
  Button,
  Heading,
  HStack,
  Skeleton,
  Stack,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LuArrowRight } from "react-icons/lu";

import { useRegisteredRelayers } from "@/hooks/useRegisteredRelayers";
import { useRelayerReportDerived } from "@/hooks/useRelayerReportDerived";
import { isRelayerActive } from "@/lib/relayer-utils";
import type { RelayerSummary } from "@/lib/relayer-utils";

import { RelayerCard } from "./RelayerCard";

const TOP_COUNT = 3;

export function TopRelayers() {
  const { t } = useTranslation();
  const { report, overview, isLoading, error } = useRelayerReportDerived();
  const { relayers: registeredRelayers, isLoading: isLoadingRegistered } =
    useRegisteredRelayers();

  const topSummaries = useMemo(() => {
    if (!overview?.summaries || !report || !registeredRelayers) return [];
    const currentRound = report.currentRound;
    const reportSummaries: RelayerSummary[] = [];
    const reportAddresses = new Set<string>();
    for (const s of overview.summaries) {
      reportSummaries.push(s);
      reportAddresses.add(s.address.toLowerCase());
    }
    for (const addr of registeredRelayers) {
      if (!reportAddresses.has(addr.toLowerCase())) {
        reportSummaries.push({
          address: addr.toLowerCase(),
          totalActions: 0,
          totalVotedFor: 0,
          totalRewardsClaimed: 0,
          totalWeightedActions: 0,
          totalB3trEarnedRaw: "0",
          totalVthoSpentRaw: "0",
          lastActiveRound: null,
          activeRoundsCount: 0,
        });
      }
    }
    const registeredSet = new Set(
      registeredRelayers.map((a) => a.toLowerCase()),
    );
    return reportSummaries
      .filter((s) => registeredSet.has(s.address.toLowerCase()))
      .filter((s) => isRelayerActive(s, currentRound))
      .sort(
        (a, b) =>
          Number(BigInt(b.totalB3trEarnedRaw) - BigInt(a.totalB3trEarnedRaw)),
      )
      .slice(0, TOP_COUNT);
  }, [overview, report, registeredRelayers]);

  if (error) return null;

  if (isLoading || isLoadingRegistered || !report || !overview) {
    return (
      <VStack w="full" gap="3" align="stretch">
        <Skeleton w="full" height="16" rounded="xl" />
        <Skeleton w="full" height="16" rounded="xl" />
        <Skeleton w="full" height="16" rounded="xl" />
      </VStack>
    );
  }

  if (topSummaries.length === 0) return null;

  return (
    <VStack gap="4" align="stretch">
      <HStack justify="space-between" align="center">
        <Heading size="lg">{t("Top Relayers")}</Heading>
        <NextLink href="/relayers">
          <Button variant="ghost" size="sm">
            {t("View all")}
            <LuArrowRight />
          </Button>
        </NextLink>
      </HStack>

      <Stack gap="3">
        {topSummaries.map((summary) => (
          <RelayerCard
            key={summary.address}
            summary={summary}
            currentRound={report.currentRound}
          />
        ))}
      </Stack>
    </VStack>
  );
}
