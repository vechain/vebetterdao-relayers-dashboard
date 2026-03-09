"use client"

import { Box, Card, HStack, SimpleGrid, Skeleton, Text, VStack } from "@chakra-ui/react"
import type { IconType } from "react-icons"
import { LuActivity, LuChartLine, LuCoins, LuFlame, LuRadar } from "react-icons/lu"

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate"
import { useRegisteredRelayers } from "@/hooks/useRegisteredRelayers"
import { useReportData } from "@/hooks/useReportData"
import { formatNumber, formatToken } from "@/lib/format"
import { computeRelayersOverview } from "@/lib/relayer-utils"
import { computeAverageROI } from "@/lib/roi"

function StatItem({
  label,
  value,
  sublabel,
  icon,
  isLoading,
}: {
  label: string
  value: string
  sublabel: string
  icon: IconType
  isLoading?: boolean
}) {
  return (
    <Card.Root p={{ base: "4", md: "6" }} variant="action">
      <VStack flex={1} alignItems="start" gap="1">
        <HStack w="full" justifyContent="space-between" alignItems="center">
          <Text textStyle={{ base: "xs", md: "sm" }} color="text.subtle" lineClamp={1}>
            {label}
          </Text>
          <Box as="span" color="text.subtle" fontSize={{ base: "16px", md: "20px" }} lineHeight="1">
            {icon({})}
          </Box>
        </HStack>
        <Skeleton loading={!!isLoading}>
          <Text textStyle={{ base: "lg", md: "2xl" }} fontWeight="semibold">
            {value}
          </Text>
        </Skeleton>
        <Text textStyle="xs" color="text.subtle">
          {sublabel}
        </Text>
      </VStack>
    </Card.Root>
  )
}

export function RelayersOverviewCards() {
  const { data: report, isLoading: reportLoading } = useReportData()
  const { count: relayerCount, isLoading: relayersLoading } = useRegisteredRelayers()
  const b3trToVtho = useB3trToVthoRate()

  const overview = report ? computeRelayersOverview(report) : null
  const concludedRounds = (report?.rounds ?? []).filter(
    (r) => r.isRoundEnded && r.totalRelayerRewardsRaw !== "0",
  )
  const avgRoi = computeAverageROI(concludedRounds, b3trToVtho)

  return (
    <SimpleGrid w="full" columns={{ base: 2, md: 5 }} gap="4">
      <StatItem
        label="Total relayers"
        value={relayersLoading ? "..." : formatNumber(relayerCount)}
        sublabel="registered on-chain"
        icon={LuRadar}
        isLoading={relayersLoading}
      />
      <StatItem
        label="Active now"
        value={reportLoading ? "..." : overview ? formatNumber(overview.activeRelayers) : "\u2014"}
        sublabel="active in last 3 rounds"
        icon={LuActivity}
        isLoading={reportLoading}
      />
      <StatItem
        label="B3TR distributed"
        value={reportLoading ? "..." : overview ? `${formatToken(overview.totalB3trDistributedRaw)} B3TR` : "\u2014"}
        sublabel="total relayer rewards"
        icon={LuCoins}
        isLoading={reportLoading}
      />
      <StatItem
        label="VTHO spent"
        value={reportLoading ? "..." : overview ? `${formatToken(overview.totalVthoSpentRaw)} VTHO` : "\u2014"}
        sublabel="total gas costs"
        icon={LuFlame}
        isLoading={reportLoading}
      />
      <StatItem
        label="Average ROI"
        value={
          reportLoading
            ? "..."
            : avgRoi != null
              ? `${formatNumber(Math.round(avgRoi))}%`
              : "\u2014"
        }
        sublabel={
          b3trToVtho != null
            ? `1 B3TR = ${formatNumber(Math.round(b3trToVtho))} VTHO`
            : "1 B3TR = \u2026 VTHO"
        }
        icon={LuChartLine}
        isLoading={reportLoading}
      />
    </SimpleGrid>
  )
}
