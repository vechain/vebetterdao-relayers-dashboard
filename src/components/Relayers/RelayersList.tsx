"use client";

import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useVechainDomain } from "@vechain/vechain-kit";
import NextLink from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  LuArrowDown,
  LuArrowUp,
  LuChevronsDown,
  LuPlus,
  LuSearch,
} from "react-icons/lu";

import { useB3trToVthoRate } from "@/hooks/useB3trToVthoRate";
import { useReportData } from "@/hooks/useReportData";
import type { RelayerSummary } from "@/lib/relayer-utils";
import {
  buildRoundRewardsContext,
  computeRelayerROI,
  computeRelayerSummary,
  isRelayerActive,
} from "@/lib/relayer-utils";

import { RelayerCard } from "./RelayerCard";

const PAGE_SIZE = 10;

type SortField = "actions" | "b3tr" | "vtho" | "roi" | "lastActive";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | "active" | "inactive";

const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: "actions", label: "Actions" },
  { field: "b3tr", label: "B3TR earned" },
  { field: "vtho", label: "VTHO spent" },
  { field: "roi", label: "ROI" },
  { field: "lastActive", label: "Last active" },
];

function getSortValue(
  s: RelayerSummary,
  field: SortField,
  b3trToVtho: number | undefined,
): number {
  switch (field) {
    case "actions":
      return s.totalActions;
    case "b3tr":
      return Number(BigInt(s.totalB3trEarnedRaw) / BigInt(10 ** 14)) / 10000;
    case "vtho":
      return Number(BigInt(s.totalVthoSpentRaw) / BigInt(10 ** 14)) / 10000;
    case "roi":
      return (
        computeRelayerROI(
          s.totalB3trEarnedRaw,
          s.totalVthoSpentRaw,
          b3trToVtho,
        ) ?? -Infinity
      );
    case "lastActive":
      return s.lastActiveRound ?? -Infinity;
  }
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <HStack
      as="button"
      gap="1"
      align="center"
      onClick={onClick}
      cursor="pointer"
      _hover={{ color: "text.primary" }}
      color={active ? "text.primary" : "text.subtle"}
      transition="color 0.15s"
    >
      <Text textStyle="xxs" fontWeight={active ? "bold" : "medium"}>
        {label}
      </Text>
      {active &&
        (dir === "asc" ? <LuArrowUp size={12} /> : <LuArrowDown size={12} />)}
    </HStack>
  );
}

/** Hook that resolves a VET domain to an address for search matching. */
function useSearchAddress(query: string) {
  const isDomain = query.includes(".");
  const { data } = useVechainDomain(isDomain ? query : undefined);
  return isDomain ? data?.address?.toLowerCase() : undefined;
}

export function RelayersList() {
  const { data: report, isLoading, error } = useReportData();
  const b3trToVtho = useB3trToVthoRate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("actions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const resolvedSearchAddress = useSearchAddress(search.trim());

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const summaries = useMemo<RelayerSummary[]>(() => {
    if (!report?.relayers) return [];
    const roundCtx = buildRoundRewardsContext(report);
    return report.relayers.map((r) => computeRelayerSummary(r, roundCtx));
  }, [report]);

  const filtered = useMemo(() => {
    const currentRound = report?.currentRound ?? 0;
    let result = summaries;

    if (statusFilter === "active") {
      result = result.filter((s) => isRelayerActive(s, currentRound));
    } else if (statusFilter === "inactive") {
      result = result.filter((s) => !isRelayerActive(s, currentRound));
    }

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => {
        if (s.address.includes(query)) return true;
        if (resolvedSearchAddress && s.address === resolvedSearchAddress)
          return true;
        return false;
      });
    }

    const multiplier = sortDir === "desc" ? -1 : 1;
    return [...result].sort((a, b) => {
      const va = getSortValue(a, sortField, b3trToVtho);
      const vb = getSortValue(b, sortField, b3trToVtho);
      return (va - vb) * multiplier;
    });
  }, [
    summaries,
    statusFilter,
    search,
    resolvedSearchAddress,
    report?.currentRound,
    sortField,
    sortDir,
    b3trToVtho,
  ]);

  if (error) return null;

  if (isLoading || !report) {
    return (
      <VStack gap="3" align="stretch">
        <Skeleton height="16" rounded="xl" />
        <Skeleton height="16" rounded="xl" />
        <Skeleton height="16" rounded="xl" />
      </VStack>
    );
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <VStack gap="4" align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap="3">
        <Heading size="lg">{"Relayers"}</Heading>
        <NextLink href="/new-relayer">
          <Button variant="primary" size="sm" rounded="full">
            <LuPlus />
            {"Register new relayer"}
          </Button>
        </NextLink>
      </HStack>

      <HStack gap="3" mt={4} flexWrap="wrap" justify={"space-between"}>
        <HStack flex="1" minW="200px" maxW="400px" position="relative">
          <LuSearch
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.5,
            }}
          />
          <Input
            placeholder="Search by address or VET domain..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            pl="10"
            size="sm"
          />
        </HStack>

        <HStack gap="1">
          {(["all", "active", "inactive"] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "subtle" : "ghost"}
              fontWeight={statusFilter === status ? "bold" : "normal"}
              onClick={() => {
                setStatusFilter(status);
                setVisibleCount(PAGE_SIZE);
              }}
              textTransform="capitalize"
            >
              {status}
            </Button>
          ))}
        </HStack>
      </HStack>

      {/* Desktop column headers — aligned with RelayerCard's 7-column grid */}
      <Box mt="4" hideBelow="md" px="5">
        <HStack w="full" gap="2">
          <SimpleGrid columns={7} gap="4" w="full" alignItems="center">
            <Box gridColumn="span 2">
              <Text textStyle="xxs" color="text.subtle" fontWeight="medium">
                {"Relayer"}
              </Text>
            </Box>
            {SORT_COLUMNS.map((col) => (
              <SortableHeader
                key={col.field}
                label={col.label}
                active={sortField === col.field}
                dir={sortDir}
                onClick={() => handleSort(col.field)}
              />
            ))}
          </SimpleGrid>
          {/* Spacer to align with the chevron button in cards */}
          <Box w="8" flexShrink={0} />
        </HStack>
      </Box>

      <Stack gap="3">
        {visible.length === 0 ? (
          <VStack py="12" gap="1">
            <Text color="text.subtle">{"No relayers found"}</Text>
            {search.trim() && (
              <Text textStyle="sm" color="text.subtle">
                {"Try a different address or domain"}
              </Text>
            )}
          </VStack>
        ) : (
          visible.map((summary) => (
            <RelayerCard
              key={summary.address}
              summary={summary}
              currentRound={report.currentRound}
            />
          ))
        )}
      </Stack>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          alignSelf="center"
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
        >
          <LuChevronsDown size={12} />
          {"Load more relayers"}
          <LuChevronsDown size={12} />
        </Button>
      )}
    </VStack>
  );
}
