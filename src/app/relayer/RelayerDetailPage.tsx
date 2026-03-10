"use client";

import { Button, HStack, Text, VStack } from "@chakra-ui/react";
import {
  useConnectModal,
  useVechainDomain,
  useWallet,
} from "@vechain/vechain-kit";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LuArrowLeft, LuWallet } from "react-icons/lu";

import {
  RelayerDetailContent,
  RelayerDetailHeader,
  RelayerDetailSkeleton,
  UnclaimedRewardsBanner,
} from "@/components/RelayerDetail";
import { useReportData } from "@/hooks/useReportData";
import { useUnclaimedRelayerRewards } from "@/hooks/useUnclaimedRelayerRewards";
import {
  buildRoundRewardsContext,
  computeRelayerSummary,
  isRelayerActive,
} from "@/lib/relayer-utils";
import { BecomeRelayerCard } from "@/components/RelayerInfo";
import NextLink from "next/link";

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export default function RelayerDetailPage() {
  const { t } = useTranslation();
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

  const relayer = report?.relayers?.find(
    (r) => r.address.toLowerCase() === (resolvedAddress ?? ""),
  );
  const relayerData = relayer ?? {
    address: resolvedAddress ?? "",
    rounds: [],
  };
  const roundCtx = report ? buildRoundRewardsContext(report) : undefined;

  const unclaimed = useUnclaimedRelayerRewards(
    relayerData,
    report?.rounds ?? [],
  );

  if (!addressOrDomain) {
    return (
      <VStack w="full" align="center" gap="4" py="16">
        <Text color="text.subtle" textStyle="sm">
          {t("Connect your wallet to view your relayer dashboard.")}
        </Text>
        <Button
          variant="outline"
          size="md"
          rounded="full"
          onClick={() => openConnect()}
        >
          <LuWallet />
          {t("Connect Wallet")}
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
          {t("Could not resolve VET domain: ")}
          {addressOrDomain}
        </Text>
      </VStack>
    );
  }

  if (!resolvedAddress) {
    return (
      <VStack w="full" align="stretch" gap="4">
        <Text color="status.negative.primary" textStyle="sm">
          {t("Invalid address or domain.")}
        </Text>
      </VStack>
    );
  }

  const currentRound = report?.currentRound ?? 0;
  const summary = computeRelayerSummary(relayerData, roundCtx);
  const active = isRelayerActive(summary, currentRound);
  const isOwnRelayer = account?.address?.toLowerCase() === resolvedAddress;

  return (
    <VStack w="full" align="stretch" gap="6">
      <HStack>
        <NextLink href="/relayers">
          <Button variant="ghost" size="sm">
            <LuArrowLeft />
            {t("Back to relayers")}
          </Button>
        </NextLink>
      </HStack>
      {isOwnRelayer && unclaimed.hasUnclaimed && (
        <UnclaimedRewardsBanner
          rounds={unclaimed.rounds}
          totalAmountRaw={unclaimed.totalAmountRaw}
          relayerAddress={resolvedAddress}
          onClaimed={unclaimed.invalidate}
        />
      )}
      <RelayerDetailHeader
        address={resolvedAddress}
        isActive={active}
        isOwnRelayer={isOwnRelayer}
      />

      <RelayerDetailContent
        relayer={relayerData}
        currentRound={currentRound}
        reportRounds={report?.rounds}
        roundCtx={roundCtx}
      />
      {!isOwnRelayer && <BecomeRelayerCard mt={8} forceBanner />}
    </VStack>
  );
}
