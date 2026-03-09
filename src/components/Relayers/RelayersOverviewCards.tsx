"use client"

import { Box, Card, HStack, SimpleGrid, Skeleton, Text, VStack } from "@chakra-ui/react"
import type { IconType } from "react-icons"
import { LuActivity, LuCoins, LuFlame, LuRadar } from "react-icons/lu"

import { useRegisteredRelayers } from "@/hooks/useRegisteredRelayers"
import { useReportData } from "@/hooks/useReportData"
import { formatNumber, formatToken } from "@/lib/format"
import { computeRelayersOverview } from "@/lib/relayer-utils"

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

  const overview = report ? computeRelayersOverview(report) : null

  return (
    <SimpleGrid w="full" columns={{ base: 2, md: 4 }} gap="4">
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
    </SimpleGrid>
  )
}
