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
import { useTranslation } from "react-i18next";
import { LuArrowRight } from "react-icons/lu";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { useReportData } from "@/hooks/useReportData";
import { computeROI } from "@/lib/roi";

import { RoundCard } from "./RoundCard";

const RECENT_COUNT = 4;

export function RecentRounds() {
  const { t } = useTranslation();
  const { data: report, isLoading, error } = useReportData();
  const b3trToVtho = useB3trToVthoRate();

  if (error) {
    return null;
  }

  if (isLoading || !report) {
    return (
      <VStack w="full" gap="3" align="stretch">
        <Skeleton w="full" height="16" rounded="xl" />
        <Skeleton w="full" height="16" rounded="xl" />
        <Skeleton w="full" height="16" rounded="xl" />
      </VStack>
    );
  }

  const rounds = [...report.rounds].sort((a, b) => b.roundId - a.roundId);
  const recent = rounds.slice(0, RECENT_COUNT);

  if (recent.length === 0) return null;

  return (
    <VStack gap="4" align="stretch">
      <HStack justify="space-between" align="center">
        <Heading size="lg">{t("Voting rounds")}</Heading>
        <NextLink href="/rounds">
          <Button variant="ghost" size="sm">
            {t("View all")}
            <LuArrowRight />
          </Button>
        </NextLink>
      </HStack>

      <Stack gap="3">
        {recent.map((round) => {
          const rewardsRaw = round.isRoundEnded
            ? round.totalRelayerRewardsRaw
            : round.estimatedRelayerRewardsRaw;
          return (
            <RoundCard
              key={round.roundId}
              round={round}
              currentRoundId={report.currentRound}
              roi={computeROI(
                round.totalRelayerRewardsRaw,
                round.vthoSpentTotalRaw,
                b3trToVtho,
              )}
              expectedRoi={computeROI(
                rewardsRaw,
                round.vthoSpentTotalRaw,
                b3trToVtho,
              )}
            />
          );
        })}
      </Stack>
    </VStack>
  );
}
