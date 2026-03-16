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
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuChevronDown,
  LuCoins,
  LuFlame,
  LuHand,
  LuLock,
  LuTarget,
  LuTrophy,
  LuZap,
} from "react-icons/lu";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { formatNumber, formatToken } from "@/lib/format";
import type { RelayerAnalytics, RelayerRoundBreakdown, RoundAnalytics } from "@/lib/types";
import { isRoundRewardsLocked } from "@/lib/round-utils";
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

function activityLabel(
  item: ActivityItem,
  t: (key: string, opts?: { count?: string; amount?: string }) => string,
): string {
  switch (item.type) {
    case "vote":
      return t("Voted for {{count}} users", {
        count: formatNumber(item.count),
      });
    case "claim":
      return t("Claimed rewards for {{count}} users", {
        count: formatNumber(item.count),
      });
    case "reward":
      return t("Claimed {{amount}} B3TR from pool", {
        amount: formatToken(item.amountRaw),
      });
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
  t,
}: {
  item: ActivityItem;
  isCurrentRound: boolean;
  t: (key: string, opts?: { count?: string; amount?: string }) => string;
}) {
  const detail = activityDetail(item);
  return (
    <HStack gap="3" px="3" py="2.5" rounded="lg" _odd={{ bg: "bg.tertiary" }}>
      <ActivityIcon type={item.type} />
      <VStack gap="0" align="start" flex="1" minW="0">
        <HStack gap="1.5">
          <Text textStyle="sm" fontWeight="semibold" lineClamp={1}>
            {activityLabel(item, t)}
          </Text>
          {isCurrentRound && (
            <Badge size="sm" variant="solid" colorPalette="green">
              {t("Live")}
            </Badge>
          )}
        </HStack>
        <HStack gap="1" color="text.subtle">
          <Text textStyle="xxs">
            {t("Round #")}
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
  claimedFor,
  b3trRaw,
  b3trToVtho,
  isActive,
  isLocked,
  totalWeighted,
  t,
}: {
  rd: RelayerAnalytics["rounds"][number];
  claimedFor: number;
  b3trRaw: string;
  b3trToVtho: number | undefined;
  isActive?: boolean;
  isLocked?: boolean;
  totalWeighted?: number;
  t: (key: string) => string;
}) {
  const vthoSpentRaw = (
    BigInt(rd.vthoSpentOnVotingRaw) + BigInt(rd.vthoSpentOnClaimingRaw)
  ).toString();
  const roi = computeRelayerROI(b3trRaw, vthoSpentRaw, b3trToVtho);

  const weightPct =
    totalWeighted && totalWeighted > 0
      ? (rd.weightedActions / totalWeighted) * 100
      : null;

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
          {t("Round #")}
          {rd.roundId}
        </Text>
        {isActive && (
          <Badge size="sm" variant="solid" colorPalette="green">
            {t("Active")}
          </Badge>
        )}
        {isLocked && (
          <Badge size="sm" variant="solid" colorPalette="red" gap="1">
            <LuLock size={10} />
            {t("Rewards Locked")}
          </Badge>
        )}
      </HStack>
      <SimpleGrid columns={{ base: 2, sm: 6 }} gap="3">
        <RoundStat label={t("Voted for")} value={rd.votedForCount} unit={t("users")} />
        <RoundStat
          label={t("Claimed for")}
          value={claimedFor}
          unit={t("users")}
        />
        <RoundStat
          label={t("Weight")}
          value={
            weightPct != null
              ? `${formatNumber(parseFloat(weightPct.toFixed(2)))}%`
              : "\u2014"
          }
        />
        <RoundStat
          label={isActive || rd.votedForCount === 0 ? t("Projected B3TR rewards") : t("B3TR earned")}
          value={formatToken(b3trRaw)}
          unit="B3TR"
        />
        <RoundStat
          label={t("VTHO spent")}
          value={formatToken(vthoSpentRaw)}
          unit="VTHO"
        />
        <RoundStat
          label={isActive || rd.votedForCount === 0 ? t("Projected ROI") : t("ROI")}
          value={roi != null ? `${formatNumber(Math.round(roi))}%` : "\u2014"}
        />
      </SimpleGrid>
    </VStack>
  );
}

