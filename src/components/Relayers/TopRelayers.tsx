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

import { useRelayerReportDerived } from "@/hooks/useRelayerReportDerived";
import { isRelayerActive } from "@/lib/relayer-utils";

import { RelayerCard } from "./RelayerCard";

const TOP_COUNT = 3;

export function TopRelayers() {
  const { t } = useTranslation();
  const { report, overview, isLoading, error } = useRelayerReportDerived();

  const topSummaries = useMemo(() => {
    if (!overview?.summaries || !report) return [];
    const currentRound = report.currentRound;
    return overview.summaries
      .filter((s) => isRelayerActive(s, currentRound))
      .sort((a, b) => b.activeRoundsCount - a.activeRoundsCount)
      .slice(0, TOP_COUNT);
  }, [overview, report]);

  if (error) return null;

  if (isLoading || !report || !overview) {
    return (
      <VStack gap="3" align="stretch">
        <Skeleton height="16" rounded="xl" />
        <Skeleton height="16" rounded="xl" />
        <Skeleton height="16" rounded="xl" />
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
