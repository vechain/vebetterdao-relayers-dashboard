"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThor } from "@vechain/vechain-kit";
import { encodeFunctionData, decodeFunctionResult } from "viem";

import { relayerPoolAbi, relayerPoolAddress } from "./contracts";
import type { RelayerAnalytics, RoundAnalytics } from "@/lib/types";

export interface UnclaimedRound {
  roundId: number;
  amountRaw: string;
}

export interface UnclaimedRelayerRewards {
  rounds: UnclaimedRound[];
  totalAmountRaw: string;
  hasUnclaimed: boolean;
  invalidate: () => void;
}

/**
 * Returns unclaimed relayer reward rounds verified on-chain.
 *
 * Uses the report to find candidate rounds (relayer did work, round ended,
 * all actions complete), then verifies each via the on-chain `claimableRewards`
 * view function. This ensures the banner disappears once rewards are claimed,
 * regardless of how stale the static report.json is.
 */
export function useUnclaimedRelayerRewards(
  relayer: RelayerAnalytics,
  reportRounds: RoundAnalytics[],
): UnclaimedRelayerRewards {
  const thor = useThor();
  const queryClient = useQueryClient();

  // Step 1: derive candidate round IDs from report (cheap, in-memory)
  const candidateRoundIds = useMemo(() => {
    const roundStatusMap = new Map(reportRounds.map((r) => [r.roundId, r]));
    const ids: number[] = [];

    for (const rd of relayer.rounds) {
      if (rd.weightedActions <= 0) continue;

      const globalRound = roundStatusMap.get(rd.roundId);
      if (!globalRound?.isRoundEnded || !globalRound?.allActionsOk) continue;
      if (globalRound.completedActions < globalRound.expectedActions) continue;

      ids.push(rd.roundId);
    }

    return ids.sort((a, b) => a - b);
  }, [relayer.rounds, reportRounds]);

  const relayerAddress = relayer.address as `0x${string}`;

  // Step 2: batch-verify on-chain via simulate (single RPC call)
  const queryKey = [
    "unclaimed-relayer-rewards",
    relayerAddress,
    candidateRoundIds.join(","),
  ];

  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<UnclaimedRound[]> => {
      if (candidateRoundIds.length === 0) return [];

      const clauses = candidateRoundIds.map((roundId) => ({
        to: relayerPoolAddress,
        value: "0x0",
        data: encodeFunctionData({
          abi: relayerPoolAbi,
          functionName: "claimableRewards",
          args: [relayerAddress, BigInt(roundId)],
        }),
      }));

      const results = await thor.transactions.simulateTransaction(clauses);

      const unclaimed: UnclaimedRound[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        if (result.reverted) continue;

        const amount = decodeFunctionResult({
          abi: relayerPoolAbi,
          functionName: "claimableRewards",
          data: result.data as `0x${string}`,
        }) as bigint;

        if (amount > 0n) {
          unclaimed.push({
            roundId: candidateRoundIds[i]!,
            amountRaw: amount.toString(),
          });
        }
      }

      return unclaimed;
    },
    enabled: candidateRoundIds.length > 0 && !!thor,
    staleTime: 60_000,
  });

  const rounds = data ?? [];
  const totalAmountRaw = rounds
    .reduce((sum, r) => sum + BigInt(r.amountRaw), 0n)
    .toString();

  return {
    rounds,
    totalAmountRaw,
    hasUnclaimed: rounds.length > 0,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}