interface MergedRound {
  main: RelayerRoundBreakdown;
  catchUp: RelayerRoundBreakdown | null;
}

/**
 * Merge claim-only rounds into their adjacent voting round.
 *
 * Claiming for VBD round N happens during round N+1, so from the relayer's
 * operational perspective claim-only work belongs to round N+1:
 * - If a voting round N+1 exists, the claim-only round N is absorbed as catchUp.
 * - Otherwise a synthetic round N+1 entry is created to display the claims
 *   under the round the relayer was actually active in.
 */
function mergeRelayerRounds(rounds: RelayerRoundBreakdown[]): MergedRound[] {
  const sorted = [...rounds].sort((a, b) => a.roundId - b.roundId);
  const byId = new Map(sorted.map((rd) => [rd.roundId, rd]));
  const consumed = new Set<number>();
  const result: MergedRound[] = [];

  for (const rd of sorted) {
    if (consumed.has(rd.roundId)) continue;

    if (rd.votedForCount > 0) {
      const prev = byId.get(rd.roundId - 1);
      const catchUp =
        prev && prev.votedForCount === 0 && !consumed.has(prev.roundId)
          ? prev
          : null;
      if (catchUp) consumed.add(catchUp.roundId);
      result.push({ main: rd, catchUp });
    } else {
      const next = byId.get(rd.roundId + 1);
      if (next && next.votedForCount > 0) continue;
      result.push({
        main: {
          roundId: rd.roundId + 1,
          votedForCount: 0,
          rewardsClaimedCount: 0,
          weightedActions: 0,
          actions: 0,
          claimableRewardsRaw: "0",
          relayerRewardsClaimedRaw: "0",
          vthoSpentOnVotingRaw: "0",
          vthoSpentOnClaimingRaw: "0",
        },
        catchUp: rd,
      });
    }
  }

  return result;
}

const ROUNDS_PAGE_SIZE = 3;
const ACTIVITY_PAGE_SIZE = 5;

interface RelayerDetailContentProps {
  relayer: RelayerAnalytics;
  currentRound: number;
  reportRounds?: RoundAnalytics[];
  roundCtx?: Map<
    number,
    { poolRaw: bigint; estimatedPoolRaw: bigint; totalWeighted: number; locked: boolean }
  >;
}

