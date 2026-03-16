"use client";

import {
  Badge,
  Box,
  Card,
  Grid,
  HStack,
  Progress,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  CURRENCY_SYMBOLS,
  useCurrentCurrency,
  useGetTokenUsdPrice,
} from "@vechain/vechain-kit";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuInfo, LuTriangleAlert, LuWallet, LuUsers } from "react-icons/lu";
import { formatEther } from "viem";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { useRoundRewardStatus } from "@/hooks/useRoundRewardStatus";
import { useTotalVoters } from "@/hooks/useTotalVoters";
import { formatNumber, formatToken } from "@/lib/format";
import { computeROI } from "@/lib/roi";
import {
  computeRoundCompletion,
  getRoundPhaseLabel,
  isRoundRewardsLocked,
  parseRoundStatus,
} from "@/lib/round-utils";
import type { RoundAnalytics } from "@/lib/types";

import { AppsAsRelayersCard } from "../AppsAsRelayers";
import { RoundActiveRelayers } from "./RoundActiveRelayers";
import { StatusLegendModal } from "./StatusLegendModal";

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "\u2014";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function SectionHeader({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <HStack justify="space-between" w="full">
      <Text
        textStyle="xs"
        fontWeight="bold"
        letterSpacing="wider"
        textTransform="uppercase"
        color="text.subtle"
      >
        {title}
      </Text>
      {icon && (
        <Box as="span" color="text.subtle" fontSize="20px" lineHeight="1">
          {icon}
        </Box>
      )}
    </HStack>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <HStack justify="space-between" w="full">
      <Text textStyle="sm" color="text.subtle">
        {label}
      </Text>
      <Text textStyle="sm" fontWeight="semibold" color={valueColor}>
        {value}
      </Text>
    </HStack>
  );
}

function MetricCell({
  label,
  sublabel,
  value,
  valueColor,
}: {
  label: string;
  sublabel?: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <VStack gap="1" align="start">
      <Text textStyle="xs" color="text.subtle" fontWeight="semibold">
        {label}
      </Text>
      {sublabel && (
        <Text textStyle="xxs" color="text.subtle">
          {sublabel}
        </Text>
      )}
      <Text
        textStyle={{ base: "xl", md: "2xl" }}
        fontWeight="bold"
        color={valueColor}
      >
        {value}
      </Text>
    </VStack>
  );
}

function FinancialCell({
  label,
  value,
  unit,
  usdValue,
  highlighted,
  valueColor,
}: {
  label: string;
  value: string;
  unit?: string;
  usdValue?: string;
  highlighted?: boolean;
  valueColor?: string;
}) {
  return (
    <HStack
      justify="space-between"
      w="full"
      px="3"
      py="2"
      rounded="lg"
      bg={highlighted ? "bg.tertiary" : undefined}
    >
      <Text textStyle="sm" color="text.subtle">
        {label}
      </Text>
      <VStack gap="0" align="end">
        <HStack gap="1">
          <Text textStyle="sm" fontWeight="semibold" color={valueColor}>
            {value}
          </Text>
          {unit && (
            <Text textStyle="xs" color="text.subtle">
              {unit}
            </Text>
          )}
        </HStack>
        {usdValue && (
          <Text textStyle="xxs" color="text.subtle">
            {usdValue}
          </Text>
        )}
      </VStack>
    </HStack>
  );
}

function MiniStatCard({
  label,
  value,
  secondaryValue,
  sublabel,
}: {
  label: string;
  value: string | number;
  secondaryValue?: string;
  sublabel?: string;
}) {
  return (
    <Card.Root variant="primary" p="4">
      <VStack gap="1" align="start">
        <Text
          textStyle="xs"
          textTransform="uppercase"
          color="text.subtle"
          fontWeight="semibold"
          letterSpacing="wider"
        >
          {label}
        </Text>
        <HStack gap="1" align="baseline">
          <Text textStyle={{ base: "xl", md: "2xl" }} fontWeight="bold">
            {typeof value === "number" ? formatNumber(value) : value}
          </Text>
          {secondaryValue && (
            <Text
              textStyle={{ base: "sm", md: "md" }}
              fontWeight="semibold"
              color="text.subtle"
            >
              /{secondaryValue}
            </Text>
          )}
          {sublabel && (
            <Text textStyle="xxs" color="text.subtle">
              {sublabel}
            </Text>
          )}
        </HStack>
      </VStack>
    </Card.Root>
  );
}

interface RoundDetailContentProps {
  round: RoundAnalytics;
  prevRound?: RoundAnalytics | null;
  generatedAt?: string;
}

