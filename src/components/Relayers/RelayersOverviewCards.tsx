"use client";

import {
  Box,
  Card,
  HStack,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { useTranslation } from "react-i18next";
import { LuActivity, LuFlame } from "react-icons/lu";

import { useRelayerReportDerived } from "@/hooks/useRelayerReportDerived";
import { formatNumber, formatToken } from "@/lib/format";

function StatItem({
  label,
  value,
  sublabel,
  icon,
  isLoading,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: IconType;
  isLoading?: boolean;
}) {
  return (
    <Card.Root p={{ base: "4", md: "6" }} variant="outline">
      <VStack flex={1} alignItems="start" gap="1">
        <HStack w="full" justifyContent="space-between" alignItems="center">
          <Text
            textStyle={{ base: "xs", md: "sm" }}
            color="text.subtle"
            lineClamp={1}
          >
            {label}
          </Text>
          <Box
            as="span"
            color="text.subtle"
            fontSize={{ base: "16px", md: "20px" }}
            lineHeight="1"
          >
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
  );
}

export function RelayersOverviewCards() {
  const { t } = useTranslation();
  const { overview, isLoading: reportLoading } = useRelayerReportDerived();

  return (
    <SimpleGrid w="full" columns={{ base: 1, md: 2 }} gap="4">
      <StatItem
        label={t("Active relayers")}
        value={
          reportLoading
            ? "..."
            : overview
              ? formatNumber(overview.activeRelayers)
              : "\u2014"
        }
        sublabel={t("in last 3 rounds")}
        icon={LuActivity}
        isLoading={reportLoading}
      />
      <StatItem
        label={t("VTHO spent")}
        value={
          reportLoading
            ? "..."
            : overview
              ? `${formatToken(overview.totalVthoSpentRaw)} VTHO`
              : "\u2014"
        }
        sublabel={t("for gas costs")}
        icon={LuFlame}
        isLoading={reportLoading}
      />
    </SimpleGrid>
  );
}
