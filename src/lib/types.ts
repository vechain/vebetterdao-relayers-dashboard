export interface RoundAnalytics {
  roundId: number;
  autoVotingUsersCount: number;
  votedForCount: number;
  /** Users for whom the relayer attempted a vote but it was skipped (invalid vote). */
  invalidVotesCount: number;
  rewardsClaimedCount: number;
  totalRelayerRewards: string;
  totalRelayerRewardsRaw: string;
  estimatedRelayerRewards: string;
  estimatedRelayerRewardsRaw: string;
  numRelayers: number;
  vthoSpentOnVoting: string;
  vthoSpentOnVotingRaw: string;
  vthoSpentOnClaiming: string;
  vthoSpentOnClaimingRaw: string;
  vthoSpentTotal: string;
  vthoSpentTotalRaw: string;
  expectedActions: number;
  completedActions: number;
  reducedUsersCount: number;
  missedUsersCount: number;
  allActionsOk: boolean;
  actionStatus: string;
  isRoundEnded: boolean;
  /** Delegated citizens at round snapshot. 0 for rounds before navigators. */
  citizenUsersCount?: number;
  citizenVotedForCount?: number;
  citizenGovernanceVotedForCount?: number;
  citizenRewardsClaimedCount?: number;
  /** NavigatorVoteSkipped + NavigatorGovernanceVoteSkipped */
  citizenSkippedVotesCount?: number;
  activeGovernanceProposals?: number;
  vthoSpentOnCitizenVotingRaw?: string;
  vthoSpentOnCitizenClaimingRaw?: string;
}

export interface RelayerRoundBreakdown {
  roundId: number;
  votedForCount: number;
  rewardsClaimedCount: number;
  weightedActions: number;
  actions: number;
  claimableRewardsRaw: string;
  relayerRewardsClaimedRaw: string;
  vthoSpentOnVotingRaw: string;
  vthoSpentOnClaimingRaw: string;
  citizenVotedForCount?: number;
  citizenGovernanceVotedForCount?: number;
  citizenRewardsClaimedCount?: number;
  vthoSpentOnCitizenVotingRaw?: string;
  vthoSpentOnCitizenClaimingRaw?: string;
}

export interface RelayerAnalytics {
  address: string;
  rounds: RelayerRoundBreakdown[];
}

export interface AnalyticsReport {
  generatedAt: string;
  network: string;
  firstRound: number;
  currentRound: number;
  rounds: RoundAnalytics[];
  relayers: RelayerAnalytics[];
}
