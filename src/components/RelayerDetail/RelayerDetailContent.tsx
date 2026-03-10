"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LuChevronDown,
  LuCoins,
  LuFlame,
  LuHand,
  LuTarget,
  LuTrophy,
  LuZap,
} from "react-icons/lu";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { formatNumber, formatToken } from "@/lib/format";
import type { RelayerAnalytics, RelayerRoundBreakdown } from "@/lib/types";
import {
  computeRelayerROI,
  computeRelayerRoundB3tr,
  computeRelayerSummary,
} from "@/lib/relayer-utils";

interface ActivityItem {
  type: "vote" | "claim" | "reward";
  roundId: number;
  count: number;
  /** VTHO spent (for vote/claim) or B3TR claimed (for reward) */
  amountRaw: string;
}

const ACTIVITY_TYPE_ORDER: Record<ActivityItem["type"], number> = {
  vote: 0,
  claim: 1,
  reward: 2,
};

function buildActivityItems(rounds: RelayerRoundBreakdown[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const rd of rounds) {
    if (rd.votedForCount > 0) {
      items.push({
        type: "vote",
        roundId: rd.roundId,
        count: rd.votedForCount,
        amountRaw: rd.vthoSpentOnVotingRaw,
      });
    }
    if (rd.rewardsClaimedCount > 0) {
      items.push({
        type: "claim",
        roundId: rd.roundId,
        count: rd.rewardsClaimedCount,
        amountRaw: rd.vthoSpentOnClaimingRaw,
      });
    }
    // Relayer claimed their rewards from the pool
    const claimed = BigInt(rd.relayerRewardsClaimedRaw ?? "0");
    if (claimed > BigInt(0)) {
      items.push({
        type: "reward",
        roundId: rd.roundId,
        count: 0,
        amountRaw: claimed.toString(),
      });
    }
  }
  items.sort(
    (a, b) =>
      b.roundId - a.roundId ||
      ACTIVITY_TYPE_ORDER[a.type] - ACTIVITY_TYPE_ORDER[b.type],
  );
  return items;
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const styles = {
    vote: { bg: "blue.subtle", color: "blue.fg", icon: <LuHand size={14} /> },
    claim: {
      bg: "green.subtle",
      color: "green.fg",
      icon: <LuTrophy size={14} />,
    },
    reward: {
      bg: "yellow.subtle",
      color: "yellow.fg",
      icon: <LuCoins size={14} />,
    },
  };
  const s = styles[type];
  return (
    <Box
      flexShrink={0}
      w="32px"
      h="32px"
      rounded="full"
      bg={s.bg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={s.color}
    >
      {s.icon}
    </Box>
  );
}

function activityLabel(item: ActivityItem): string {
  switch (item.type) {
    case "vote":
      return `Voted for ${formatNumber(item.count)} users`;
    case "claim":
      return `Claimed rewards for ${formatNumber(item.count)} users`;
    case "reward":
      return `Claimed ${formatToken(item.amountRaw)} B3TR from pool`;
  }
}

function activityDetail(item: ActivityItem): string | null {
  if (item.type === "reward") return null;
  if (BigInt(item.amountRaw) <= BigInt(0)) return null;
  return `${formatToken(item.amountRaw)} VTHO`;
}

function ActivityRow({
  item,
  isCurrentRound,
}: {
  item: ActivityItem;
  isCurrentRound: boolean;
}) {
  const detail = activityDetail(item);
  return (
    <HStack gap="3" px="3" py="2.5" rounded="lg" _odd={{ bg: "bg.tertiary" }}>
      <ActivityIcon type={item.type} />
      <VStack gap="0" align="start" flex="1" minW="0">
        <HStack gap="1.5">
          <Text textStyle="sm" fontWeight="semibold" lineClamp={1}>
            {activityLabel(item)}
          </Text>
          {isCurrentRound && (
            <Badge size="sm" variant="solid" colorPalette="green">
              {"Live"}
            </Badge>
          )}
        </HStack>
        <HStack gap="1" color="text.subtle">
          <Text textStyle="xxs">
            {"Round #"}
            {item.roundId}
          </Text>
          {detail && (
            <>
              <Text textStyle="xxs">{"·"}</Text>
              <Text textStyle="xxs">{detail}</Text>
            </>
          )}
        </HStack>
      </VStack>
    </HStack>
  );
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

function MetricCell({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <VStack gap="1" align="start">
      <Text textStyle="xs" color="text.subtle" fontWeight="semibold">
        {label}
      </Text>
      <HStack gap="1" align="baseline">
        <Text
          textStyle={{ base: "xl", md: "2xl" }}
          fontWeight="bold"
          color={valueColor}
        >
          {value}
        </Text>
        {unit && (
          <Text textStyle="sm" color="text.subtle">
            {unit}
          </Text>
        )}
      </HStack>
    </VStack>
  );
}

function RoundStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <VStack gap="0" align="start">
      <Text textStyle="xxs" color="text.subtle">
        {label}
      </Text>
      <HStack gap="1" align="baseline">
        <Text textStyle="sm" fontWeight="semibold">
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

function RoundRow({
  rd,
  b3trRaw,
  b3trToVtho,
  isActive,
}: {
  rd: RelayerAnalytics["rounds"][number];
  b3trRaw: string;
  b3trToVtho: number | undefined;
  isActive?: boolean;
}) {
  const vthoSpentRaw = (
    BigInt(rd.vthoSpentOnVotingRaw) + BigInt(rd.vthoSpentOnClaimingRaw)
  ).toString();
  const roi = computeRelayerROI(b3trRaw, vthoSpentRaw, b3trToVtho);

  return (
    <VStack
      gap="2"
      align="stretch"
      px="3"
      py="3"
      rounded="lg"
      _odd={{ bg: "bg.tertiary" }}
    >
      <HStack gap="2">
        <Text textStyle="sm" fontWeight="bold">
          {"Round #"}
          {rd.roundId}
        </Text>
        {isActive && (
          <Badge size="sm" variant="solid" colorPalette="green">
            {"Active"}
          </Badge>
        )}
      </HStack>
      <SimpleGrid columns={{ base: 2, sm: 5 }} gap="3">
        <RoundStat label="Voted for" value={rd.votedForCount} unit="users" />
        <RoundStat
          label="Claimed for"
          value={rd.rewardsClaimedCount}
          unit="users"
        />
        <RoundStat
          label="B3TR earned"
          value={formatToken(b3trRaw)}
          unit="B3TR"
        />
        <RoundStat
          label="VTHO spent"
          value={formatToken(vthoSpentRaw)}
          unit="VTHO"
        />
        <RoundStat
          label="ROI"
          value={roi != null ? `${formatNumber(Math.round(roi))}%` : "\u2014"}
        />
      </SimpleGrid>
    </VStack>
  );
}

const ROUNDS_PAGE_SIZE = 3;
const ACTIVITY_PAGE_SIZE = 5;

interface RelayerDetailContentProps {
  relayer: RelayerAnalytics;
  currentRound: number;
  roundCtx?: Map<number, { poolRaw: bigint; totalWeighted: number }>;
}

export function RelayerDetailContent({
  relayer,
  currentRound,
  roundCtx,
}: RelayerDetailContentProps) {
  const b3trToVtho = useB3trToVthoRate();
  const summary = computeRelayerSummary(relayer, roundCtx);
  const roi = computeRelayerROI(
    summary.totalB3trEarnedRaw,
    summary.totalVthoSpentRaw,
    b3trToVtho,
  );
  const [visibleCount, setVisibleCount] = useState(ROUNDS_PAGE_SIZE);
  const [visibleActivityCount, setVisibleActivityCount] =
    useState(ACTIVITY_PAGE_SIZE);

  const roundsDesc = [...relayer.rounds].sort((a, b) => b.roundId - a.roundId);
  const visibleRounds = roundsDesc.slice(0, visibleCount);
  const hasMore = visibleCount < roundsDesc.length;

  const activityItems = buildActivityItems(relayer.rounds);
  const visibleActivity = activityItems.slice(0, visibleActivityCount);
  const hasMoreActivity = visibleActivityCount < activityItems.length;

  return (
    <VStack gap="6" align="stretch">
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4">
        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <SectionHeader title="Performance Overview" icon={<LuTarget />} />
              <SimpleGrid columns={2} gap="4">
                <MetricCell
                  label="Users voted for"
                  value={formatNumber(summary.totalVotedFor)}
                />
                <MetricCell
                  label="Rewards claimed"
                  value={formatNumber(summary.totalRewardsClaimed)}
                />
                <MetricCell
                  label="Rounds active"
                  value={formatNumber(summary.activeRoundsCount)}
                />
              </SimpleGrid>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <SectionHeader title="Financials" icon={<LuCoins />} />
              <SimpleGrid columns={2} gap="4">
                <MetricCell
                  label="B3TR earned"
                  value={formatToken(summary.totalB3trEarnedRaw)}
                  unit="B3TR"
                />
                <MetricCell
                  label="VTHO spent"
                  value={formatToken(summary.totalVthoSpentRaw)}
                  unit="VTHO"
                />
                <MetricCell
                  label="ROI"
                  value={
                    roi != null ? `${formatNumber(Math.round(roi))}%` : "\u2014"
                  }
                  valueColor={
                    roi != null ? "status.positive.primary" : undefined
                  }
                />
                <MetricCell
                  label="Avg VTHO / user"
                  value={
                    summary.totalVotedFor > 0
                      ? formatToken(
                          (
                            BigInt(summary.totalVthoSpentRaw) /
                            BigInt(summary.totalVotedFor)
                          ).toString(),
                        )
                      : "\u2014"
                  }
                  unit="VTHO"
                />
              </SimpleGrid>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root variant="primary">
        <Card.Body>
          <VStack gap="3" align="stretch">
            <SectionHeader title="Round History" icon={<LuFlame />} />
            {roundsDesc.length === 0 ? (
              <Text textStyle="sm" color="text.subtle">
                {"No round data available."}
              </Text>
            ) : (
              <VStack gap="1" align="stretch">
                {visibleRounds.map((rd) => (
                  <RoundRow
                    key={rd.roundId}
                    rd={rd}
                    isActive={rd.roundId === currentRound}
                    b3trToVtho={b3trToVtho}
                    b3trRaw={
                      roundCtx
                        ? computeRelayerRoundB3tr(
                            rd.weightedActions,
                            roundCtx.get(rd.roundId),
                          ).toString()
                        : rd.claimableRewardsRaw
                    }
                  />
                ))}
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    w="full"
                    onClick={() =>
                      setVisibleCount((prev) => prev + ROUNDS_PAGE_SIZE)
                    }
                  >
                    <LuChevronDown />
                    {"Load more"}
                  </Button>
                )}
              </VStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
