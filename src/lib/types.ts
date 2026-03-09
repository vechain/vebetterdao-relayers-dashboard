export interface RoundAnalytics {
  roundId: number
  autoVotingUsersCount: number
  votedForCount: number
  rewardsClaimedCount: number
  totalRelayerRewards: string
  totalRelayerRewardsRaw: string
  estimatedRelayerRewards: string
  estimatedRelayerRewardsRaw: string
  numRelayers: number
  vthoSpentOnVoting: string
  vthoSpentOnVotingRaw: string
  vthoSpentOnClaiming: string
  vthoSpentOnClaimingRaw: string
  vthoSpentTotal: string
  vthoSpentTotalRaw: string
  expectedActions: number
  completedActions: number
  reducedUsersCount: number
  missedUsersCount: number
  allActionsOk: boolean
  actionStatus: string
  isRoundEnded: boolean
}

export interface RelayerRoundBreakdown {
  roundId: number
  votedForCount: number
  rewardsClaimedCount: number
  weightedActions: number
  actions: number
  claimableRewardsRaw: string
  vthoSpentOnVotingRaw: string
  vthoSpentOnClaimingRaw: string
}

export interface RelayerAnalytics {
  address: string
  rounds: RelayerRoundBreakdown[]
}

export interface AnalyticsReport {
  generatedAt: string
  network: string
  firstRound: number
  currentRound: number
  rounds: RoundAnalytics[]
  relayers: RelayerAnalytics[]
}
