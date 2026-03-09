import type { RoundAnalytics } from "./types"

/**
 * For the current (active) round, the contract's totalWeightedActions includes
 * claiming weight (weight=1) that can't be completed until the NEXT round.
 * Voting has weight 3, claiming has weight 1, so a fully-voted current round
 * shows ~75% (300/400) even though the relayer has done all achievable work.
 *
 * This function returns a corrected completion percentage:
 * - Ended rounds: uses contract's completedActions / expectedActions (accurate)
 * - Active rounds: uses voting completion (votedForCount / eligible users)
 */
export function computeRoundCompletion(round: RoundAnalytics): number {
  if (round.isRoundEnded) {
    return round.expectedActions > 0
      ? Math.round((round.completedActions / round.expectedActions) * 100)
      : 0
  }

  const eligible = round.autoVotingUsersCount - round.reducedUsersCount
  if (eligible <= 0) return round.autoVotingUsersCount === 0 ? 0 : 100
  return Math.min(100, Math.round((round.votedForCount / eligible) * 100))
}

export function getRoundPhaseLabel(round: RoundAnalytics): string {
  if (round.isRoundEnded) return "Round ended"
  if (round.autoVotingUsersCount === 0) return "No users"
  if (round.allActionsOk) return "All tasks done"
  return "Voting in progress"
}
