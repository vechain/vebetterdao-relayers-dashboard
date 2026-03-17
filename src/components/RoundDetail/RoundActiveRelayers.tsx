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
}: {
  relayer: ActiveRelayer;
  totalWeighted: number;
}) {
  const { data: domain } = useVechainDomain(relayer.address);
  const { data: avatarSrc } = useGetAvatarOfAddress(relayer.address);

  const { t } = useTranslation();
  const displayName = domain?.domain || t("Unknown");
  const shortAddress = `${relayer.address.slice(0, 6)}...${relayer.address.slice(-4)}`;
  const href = `/relayer?address=${domain?.domain || relayer.address}`;

  const { breakdown: rd } = relayer;
  const vthoSpentRaw = (
    BigInt(rd.vthoSpentOnVotingRaw) + BigInt(rd.vthoSpentOnClaimingRaw)
  ).toString();
  const weightPct =
    totalWeighted > 0
      ? `${formatNumber(parseFloat(((rd.weightedActions / totalWeighted) * 100).toFixed(2)))}%`
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
                  value={formatNumber(rd.rewardsClaimedCount)}
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
                  value={formatNumber(rd.rewardsClaimedCount)}
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

  const { activeRelayers, totalWeighted } = useMemo(() => {
    if (!report?.relayers)
      return { activeRelayers: [] as ActiveRelayer[], totalWeighted: 0 };
    const result: ActiveRelayer[] = [];
    let weighted = 0;
    for (const relayer of report.relayers) {
      const rd = relayer.rounds.find((r) => r.roundId === roundId);
      if (rd && (rd.votedForCount > 0 || rd.rewardsClaimedCount > 0)) {
        weighted += rd.weightedActions;
        result.push({
          address: relayer.address,
          breakdown: rd,
        });
      }
    }
    result.sort(
      (a, b) => b.breakdown.votedForCount - a.breakdown.votedForCount,
    );
    return { activeRelayers: result, totalWeighted: weighted };
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
          />
        ))}
      </VStack>
    </VStack>
  );
}
