"use client";

import {
  Badge,
  Box,
  Card,
  HStack,
  IconButton,
  Image,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useGetAvatarOfAddress, useVechainDomain } from "@vechain/vechain-kit";
import NextLink from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaAngleRight } from "react-icons/fa6";
import { LuRadar } from "react-icons/lu";

import { useReportData } from "@/hooks/useReportData";
import { formatNumber, formatToken } from "@/lib/format";
import type { RelayerRoundBreakdown } from "@/lib/types";

interface ActiveRelayer {
  address: string;
  breakdown: RelayerRoundBreakdown;
  prevBreakdown?: RelayerRoundBreakdown;
}

function StatPill({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <VStack gap="0" align="start" minW="0">
      <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
        {label}
      </Text>
      <HStack gap="1" align="baseline">
        <Text textStyle="sm" fontWeight="semibold" lineClamp={1}>
          {value}
        </Text>
        {unit && (
          <Text textStyle="xxs" color="text.subtle">
            {unit}
          </Text>
        )}
      </HStack>
    </VStack>
  );
}

function ActiveRelayerRow({
  relayer,
  totalWeighted,
  prevTotalWeighted,
}: {
  relayer: ActiveRelayer;
  totalWeighted: number;
  prevTotalWeighted: number;
}) {
  const { data: domain } = useVechainDomain(relayer.address);
  const { data: avatarSrc } = useGetAvatarOfAddress(relayer.address);

  const { t } = useTranslation();
  const displayName = domain?.domain || t("Unknown");
  const shortAddress = `${relayer.address.slice(0, 6)}...${relayer.address.slice(-4)}`;
  const href = `/relayer?address=${domain?.domain || relayer.address}`;

  const { breakdown: rd, prevBreakdown } = relayer;
  const vthoSpentRaw = (
    BigInt(rd.vthoSpentOnVotingRaw) +
    BigInt(prevBreakdown?.vthoSpentOnClaimingRaw ?? "0")
  ).toString();
  const combinedWeighted =
    rd.weightedActions + (prevBreakdown?.weightedActions ?? 0);
  const combinedTotal = totalWeighted + prevTotalWeighted;
  const weightPct =
    combinedTotal > 0
      ? `${formatNumber(parseFloat(((combinedWeighted / combinedTotal) * 100).toFixed(2)))}%`
      : "\u2014";

  return (
    <NextLink href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Card.Root variant="action">
        <Card.Body>
          {/* Desktop */}
          <Box hideBelow="md">
            <HStack justify="space-between" w="full" gap="2">
              <SimpleGrid columns={6} gap="4" w="full" alignItems="center">
                <HStack gridColumn="span 2" gap="3" minW="0">
                  {avatarSrc && (
                    <Box flexShrink={0}>
                      <Image
                        src={avatarSrc}
                        alt={displayName}
                        w="36px"
                        h="36px"
                        rounded="full"
                        objectFit="cover"
                        border="2px solid"
                        borderColor="border.subtle"
                      />
                    </Box>
                  )}
                  <VStack gap="0" align="start" minW="0">
                    <Text fontWeight="bold" textStyle="sm" lineClamp={1}>
                      {displayName}
                    </Text>
                    <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
                      {shortAddress}
                    </Text>
                  </VStack>
                </HStack>
                <StatPill
                  label={t("Voted for")}
                  value={formatNumber(rd.votedForCount)}
                />
                <StatPill
                  label={t("Claimed for")}
                  value={formatNumber(prevBreakdown?.rewardsClaimedCount ?? 0)}
                />
                <StatPill
                  label={t("VTHO spent")}
                  value={formatToken(vthoSpentRaw)}
                  unit="VTHO"
                />
                <StatPill label={t("Weight")} value={weightPct} />
              </SimpleGrid>
              <IconButton aria-label={t("View relayer")} variant="ghost" size="sm">
                <FaAngleRight />
              </IconButton>
            </HStack>
          </Box>

          {/* Mobile */}
          <Box hideFrom="md">
            <VStack gap="3" align="stretch" w="full">
              <HStack justify="space-between" w="full">
                <HStack gap="3" minW="0" flex="1">
                  {avatarSrc && (
                    <Box flexShrink={0}>
                      <Image
                        src={avatarSrc}
                        alt={displayName}
                        w="36px"
                        h="36px"
                        rounded="full"
                        objectFit="cover"
                        border="2px solid"
                        borderColor="border.subtle"
                      />
                    </Box>
                  )}
                  <VStack gap="0" align="start" minW="0">
                    <Text fontWeight="bold" textStyle="sm" lineClamp={1}>
                      {displayName}
                    </Text>
                    <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
                      {shortAddress}
                    </Text>
                  </VStack>
                </HStack>
                <IconButton aria-label={t("View relayer")} variant="ghost" size="sm">
                  <FaAngleRight />
                </IconButton>
              </HStack>
              <SimpleGrid columns={2} gap="2">
                <StatPill
                  label={t("Voted for")}
                  value={formatNumber(rd.votedForCount)}
                />
                <StatPill
                  label={t("Claimed for")}
                  value={formatNumber(prevBreakdown?.rewardsClaimedCount ?? 0)}
                />
                <StatPill
                  label={t("VTHO spent")}
                  value={formatToken(vthoSpentRaw)}
                  unit="VTHO"
                />
                <StatPill label={t("Weight")} value={weightPct} />
              </SimpleGrid>
            </VStack>
          </Box>
        </Card.Body>
      </Card.Root>
    </NextLink>
  );
}

