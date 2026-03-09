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
import { FaAngleRight } from "react-icons/fa6";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { formatNumber, formatToken } from "@/lib/format";
import type { RelayerSummary } from "@/lib/relayer-utils";
import { computeRelayerROI, isRelayerActive } from "@/lib/relayer-utils";

function StatPill({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string;
  value?: string | number;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <VStack gap="0" align="start" minW="0" justifyContent="center">
      <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
        {label}
      </Text>
      {value != null && (
        <HStack gap="1" align="baseline">
          <Text
            textStyle="sm"
            fontWeight="semibold"
            lineClamp={1}
            color={valueColor}
          >
            {value}
          </Text>
          {unit && (
            <Text textStyle="xxs" color="text.subtle">
              {unit}
            </Text>
          )}
        </HStack>
      )}
    </VStack>
  );
}

interface RelayerCardProps {
  summary: RelayerSummary;
  currentRound: number;
}

export function RelayerCard({ summary, currentRound }: RelayerCardProps) {
  const b3trToVtho = useB3trToVthoRate();
  const { data: domain } = useVechainDomain(summary.address);
  const active = isRelayerActive(summary, currentRound);
  const roi = computeRelayerROI(
    summary.totalB3trEarnedRaw,
    summary.totalVthoSpentRaw,
    b3trToVtho,
  );

  const { data: avatarSrc } = useGetAvatarOfAddress(summary.address);

  const displayName =
    domain?.domain ||
    `${summary.address.slice(0, 6)}...${summary.address.slice(-4)}`;
  const shortAddress = `${summary.address.slice(0, 6)}...${summary.address.slice(-4)}`;
  const href = `/relayer?address=${domain?.domain || summary.address}`;

  const avatarSection = avatarSrc ? (
    <Box flexShrink={0}>
      <Image
        src={avatarSrc}
        alt={displayName}
        w="40px"
        h="40px"
        rounded="full"
        objectFit="cover"
        border="2px solid"
        borderColor="border.subtle"
      />
    </Box>
  ) : null;

  const identitySection = (
    <VStack gap="0" align="start" minW="0">
      <HStack gap="2">
        <Text fontWeight="bold" textStyle="sm" lineClamp={1}>
          {displayName}
        </Text>
        <Badge
          size="sm"
          variant="solid"
          colorPalette={active ? "green" : "gray"}
        >
          {active ? "Active" : "Inactive"}
        </Badge>
      </HStack>
      <Text textStyle="xxs" color="text.subtle" lineClamp={1}>
        {domain?.domain
          ? shortAddress
          : `${summary.address.slice(0, 10)}...${summary.address.slice(-6)}`}
      </Text>
    </VStack>
  );

  const stats = (
    <>
      <StatPill
        label="Total actions"
        value={formatNumber(summary.totalActions)}
      />
      <StatPill
        label="B3TR earned"
        value={formatToken(summary.totalB3trEarnedRaw)}
        unit="B3TR"
      />
      <StatPill
        label="VTHO spent"
        value={formatToken(summary.totalVthoSpentRaw)}
        unit="VTHO"
      />
      <StatPill
        label="ROI"
        value={roi != null ? `${formatNumber(Math.round(roi))}%` : "-"}
        valueColor={roi != null ? "status.positive.primary" : undefined}
      />
      <StatPill
        label="Last active"
        value={
          summary.lastActiveRound != null ? `#${summary.lastActiveRound}` : "-"
        }
      />
    </>
  );

  return (
    <NextLink href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Card.Root variant="action">
        <Card.Body>
          {/* Desktop */}
          <Box hideBelow="md">
            <HStack justify="space-between" w="full" gap="2">
              <SimpleGrid columns={7} gap="4" w="full" alignItems="center">
                <HStack gridColumn="span 2" gap="3" minW="0">
                  {avatarSection}
                  {identitySection}
                </HStack>
                {stats}
              </SimpleGrid>
              <IconButton aria-label="View relayer" variant="ghost" size="sm">
                <FaAngleRight />
              </IconButton>
            </HStack>
          </Box>

          {/* Mobile */}
          <Box hideFrom="md">
            <VStack gap="3" align="stretch" w="full">
              <HStack justify="space-between" w="full">
                <HStack gap="3" minW="0" flex="1">
                  {avatarSection}
                  {identitySection}
                </HStack>
                <IconButton aria-label="View relayer" variant="ghost" size="sm">
                  <FaAngleRight />
                </IconButton>
              </HStack>
              <SimpleGrid columns={{ base: 2, sm: 3 }} gap="2">
                {stats}
              </SimpleGrid>
            </VStack>
          </Box>
        </Card.Body>
      </Card.Root>
    </NextLink>
  );
}
