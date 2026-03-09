"use client";

import { Button, Text, VStack } from "@chakra-ui/react";
import { useConnectModal, useVechainDomain, useWallet } from "@vechain/vechain-kit";
import { useSearchParams } from "next/navigation";
import { LuWallet } from "react-icons/lu";

import {
  RelayerDetailContent,
  RelayerDetailHeader,
  RelayerDetailSkeleton,
} from "@/components/RelayerDetail";
import { useReportData } from "@/hooks/useReportData";
import {
  buildRoundRewardsContext,
  computeRelayerSummary,
  isRelayerActive,
} from "@/lib/relayer-utils";
import { BecomeRelayerCard } from "@/components/RelayerInfo";

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export default function RelayerDetailPage() {
  const searchParams = useSearchParams();
  const { account } = useWallet();
  const addressParam = searchParams.get("address") ?? "";
  // If no address param, show the connected wallet's relayer page
  const addressOrDomain = addressParam || account?.address || "";

  const isDomain = addressOrDomain.length > 0 && !isAddress(addressOrDomain);
  const { data: domainData, isLoading: domainLoading } = useVechainDomain(
    isDomain ? addressOrDomain : undefined,
  );

  const resolvedAddress = isDomain
    ? domainData?.address?.toLowerCase()
    : addressOrDomain.toLowerCase();

  const { open: openConnect } = useConnectModal();
  const { data: report, isLoading: reportLoading } = useReportData();

  if (!addressOrDomain) {
    return (
      <VStack w="full" align="center" gap="4" py="16">
        <Text color="text.subtle" textStyle="sm">
          {"Connect your wallet to view your relayer dashboard."}
        </Text>
        <Button variant="outline" size="md" rounded="full" onClick={() => openConnect()}>
          <LuWallet />
          {"Connect Wallet"}
        </Button>
      </VStack>
    );
  }

  if (reportLoading || (isDomain && domainLoading)) {
    return <RelayerDetailSkeleton />;
  }

  if (isDomain && !resolvedAddress) {
    return (
      <VStack w="full" align="stretch" gap="4">
        <Text color="status.negative.primary" textStyle="sm">
          {"Could not resolve VET domain: "}
          {addressOrDomain}
        </Text>
      </VStack>
    );
  }

  if (!resolvedAddress) {
    return (
      <VStack w="full" align="stretch" gap="4">
        <Text color="status.negative.primary" textStyle="sm">
          {"Invalid address or domain."}
        </Text>
      </VStack>
    );
  }

  const relayer = report?.relayers?.find(
    (r) => r.address.toLowerCase() === resolvedAddress,
  );
  const currentRound = report?.currentRound ?? 0;

  // Build a minimal relayer object if not found in report (newly registered, no activity yet)
  const relayerData = relayer ?? { address: resolvedAddress, rounds: [] };
  const roundCtx = report ? buildRoundRewardsContext(report) : undefined;
  const summary = computeRelayerSummary(relayerData, roundCtx);
  const active = isRelayerActive(summary, currentRound);
  const isOwnRelayer = account?.address?.toLowerCase() === resolvedAddress;

  return (
    <VStack w="full" align="stretch" gap="6">
      <RelayerDetailHeader address={resolvedAddress} isActive={active} />
      <RelayerDetailContent
        relayer={relayerData}
        currentRound={currentRound}
        roundCtx={roundCtx}
      />
      {!isOwnRelayer && <BecomeRelayerCard mt={8} forceBanner />}
    </VStack>
  );
}
