"use client";

import { useMemo } from "react";

import { useReportData } from "@/hooks/useReportData";
import type { RelayerAnalytics } from "@/lib/types";
import {
  buildRoundRewardsContext,
  computeRelayerSummary,
  computeRelayersOverview,
  getLockedRoundIds,
} from "@/lib/relayer-utils";
import type { RelayerSummary } from "@/lib/relayer-utils";

const ZERO_SUMMARY: Omit<RelayerSummary, "address"> = {
  totalActions: 0,
  totalVotedFor: 0,
  totalRewardsClaimed: 0,
  totalWeightedActions: 0,
  totalB3trEarnedRaw: "0",
  totalVthoSpentRaw: "0",
  lastActiveRound: null,
  activeRoundsCount: 0,
};

/**
 * Centralized hook for report-derived relayer data. All relayer summaries
 * (B3TR earned, VTHO spent, etc.) are computed here with the same rules:
 * - Locked round rewards are excluded from total B3TR earned.
 * - Round context is used for proportional B3TR share when available.
 *
 * Use this hook everywhere we display relayer stats so numbers stay consistent
 * (e.g. Top Relayers, Relayers list, Relayer detail page).
 */
export function useRelayerReportDerived() {
  const { data: report, isLoading, error } = useReportData();

  const { overview, summaryByAddress, roundCtx, lockedRoundIds, getRelayerSummary } =
    useMemo(() => {
      if (!report) {
        return {
          overview: null,
          summaryByAddress: new Map<string, RelayerSummary>(),
          roundCtx: undefined,
          lockedRoundIds: new Set<number>(),
          getRelayerSummary: (_: RelayerAnalytics | string): RelayerSummary | null =>
            null,
        };
      }

      const roundCtx = buildRoundRewardsContext(report);
      const lockedRoundIds = getLockedRoundIds(report.rounds ?? []);
      const overview = computeRelayersOverview(report);
      const summaryByAddress = new Map<string, RelayerSummary>();
      for (const s of overview.summaries) {
        summaryByAddress.set(s.address.toLowerCase(), s);
      }

      function getRelayerSummary(relayerOrAddress: RelayerAnalytics | string): RelayerSummary | null {
        const address =
          typeof relayerOrAddress === "string"
            ? relayerOrAddress
            : relayerOrAddress.address;
        const key = address.toLowerCase();
        const found = summaryByAddress.get(key);
        if (found) return found;
        if (typeof relayerOrAddress === "string") {
          return { ...ZERO_SUMMARY, address: address };
        }
        return computeRelayerSummary(relayerOrAddress, roundCtx, lockedRoundIds);
      }

      return {
        overview,
        summaryByAddress,
        roundCtx,
        lockedRoundIds,
        getRelayerSummary,
      };
    }, [report]);

  return {
    report,
    isLoading,
    error,
    overview,
    roundCtx,
    lockedRoundIds,
    getRelayerSummary,
  };
}
