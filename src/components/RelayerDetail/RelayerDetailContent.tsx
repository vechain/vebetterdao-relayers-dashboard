"use client"

import { Badge, Box, Button, Card, Grid, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { LuChevronDown, LuCoins, LuFlame, LuTarget } from "react-icons/lu"

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate"
import { formatNumber, formatToken } from "@/lib/format"
import type { RelayerAnalytics } from "@/lib/types"
import { computeRelayerROI, computeRelayerRoundB3tr, computeRelayerSummary } from "@/lib/relayer-utils"

function SectionHeader({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <HStack justify="space-between" w="full">
      <Text textStyle="xs" fontWeight="bold" letterSpacing="wider" textTransform="uppercase" color="text.subtle">
        {title}
      </Text>
      {icon && (
        <Box as="span" color="text.subtle" fontSize="20px" lineHeight="1">
          {icon}
        </Box>
      )}
    </HStack>
  )
}

function MetricCell({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string
  value: string | number
  unit?: string
  valueColor?: string
}) {
  return (
    <VStack gap="1" align="start">
      <Text textStyle="xs" color="text.subtle" fontWeight="semibold">
        {label}
      </Text>
      <HStack gap="1" align="baseline">
        <Text textStyle={{ base: "xl", md: "2xl" }} fontWeight="bold" color={valueColor}>
          {value}
        </Text>
        {unit && (
          <Text textStyle="sm" color="text.subtle">
            {unit}
          </Text>
        )}
      </HStack>
    </VStack>
  )
}

function RoundStat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
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
  )
}

function RoundRow({
  rd,
  b3trRaw,
  isActive,
}: {
  rd: RelayerAnalytics["rounds"][number]
  b3trRaw: string
  isActive?: boolean
}) {
  return (
    <VStack gap="2" align="stretch" px="3" py="3" rounded="lg" _odd={{ bg: "bg.tertiary" }}>
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
      <SimpleGrid columns={{ base: 2, sm: 4 }} gap="3">
        <RoundStat label="Voted for" value={rd.votedForCount} />
        <RoundStat label="Claimed" value={rd.rewardsClaimedCount} />
        <RoundStat label="B3TR earned" value={formatToken(b3trRaw)} unit="B3TR" />
        <RoundStat
          label="VTHO spent"
          value={formatToken((BigInt(rd.vthoSpentOnVotingRaw) + BigInt(rd.vthoSpentOnClaimingRaw)).toString())}
          unit="VTHO"
        />
      </SimpleGrid>
    </VStack>
  )
}

const ROUNDS_PAGE_SIZE = 3

interface RelayerDetailContentProps {
  relayer: RelayerAnalytics
  currentRound: number
  roundCtx?: Map<number, { poolRaw: bigint; totalWeighted: number }>
}

export function RelayerDetailContent({ relayer, currentRound, roundCtx }: RelayerDetailContentProps) {
  const b3trToVtho = useB3trToVthoRate()
  const summary = computeRelayerSummary(relayer, roundCtx)
  const roi = computeRelayerROI(summary.totalB3trEarnedRaw, summary.totalVthoSpentRaw, b3trToVtho)
  const [visibleCount, setVisibleCount] = useState(ROUNDS_PAGE_SIZE)

  const roundsDesc = [...relayer.rounds].sort((a, b) => b.roundId - a.roundId)
  const visibleRounds = roundsDesc.slice(0, visibleCount)
  const hasMore = visibleCount < roundsDesc.length

  return (
    <VStack gap="6" align="stretch">
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4">
        <Card.Root variant="primary">
          <Card.Body>
            <VStack gap="4" align="stretch">
              <SectionHeader title="Performance Overview" icon={<LuTarget />} />
              <SimpleGrid columns={2} gap="4">
                <MetricCell label="Total actions" value={formatNumber(summary.totalActions)} />
                <MetricCell label="Users voted for" value={formatNumber(summary.totalVotedFor)} />
                <MetricCell label="Rewards claimed" value={formatNumber(summary.totalRewardsClaimed)} />
                <MetricCell label="Rounds active" value={formatNumber(summary.activeRoundsCount)} />
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
                  value={roi != null ? `${formatNumber(Math.round(roi))}%` : "\u2014"}
                  valueColor={roi != null ? "status.positive.primary" : undefined}
                />
                <MetricCell
                  label="VTHO / action"
                  value={
                    summary.totalActions > 0
                      ? formatToken(
                          (BigInt(summary.totalVthoSpentRaw) / BigInt(summary.totalActions)).toString(),
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
              <Text textStyle="sm" color="text.subtle">{"No round data available."}</Text>
            ) : (
              <VStack gap="1" align="stretch">
                {visibleRounds.map(rd => (
                  <RoundRow
                    key={rd.roundId}
                    rd={rd}
                    isActive={rd.roundId === currentRound}
                    b3trRaw={
                      roundCtx
                        ? computeRelayerRoundB3tr(rd.weightedActions, roundCtx.get(rd.roundId)).toString()
                        : rd.claimableRewardsRaw
                    }
                  />
                ))}
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    w="full"
                    onClick={() => setVisibleCount(prev => prev + ROUNDS_PAGE_SIZE)}>
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
  )
}