function rawToFiat(
  rawValue: string,
  tokenUsdPrice: number | undefined,
  currencyRate: number,
  symbol: string,
): string | undefined {
  if (tokenUsdPrice == null) return undefined;
  const amount = Number(formatEther(BigInt(rawValue)));
  if (amount === 0) return `${symbol}0.00`;
  const fiat = (amount * tokenUsdPrice) / currencyRate;
  return `${symbol}${fiat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RoundDetailContent({
  round,
  prevRound,
  generatedAt,
}: RoundDetailContentProps) {
  const { t } = useTranslation();
  const b3trToVtho = useB3trToVthoRate();
  const { data: totalVoters } = useTotalVoters(round.roundId);
  const { data: b3trUsd } = useGetTokenUsdPrice("B3TR");
  const { data: vthoUsd } = useGetTokenUsdPrice("VTHO");
  const { data: eurRate } = useGetTokenUsdPrice("EUR");
  const { data: gbpRate } = useGetTokenUsdPrice("GBP");
  const { currentCurrency } = useCurrentCurrency();

  const currencySymbol = CURRENCY_SYMBOLS[currentCurrency];
  const currencyRate =
    currentCurrency === "eur"
      ? (eurRate ?? 1)
      : currentCurrency === "gbp"
        ? (gbpRate ?? 1)
        : 1;

  const completionPct = computeRoundCompletion(round);
  const phaseLabel = getRoundPhaseLabel(round);

  const participation = pct(round.votedForCount, round.autoVotingUsersCount);

  const efficiencyDenom = round.autoVotingUsersCount - round.reducedUsersCount;
  const efficiency =
    efficiencyDenom > 0 ? pct(round.votedForCount, efficiencyDenom) : "\u2014";

  const roiRewardsRaw = round.isRoundEnded
    ? round.totalRelayerRewardsRaw
    : round.estimatedRelayerRewardsRaw;
  const roi = computeROI(roiRewardsRaw, round.vthoSpentTotalRaw, b3trToVtho);
  const roiLabel = round.isRoundEnded ? t("ROI") : t("Expected ROI");

  const status = parseRoundStatus(round);
  const [isStatusModalOpen, setStatusModalOpen] = useState(false);

  const { claimable, totalRewardsFormatted } = useRoundRewardStatus(
    round.isRoundEnded ? round.roundId : undefined,
  );
  const rewardsLocked = isRoundRewardsLocked(round) || (round.isRoundEnded && claimable === false);
  const missedClaims =
    round.isRoundEnded && round.expectedActions > 0
      ? Math.max(0, round.expectedActions - round.completedActions)
      : 0;

  return (
    <VStack gap="14" align="stretch">
      {rewardsLocked && (
        <Box
          bg={{ base: "red.50", _dark: "red.950/60" }}
          borderWidth="1px"
          borderColor={{ base: "red.200", _dark: "red.800/50" }}
          borderRadius="2xl"
          p={{ base: 4, md: 5 }}
        >
          <HStack gap={3} align="start">
            <Box
              flexShrink={0}
              w="42px"
              h="42px"
              rounded="full"
              bg={{ base: "red.100", _dark: "red.500/15" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              color={{ base: "red.600", _dark: "red.400" }}
            >
              <LuTriangleAlert size={20} />
            </Box>
            <VStack align="start" gap={1}>
              <Text
                textStyle="sm"
                fontWeight="bold"
                color={{ base: "red.800", _dark: "red.200" }}
              >
                {t("Rewards Locked")}
              </Text>
              <Text
                textStyle="xs"
                color={{ base: "red.700/80", _dark: "red.400/70" }}
              >
                {t("rewardsLockedDescription", {
                  missing: String(missedClaims),
                  amount: totalRewardsFormatted ?? formatToken(round.totalRelayerRewardsRaw),
                })}
              </Text>
            </VStack>
          </HStack>
        </Box>
      )}

      <Grid
        templateColumns={{ base: "1fr", lg: "2fr 3fr" }}
        gap="4"
        alignItems="start"
      >
        {/* Left Column */}
        <VStack gap="4" align="stretch">
          <Card.Root variant="primary">
            <Card.Body>
              <VStack gap="4" align="stretch">
                <SectionHeader title={t("Round Summary")} />
                <VStack gap="2" align="stretch">
                  <HStack justify="space-between" w="full">
                    <Text textStyle="sm" color="text.subtle">
                      {t("Current Status")}
                    </Text>
                    <HStack
                      gap="1"
                      cursor="pointer"
                      onClick={() => setStatusModalOpen(true)}
                      _hover={{ opacity: 0.8 }}
                    >
                      <Badge
                        size="sm"
                        variant="solid"
                        colorPalette={status.colorPalette}
                      >
                        {t(status.label)}
                      </Badge>
                      <Box as="span" color="text.subtle" fontSize="14px">
                        <LuInfo />
                      </Box>
                    </HStack>
                  </HStack>
                  <SummaryRow label={t("Phase")} value={t(phaseLabel)} />
                  <SummaryRow
                    label={t("Total Voters")}
                    value={
                      totalVoters != null ? formatNumber(totalVoters) : "\u2014"
                    }
                  />
                  <SummaryRow
                    label={t("Users to Serve")}
                    value={formatNumber(round.autoVotingUsersCount)}
                  />
                  <SummaryRow
                    label={t("Active Relayers")}
                    value={round.numRelayers}
                  />
                </VStack>
                <Separator />
                <VStack gap="2" align="stretch">
                  <HStack justify="space-between" w="full">
                    <Text textStyle="sm" fontWeight="semibold">
                      {round.isRoundEnded
                        ? t("Completion Progress")
                        : t("Voting Progress")}
                    </Text>
                    <Text
                      textStyle="sm"
                      fontWeight="semibold"
                      color="status.info.strong"
                    >
                      {completionPct}
                      {"%"}
                    </Text>
                  </HStack>
                  <Progress.Root
                    value={completionPct}
                    colorPalette="blue"
                    size="sm"
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  {generatedAt && (
                    <Text
                      textStyle="xxs"
                      textTransform="uppercase"
                      color="text.subtle"
                      letterSpacing="wider"
                    >
                      {t("Updated")} {timeAgo(generatedAt)}
                    </Text>
                  )}
                </VStack>
              </VStack>
            </Card.Body>
          </Card.Root>

          <SimpleGrid columns={2} gap="4">
            <MiniStatCard
              label={t("Voted for")}
              value={formatNumber(round.votedForCount)}
              secondaryValue={formatNumber(round.autoVotingUsersCount)}
              sublabel={t("users")}
            />
            <MiniStatCard
              label={t("Claimed for")}
              value={
                prevRound
                  ? formatNumber(prevRound.rewardsClaimedCount)
                  : "\u2014"
              }
              secondaryValue={
                prevRound
                  ? formatNumber(
                      prevRound.autoVotingUsersCount -
                        prevRound.reducedUsersCount,
                    )
                  : undefined
              }
              sublabel={prevRound ? t("users") : undefined}
            />
          </SimpleGrid>
        </VStack>

        {/* Right Column */}
        <VStack gap="4" align="stretch">
          <Card.Root variant="primary">
            <Card.Body>
              <VStack gap="3" align="stretch">
                <SectionHeader
                  title={t("Financials & Performance")}
                  icon={<LuWallet />}
                />
                <SimpleGrid columns={{ base: 1, md: 2 }} gap="2">
                  <Box order={{ base: 1, md: 0 }}>
                    <FinancialCell
                      label={t("VTHO (Voting)")}
                      value={formatToken(round.vthoSpentOnVotingRaw)}
                      unit="VTHO"
                      usdValue={rawToFiat(
                        round.vthoSpentOnVotingRaw,
                        vthoUsd,
                        currencyRate,
                        currencySymbol,
                      )}
                    />
                  </Box>
                  <Box order={{ base: 4, md: 0 }}>
                    <FinancialCell
                      label={
                        round.isRoundEnded
                          ? t("Accrued Rewards")
                          : t("Projected Rewards")
                      }
                      value={formatToken(
                        round.isRoundEnded
                          ? round.totalRelayerRewardsRaw
                          : round.estimatedRelayerRewardsRaw,
                      )}
                      unit="B3TR"
                      usdValue={rawToFiat(
                        round.isRoundEnded
                          ? round.totalRelayerRewardsRaw
                          : round.estimatedRelayerRewardsRaw,
                        b3trUsd,
                        currencyRate,
                        currencySymbol,
                      )}
                    />
                  </Box>
                  <Box order={{ base: 2, md: 0 }}>
                    <FinancialCell
                      label={t("VTHO (Claiming)")}
                      value={formatToken(round.vthoSpentOnClaimingRaw)}
                      unit="VTHO"
                      usdValue={rawToFiat(
                        round.vthoSpentOnClaimingRaw,
                        vthoUsd,
                        currencyRate,
                        currencySymbol,
                      )}
                    />
                  </Box>
                  <Box
                    display={{ base: "none", md: "block" }}
                    order={{ base: 6, md: 0 }}
                  />
                  <Box order={{ base: 3, md: 0 }}>
                    <FinancialCell
                      label={t("Total VTHO Spent")}
                      value={formatToken(round.vthoSpentTotalRaw)}
                      unit="VTHO"
                      usdValue={rawToFiat(
                        round.vthoSpentTotalRaw,
                        vthoUsd,
                        currencyRate,
                        currencySymbol,
                      )}
                      highlighted
                    />
                  </Box>
                  <Box order={{ base: 5, md: 0 }}>
                    <FinancialCell
                      label={roiLabel}
                      value={
                        roi != null
                          ? `${formatNumber(Math.round(roi))}%`
                          : "\u2014"
                      }
                      highlighted
                      valueColor="status.positive.primary"
                    />
                  </Box>
                </SimpleGrid>
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Grid>

      <RoundActiveRelayers roundId={round.roundId} />

      <SimpleGrid columns={{ base: 1, md: 1 }} gap="4">
        <AppsAsRelayersCard forceBanner={true} />
      </SimpleGrid>

      <StatusLegendModal
        isOpen={isStatusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />
    </VStack>
  );
}