interface RoundActiveRelayersProps {
  roundId: number;
}

export function RoundActiveRelayers({ roundId }: RoundActiveRelayersProps) {
  const { t } = useTranslation();
  const { data: report } = useReportData();

  const { activeRelayers, totalWeighted, prevTotalWeighted } = useMemo(() => {
    if (!report?.relayers)
      return {
        activeRelayers: [] as ActiveRelayer[],
        totalWeighted: 0,
        prevTotalWeighted: 0,
      };
    const prevRoundId = roundId - 1;
    const result: ActiveRelayer[] = [];
    const emptyBreakdown: RelayerRoundBreakdown = {
      roundId,
      votedForCount: 0,
      rewardsClaimedCount: 0,
      weightedActions: 0,
      actions: 0,
      claimableRewardsRaw: "0",
      relayerRewardsClaimedRaw: "0",
      vthoSpentOnVotingRaw: "0",
      vthoSpentOnClaimingRaw: "0",
    };
    for (const relayer of report.relayers) {
      const rd = relayer.rounds.find((r) => r.roundId === roundId);
      const prevRd = relayer.rounds.find((r) => r.roundId === prevRoundId);
      if (rd && (rd.votedForCount > 0 || (prevRd && prevRd.rewardsClaimedCount > 0))) {
        result.push({
          address: relayer.address,
          breakdown: rd,
          prevBreakdown: prevRd,
        });
      } else if (!rd && prevRd && prevRd.rewardsClaimedCount > 0) {
        result.push({
          address: relayer.address,
          breakdown: emptyBreakdown,
          prevBreakdown: prevRd,
        });
      }
    }
    result.sort((a, b) => {
      const wa =
        a.breakdown.weightedActions + (a.prevBreakdown?.weightedActions ?? 0);
      const wb =
        b.breakdown.weightedActions + (b.prevBreakdown?.weightedActions ?? 0);
      return wb - wa;
    });
    const roundExpected =
      report.rounds.find((r) => r.roundId === roundId)?.expectedActions ?? 0;
    const prevRoundExpected =
      report.rounds.find((r) => r.roundId === roundId - 1)?.expectedActions ??
      0;
    return {
      activeRelayers: result,
      totalWeighted: roundExpected,
      prevTotalWeighted: prevRoundExpected,
    };
  }, [report, roundId]);

  if (activeRelayers.length === 0) return null;

  return (
    <VStack gap="4" align="stretch">
      <HStack gap="2" align="center">
        <Box as="span" color="text.subtle" fontSize="20px" lineHeight="1">
          <LuRadar />
        </Box>
        <Text
          textStyle="xs"
          fontWeight="bold"
          letterSpacing="wider"
          textTransform="uppercase"
          color="text.subtle"
        >
          {t("Active Relayers")}
        </Text>
        <Badge size="sm" variant="subtle" colorPalette="gray">
          {activeRelayers.length}
        </Badge>
      </HStack>

      <VStack gap="3" align="stretch">
        {activeRelayers.map((relayer) => (
          <ActiveRelayerRow
            key={relayer.address}
            relayer={relayer}
            totalWeighted={totalWeighted}
            prevTotalWeighted={prevTotalWeighted}
          />
        ))}
      </VStack>
    </VStack>
  );
}