export function RelayerDetailContent({
  relayer,
  currentRound,
  reportRounds,
  roundCtx,
}: RelayerDetailContentProps) {
  const { t } = useTranslation();
  const b3trToVtho = useB3trToVthoRate();
  const summary = computeRelayerSummary(relayer, roundCtx, currentRound);
  const roi = computeRelayerROI(
    summary.totalB3trEarnedRaw,
    summary.totalVthoSpentRaw,
    b3trToVtho,
  );
  const [visibleCount, setVisibleCount] = useState(ROUNDS_PAGE_SIZE);
  const [visibleActivityCount, setVisibleActivityCount] =
    useState(ACTIVITY_PAGE_SIZE);

  const mergedRounds = useMemo(
    () => mergeRelayerRounds(relayer.rounds).sort((a, b) => b.main.roundId - a.main.roundId),
    [relayer.rounds],
  );
  const visibleMerged = mergedRounds.slice(0, visibleCount);
  const hasMore = visibleCount < mergedRounds.length;

  const lockedRounds = useMemo(() => {
    const set = new Set<number>();
    for (const rd of reportRounds ?? []) {
      if (isRoundRewardsLocked(rd)) set.add(rd.roundId);
    }
    return set;
  }, [reportRounds]);

  const activityItems = buildActivityItems(relayer.rounds);
  const visibleActivity = activityItems.slice(0, visibleActivityCount);
  const hasMoreActivity = visibleActivityCount < activityItems.length;

  return (
    <VStack gap="6" align="stretch">
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4">
        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <SectionHeader title={t("Performance Overview")} icon={<LuTarget />} />
              <SimpleGrid columns={2} gap="4">
                <MetricCell
                  label={t("Users voted for")}
                  value={formatNumber(summary.totalVotedFor)}
                />
                <MetricCell
                  label={t("Rewards claimed")}
                  value={formatNumber(summary.totalRewardsClaimed)}
                />
                <MetricCell
                  label={t("Rounds active")}
                  value={formatNumber(summary.activeRoundsCount)}
                />
              </SimpleGrid>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <SectionHeader title={t("Financials")} icon={<LuCoins />} />
              <SimpleGrid columns={2} gap="4">
                <MetricCell
                  label={
                    summary.totalVotedFor > 0
                      ? t("B3TR earned")
                      : t("Projected B3TR")
                  }
                  value={formatToken(summary.totalB3trEarnedRaw)}
                  unit="B3TR"
                />
                {BigInt(summary.estimatedB3trRaw ?? "0") > BigInt(0) && (
                  <MetricCell
                    label={t("Estimated")}
                    value={formatToken(summary.estimatedB3trRaw)}
                    unit="B3TR"
                  />
                )}
                <MetricCell
                  label={t("VTHO spent")}
                  value={formatToken(summary.totalVthoSpentRaw)}
                  unit="VTHO"
                />
                <MetricCell
                  label={t("ROI")}
                  value={
                    roi != null ? `${formatNumber(Math.round(roi))}%` : "\u2014"
                  }
                  valueColor={
                    roi != null ? "status.positive.primary" : undefined
                  }
                />
                <MetricCell
                  label={t("Avg VTHO / user")}
                  value={
                    summary.totalVotedFor + summary.totalRewardsClaimed > 0
                      ? formatToken(
                          (
                            BigInt(summary.totalVthoSpentRaw) /
                            BigInt(
                              summary.totalVotedFor +
                                summary.totalRewardsClaimed,
                            )
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
            <SectionHeader title={t("Round History")} icon={<LuFlame />} />
            {mergedRounds.length === 0 ? (
              <Text textStyle="sm" color="text.subtle">
                {t("No round data available.")}
              </Text>
            ) : (
              <VStack gap="1" align="stretch">
                {visibleMerged.map(({ main, catchUp }) => {
                  const isActiveRound = main.roundId === currentRound;
                  const mainCtx = roundCtx?.get(main.roundId);

                  const sources = catchUp ? [catchUp, main] : [main];
                  let b3trTotal = BigInt(0);
                  for (const src of sources) {
                    const ctx = roundCtx?.get(src.roundId);
                    const srcActive = src.roundId === currentRound;
                    const eff = ctx
                      ? srcActive
                        ? { poolRaw: ctx.estimatedPoolRaw, totalWeighted: ctx.totalWeighted }
                        : { poolRaw: ctx.poolRaw, totalWeighted: ctx.totalWeighted }
                      : undefined;
                    b3trTotal += roundCtx
                      ? computeRelayerRoundB3tr(src.weightedActions, eff)
                      : BigInt(src.claimableRewardsRaw);
                  }

                  const combinedRd: RelayerRoundBreakdown = {
                    ...main,
                    weightedActions:
                      main.weightedActions +
                      (catchUp?.weightedActions ?? 0),
                    vthoSpentOnVotingRaw: (
                      BigInt(main.vthoSpentOnVotingRaw) +
                      BigInt(catchUp?.vthoSpentOnVotingRaw ?? "0")
                    ).toString(),
                    vthoSpentOnClaimingRaw: (
                      BigInt(main.vthoSpentOnClaimingRaw) +
                      BigInt(catchUp?.vthoSpentOnClaimingRaw ?? "0")
                    ).toString(),
                  };

                  return (
                    <RoundRow
                      key={main.roundId}
                      rd={combinedRd}
                      claimedFor={
                        (catchUp?.rewardsClaimedCount ?? 0) +
                        main.rewardsClaimedCount
                      }
                      isActive={isActiveRound}
                      isLocked={lockedRounds.has(main.roundId)}
                      b3trToVtho={b3trToVtho}
                      totalWeighted={
                        mainCtx?.totalWeighted ??
                        (catchUp
                          ? roundCtx?.get(catchUp.roundId)?.totalWeighted
                          : undefined)
                      }
                      b3trRaw={b3trTotal.toString()}
                      t={t}
                    />
                  );
                })}
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
                    {t("Load more")}
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
