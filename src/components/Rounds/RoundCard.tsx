"use client";

import {
  Badge,
  Box,
  Card,
  HStack,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useTranslation } from "react-i18next";
import { FaAngleRight } from "react-icons/fa6";

import { formatNumber, formatToken } from "@/lib/format";
import { parseRoundStatus } from "@/lib/round-utils";
import type { RoundAnalytics } from "@/lib/types";

interface RoundCardProps {
  round: RoundAnalytics;
  currentRoundId: number;
  roi: number | null;
  expectedRoi: number | null;
}

function StatPill({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string;
  value?: string | number;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <VStack gap="0" align="start" minW="0" justifyContent="center">
      <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
        {label}
      </Text>
      {value != null && (
        <HStack gap="1" align="baseline">
          <Text
            textStyle="sm"
            fontWeight="semibold"
            lineClamp={1}
            color={valueColor}
          >
            {value}
          </Text>
          {unit && (
            <Text textStyle="xxs" color="text.subtle">
              {unit}
            </Text>
          )}
        </HStack>
      )}
    </VStack>
  );
}

export function RoundCard({
  round,
  currentRoundId,
  roi,
  expectedRoi,
}: RoundCardProps) {
  const { t } = useTranslation();
  const isActive = !round.isRoundEnded;
  const displayRoi = isActive ? expectedRoi : roi;
  const roiLabel = isActive ? t("Expected ROI") : t("ROI");
  const status = parseRoundStatus(round, currentRoundId);

  const roundLabel = (
    <HStack gap="2">
      <Text fontWeight="bold" textStyle="sm">
        {"#"}
        {round.roundId}
      </Text>
    </HStack>
  );

  const stats = (
    <>
      <StatPill label={t("Round")} value={`#${round.roundId}`} />
      <StatPill
        label={t("Users to serve")}
        value={formatNumber(round.autoVotingUsersCount)}
      />
      <StatPill label={t("Relayers")} value={round.numRelayers} />
      <StatPill
        label={t("VTHO spent")}
        value={formatToken(round.vthoSpentTotalRaw)}
        unit="VTHO"
      />
      <StatPill
        label={isActive ? t("Projected Rewards") : t("Rewards")}
        value={formatToken(
          isActive
            ? round.estimatedRelayerRewardsRaw
            : round.totalRelayerRewardsRaw,
        )}
        unit="B3TR"
      />
      <StatPill
        label={roiLabel}
        value={
          displayRoi != null ? `${formatNumber(Math.round(displayRoi))}%` : "-"
        }
        valueColor={displayRoi != null ? "status.positive.primary" : undefined}
      />
    </>
  );

  return (
    <NextLink
      href={`/round?roundId=${round.roundId}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Card.Root variant="action">
        <Card.Body>
          {/* Desktop: single row */}
          <Box hideBelow="md">
            <HStack justify="space-between" w="full" gap="2">
              <SimpleGrid columns={7} gap="4" w="full" alignItems="center">
                {stats}
                <VStack gap="0" align="start" minW="0" justifyContent="center">
                  <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
                    {t("Status")}
                  </Text>
                  <Badge
                    size="sm"
                    variant="solid"
                    colorPalette={status.colorPalette}
                  >
                    {t(status.label)}
                  </Badge>
                </VStack>
              </SimpleGrid>
              <IconButton
                aria-label={t("Go to round")}
                variant="ghost"
                size="sm"
              >
                <FaAngleRight />
              </IconButton>
            </HStack>
          </Box>

          {/* Mobile: stacked */}
          <Box hideFrom="md">
            <VStack gap="2" align="stretch" w="full">
              <HStack justify="space-between" w="full">
                {roundLabel}
                <IconButton
                  aria-label={t("Go to round")}
                  variant="ghost"
                  size="sm"
                >
                  <FaAngleRight />
                </IconButton>
              </HStack>
              <SimpleGrid columns={{ base: 2, sm: 3 }} gap="2">
                {stats}
              </SimpleGrid>
            </VStack>
          </Box>
        </Card.Body>
      </Card.Root>
    </NextLink>
  );
}
