"use client"

import { useMemo } from "react"

import { computeRelayerRoundB3tr } from "@/lib/relayer-utils"
import type { RelayerAnalytics, RoundAnalytics } from "@/lib/types"

export interface UnclaimedRound {
  roundId: number
  amountRaw: string
}

export interface UnclaimedRelayerRewards {
  rounds: UnclaimedRound[]
  totalAmountRaw: string
  hasUnclaimed: boolean
}

/**
 * Derives unclaimed relayer reward rounds from report data.
 *
 * A round is "unclaimed" when:
 *  - The relayer performed work (weightedActions > 0)
 *  - The relayer has NOT yet claimed (relayerRewardsClaimedRaw === "0")
 *  - The round is ended AND all actions were completed (pool is unlocked)
 */
export function useUnclaimedRelayerRewards(
  relayer: RelayerAnalytics,
  reportRounds: RoundAnalytics[],
  roundCtx?: Map<number, { poolRaw: bigint; totalWeighted: number }>,
): UnclaimedRelayerRewards {
  return useMemo(() => {
    const roundStatusMap = new Map(
      reportRounds.map((r) => [r.roundId, r]),
    )

    const unclaimed: UnclaimedRound[] = []
    let totalRaw = BigInt(0)

    for (const rd of relayer.rounds) {
      if (rd.weightedActions <= 0) continue
      if (BigInt(rd.relayerRewardsClaimedRaw ?? "0") > BigInt(0)) continue

      const globalRound = roundStatusMap.get(rd.roundId)
      if (!globalRound?.isRoundEnded || !globalRound?.allActionsOk) continue

      let amount = BigInt(rd.claimableRewardsRaw || "0")
      if (amount <= BigInt(0) && roundCtx) {
        amount = computeRelayerRoundB3tr(
          rd.weightedActions,
          roundCtx.get(rd.roundId),
        )
      }
      if (amount <= BigInt(0)) continue

      unclaimed.push({ roundId: rd.roundId, amountRaw: amount.toString() })
      totalRaw += amount
    }

    unclaimed.sort((a, b) => a.roundId - b.roundId)

    return {
      rounds: unclaimed,
      totalAmountRaw: totalRaw.toString(),
      hasUnclaimed: unclaimed.length > 0,
    }
  }, [relayer.rounds, reportRounds, roundCtx])
}
