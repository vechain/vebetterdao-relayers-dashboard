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

import { useReportData } from "@/hooks/useReportData";
import {
  buildRoundRewardsContext,
  computeRelayerSummary,
  isRelayerActive,
} from "@/lib/relayer-utils";

import { RelayerCard } from "./RelayerCard";

const TOP_COUNT = 3;

export function TopRelayers() {
  const { t } = useTranslation();
  const { data: report, isLoading, error } = useReportData();

  const topSummaries = useMemo(() => {
    if (!report?.relayers) return [];
    const roundCtx = buildRoundRewardsContext(report);
    return report.relayers
      .map((r) => computeRelayerSummary(r, roundCtx, report.currentRound))
      .filter((s) => isRelayerActive(s, report.currentRound))
      .sort((a, b) => {
        const va = BigInt(a.totalVthoSpentRaw);
        const vb = BigInt(b.totalVthoSpentRaw);
        return vb > va ? 1 : vb < va ? -1 : 0;
      })
      .slice(0, TOP_COUNT);
  }, [report]);

  if (error) return null;

  if (isLoading || !report) {
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
