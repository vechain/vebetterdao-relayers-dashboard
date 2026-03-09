"use client"

import { Text, VStack } from "@chakra-ui/react"
import { useVechainDomain } from "@vechain/vechain-kit"
import { useSearchParams } from "next/navigation"

import { RelayerDetailContent, RelayerDetailHeader, RelayerDetailSkeleton } from "@/components/RelayerDetail"
import { useReportData } from "@/hooks/useReportData"
import { buildRoundRewardsContext, computeRelayerSummary, isRelayerActive } from "@/lib/relayer-utils"

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export default function RelayerDetailPage() {
  const searchParams = useSearchParams()
  const addressOrDomain = searchParams.get("address") ?? ""

  const isDomain = addressOrDomain.length > 0 && !isAddress(addressOrDomain)
  const { data: domainData, isLoading: domainLoading } = useVechainDomain(
    isDomain ? addressOrDomain : undefined,
  )

  const resolvedAddress = isDomain ? domainData?.address?.toLowerCase() : addressOrDomain.toLowerCase()

  const { data: report, isLoading: reportLoading } = useReportData()

  if (!addressOrDomain) {
    return (
      <VStack w="full" align="stretch" gap="4">
        <Text color="status.negative.primary" textStyle="sm">
          {"No relayer address provided."}
        </Text>
      </VStack>
    )
  }

  if (reportLoading || (isDomain && domainLoading)) {
    return <RelayerDetailSkeleton />
  }

  if (isDomain && !resolvedAddress) {
    return (
      <VStack w="full" align="stretch" gap="4">
        <Text color="status.negative.primary" textStyle="sm">
          {"Could not resolve VET domain: "}
          {addressOrDomain}
        </Text>
      </VStack>
    )
  }

  if (!resolvedAddress) {
    return (
      <VStack w="full" align="stretch" gap="4">
        <Text color="status.negative.primary" textStyle="sm">
          {"Invalid address or domain."}
        </Text>
      </VStack>
    )
  }

  const relayer = report?.relayers?.find(r => r.address.toLowerCase() === resolvedAddress)
  const currentRound = report?.currentRound ?? 0

  // Build a minimal relayer object if not found in report (newly registered, no activity yet)
  const relayerData = relayer ?? { address: resolvedAddress, rounds: [] }
  const roundCtx = report ? buildRoundRewardsContext(report) : undefined
  const summary = computeRelayerSummary(relayerData, roundCtx)
  const active = isRelayerActive(summary, currentRound)

  return (
    <VStack w="full" align="stretch" gap="6">
      <RelayerDetailHeader address={resolvedAddress} isActive={active} />
      <RelayerDetailContent relayer={relayerData} currentRound={currentRound} roundCtx={roundCtx} />
    </VStack>
  )
}
