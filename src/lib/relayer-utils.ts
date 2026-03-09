"use client"

import { formatEther } from "viem"

import type { AnalyticsReport, RelayerAnalytics } from "./types"

export interface RelayerSummary {
  address: string
  totalActions: number
  totalVotedFor: number
  totalRewardsClaimed: number
  totalWeightedActions: number
  totalB3trEarnedRaw: string
  totalVthoSpentRaw: string
  lastActiveRound: number | null
  activeRoundsCount: number
}

/**
 * Build a context needed for proportional B3TR share calculation.
 * For each round: maps roundId -> { totalRelayerRewardsRaw, totalWeightedActions across all relayers }.
 */
export function buildRoundRewardsContext(report: AnalyticsReport): Map<number, { poolRaw: bigint; totalWeighted: number }> {
  const ctx = new Map<number, { poolRaw: bigint; totalWeighted: number }>()

  // Round-level pool amounts
  for (const rd of report.rounds) {
    ctx.set(rd.roundId, { poolRaw: BigInt(rd.totalRelayerRewardsRaw), totalWeighted: 0 })
  }

  // Sum weighted actions across all relayers per round
  for (const relayer of report.relayers ?? []) {
    for (const rd of relayer.rounds) {
      const entry = ctx.get(rd.roundId)
      if (entry) {
        entry.totalWeighted += rd.weightedActions
      }
    }
  }

  return ctx
}

/** Compute a single relayer's proportional B3TR share for a round. */
export function computeRelayerRoundB3tr(
  relayerWeighted: number,
  roundCtx: { poolRaw: bigint; totalWeighted: number } | undefined,
): bigint {
  if (!roundCtx || roundCtx.totalWeighted === 0 || relayerWeighted === 0) return BigInt(0)
  return (roundCtx.poolRaw * BigInt(relayerWeighted)) / BigInt(roundCtx.totalWeighted)
}

/** Compute summary stats for a single relayer from their round breakdowns. */
export function computeRelayerSummary(
  relayer: RelayerAnalytics,
  roundCtx?: Map<number, { poolRaw: bigint; totalWeighted: number }>,
): RelayerSummary {
  let totalActions = 0
  let totalVotedFor = 0
  let totalRewardsClaimed = 0
  let totalWeightedActions = 0
  let totalB3trEarned = BigInt(0)
  let totalVthoSpent = BigInt(0)
  let lastActiveRound: number | null = null

  for (const rd of relayer.rounds) {
    totalActions += rd.actions
    totalVotedFor += rd.votedForCount
    totalRewardsClaimed += rd.rewardsClaimedCount
    totalWeightedActions += rd.weightedActions
    // Use proportional share from round pool when context available, else fall back to claimableRewards
    totalB3trEarned += roundCtx
      ? computeRelayerRoundB3tr(rd.weightedActions, roundCtx.get(rd.roundId))
      : BigInt(rd.claimableRewardsRaw)
    totalVthoSpent += BigInt(rd.vthoSpentOnVotingRaw) + BigInt(rd.vthoSpentOnClaimingRaw)
    if (rd.actions > 0 && (lastActiveRound == null || rd.roundId > lastActiveRound)) {
      lastActiveRound = rd.roundId
    }
  }

  return {
    address: relayer.address,
    totalActions,
    totalVotedFor,
    totalRewardsClaimed,
    totalWeightedActions,
    totalB3trEarnedRaw: totalB3trEarned.toString(),
    totalVthoSpentRaw: totalVthoSpent.toString(),
    lastActiveRound,
    activeRoundsCount: relayer.rounds.filter(rd => rd.actions > 0).length,
  }
}

/** Check if a relayer was active in any of the last N rounds. */
export function isRelayerActive(summary: RelayerSummary, currentRound: number, windowSize = 3): boolean {
  if (summary.lastActiveRound == null) return false
  return summary.lastActiveRound >= currentRound - windowSize + 1
}

/** Compute overview stats from all relayers in the report. */
export function computeRelayersOverview(report: AnalyticsReport) {
  const roundCtx = buildRoundRewardsContext(report)
  const summaries = (report.relayers ?? []).map(r => computeRelayerSummary(r, roundCtx))
  const currentRound = report.currentRound

  // Sum total B3TR from round-level pool data (total rewards generated, not just claimed)
  let totalB3trDistributed = BigInt(0)
  for (const rd of report.rounds) {
    totalB3trDistributed += BigInt(rd.totalRelayerRewardsRaw)
  }

  let totalVthoSpent = BigInt(0)
  for (const s of summaries) {
    totalVthoSpent += BigInt(s.totalVthoSpentRaw)
  }

  return {
    totalRelayers: summaries.length,
    activeRelayers: summaries.filter(s => isRelayerActive(s, currentRound)).length,
    totalB3trDistributedRaw: totalB3trDistributed.toString(),
    totalVthoSpentRaw: totalVthoSpent.toString(),
    summaries,
  }
}

/** Compute ROI for a relayer given a B3TR->VTHO exchange rate. */
export function computeRelayerROI(
  b3trEarnedRaw: string,
  vthoSpentRaw: string,
  b3trToVtho: number | undefined,
): number | null {
  if (b3trToVtho == null || b3trToVtho <= 0) return null
  const b3tr = Number(formatEther(BigInt(b3trEarnedRaw)))
  const vtho = Number(formatEther(BigInt(vthoSpentRaw)))
  if (vtho === 0) return null
  return ((b3tr * b3trToVtho) / vtho) * 100
}
