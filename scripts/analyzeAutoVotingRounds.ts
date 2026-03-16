/**
 * Auto-Voting Round Analytics Script
 *
 * Analyzes auto-voting activity per round since the feature went live (Round 69).
 * Outputs data to console and saves to JSON file.
 *
 * Usage:
 *   cd packages/scripts
 *   yarn analyze-auto-voting
 *   yarn analyze-auto-voting --checkpoint <path> --output <path>
 *
 * Options:
 *   --checkpoint <path>  If file exists, load it and only analyze new/incomplete rounds.
 *   --output <path>      Write report to this path (e.g. apps/relayer-dashboard/public/data/report.json).
 */

import { ThorClient, MAINNET_URL } from "@vechain/sdk-network";
import { ABIContract, Hex } from "@vechain/sdk-core";
import {
  XAllocationVoting__factory,
  VoterRewards__factory,
  RelayerRewardsPool__factory,
  Emissions__factory,
} from "@vechain/vebetterdao-contracts/typechain-types";
import * as fs from "fs";
import * as path from "path";

const mainnetConfig = {
  xAllocationVotingContractAddress:
    "0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7",
  relayerRewardsPoolContractAddress:
    "0x34b56f892c9e977b9ba2e43ba64c27d368ab3c86",
  voterRewardsContractAddress: "0x838A33AF756a6366f93e201423E1425f67eC0Fa7",
  emissionsContractAddress: "0xDf94739bd169C84fe6478D8420Bb807F1f47b135",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(delayMs * Math.pow(2, attempt));
    }
  }
  throw new Error("unreachable");
}

// First round with auto-voting enabled on mainnet
const FIRST_AUTO_VOTING_ROUND = 69;

// Contract addresses from mainnet config
const CONFIG = mainnetConfig;

interface RoundAnalytics {
  roundId: number;
  autoVotingUsersCount: number;
  votedForCount: number;
  rewardsClaimedCount: number;
  totalRelayerRewards: string;
  totalRelayerRewardsRaw: string;
  estimatedRelayerRewards: string; // Estimated from summing getRelayerFee for all voted users
  estimatedRelayerRewardsRaw: string;
  numRelayers: number;
  vthoSpentOnVoting: string;
  vthoSpentOnVotingRaw: string;
  vthoSpentOnClaiming: string;
  vthoSpentOnClaimingRaw: string;
  vthoSpentTotal: string;
  vthoSpentTotalRaw: string;
  // Action verification
  expectedActions: number; // Total weighted actions expected
  completedActions: number; // Total weighted actions completed
  reducedUsersCount: number; // Users legitimately skipped (VOT3→B3TR, invalid passport)
  missedUsersCount: number; // Users actually missed by relayer
  allActionsOk: boolean; // True if all expected work was done
  actionStatus: string; // Human readable status
  isRoundEnded: boolean; // True if the round has ended
}

interface RelayerRoundBreakdown {
  roundId: number;
  votedForCount: number;
  rewardsClaimedCount: number;
  weightedActions: number;
  actions: number;
  claimableRewardsRaw: string;
  relayerRewardsClaimedRaw: string;
  vthoSpentOnVotingRaw: string;
  vthoSpentOnClaimingRaw: string;
}

interface RelayerAnalytics {
  address: string;
  rounds: RelayerRoundBreakdown[];
}

interface AnalyticsReport {
  generatedAt: string;
  network: string;
  firstRound: number;
  currentRound: number;
  rounds: RoundAnalytics[];
  relayers: RelayerAnalytics[];
}

// ============ Contract Helper Functions ============

/**
 * Get the current round ID from XAllocationVoting
 */
async function getCurrentRoundId(
  thor: ThorClient,
  contractAddress: string,
): Promise<number> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const result = await thor.contracts.executeCall(
    contractAddress,
    xAllocationVotingContract.getFunction("currentRoundId"),
    [],
  );

  if (!result.success) {
    throw new Error("Failed to get current round ID");
  }

  return Number(result.result?.array?.[0] ?? 0);
}

/**
 * Get the round snapshot (start block) for a given round
 */
async function getRoundSnapshot(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
): Promise<number> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const result = await thor.contracts.executeCall(
    contractAddress,
    xAllocationVotingContract.getFunction("roundSnapshot"),
    [roundId],
  );

  if (!result.success) {
    throw new Error(`Failed to get round snapshot for round ${roundId}`);
  }

  return Number(result.result?.array?.[0] ?? 0);
}

/**
 * Get the round deadline (end block) for a given round
 */
async function getRoundDeadline(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
): Promise<number> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const result = await thor.contracts.executeCall(
    contractAddress,
    xAllocationVotingContract.getFunction("roundDeadline"),
    [roundId],
  );

  if (!result.success) {
    throw new Error(`Failed to get round deadline for round ${roundId}`);
  }

  return Number(result.result?.array?.[0] ?? 0);
}

/**
 * Check if a round/cycle has ended using Emissions contract
 */
async function isCycleEnded(
  thor: ThorClient,
  emissionsAddress: string,
  roundId: number,
): Promise<boolean> {
  const emissionsContract = ABIContract.ofAbi(Emissions__factory.abi);
  const result = await thor.contracts.executeCall(
    emissionsAddress,
    emissionsContract.getFunction("isCycleEnded"),
    [roundId],
  );

  return result.success ? (result.result?.array?.[0] as boolean) : false;
}

/**
 * Get all users who have auto-voting enabled at a specific block
 * by aggregating AutoVotingToggled events
 */
async function getAllAutoVotingEnabledUsers(
  thor: ThorClient,
  contractAddress: string,
  fromBlock: number,
  toBlock: number,
): Promise<string[]> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const autoVotingToggledEvent = xAllocationVotingContract.getEvent(
    "AutoVotingToggled",
  ) as any;
  const topics = autoVotingToggledEvent.encodeFilterTopicsNoNull({});

  const userStateAtSnapshot = new Map<string, boolean>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  // Paginate through all events
  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: topics[0],
          },
          eventAbi: autoVotingToggledEvent,
        },
      ],
    });

    for (const log of logs) {
      const decodedData = autoVotingToggledEvent.decodeEventLog({
        topics: log.topics.map((topic: string) => Hex.of(topic)),
        data: Hex.of(log.data),
      });
      const walletAddress = decodedData.args.account as string;
      const enabled = decodedData.args.enabled as boolean;
      userStateAtSnapshot.set(walletAddress.toLowerCase(), enabled);
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  // Return only users with enabled status
  return Array.from(userStateAtSnapshot.entries())
    .filter(([, isEnabled]) => isEnabled === true)
    .map(([user]) => user);
}

/**
 * Query AllocationAutoVoteCast events for a specific round with pagination
 * Returns the set of voter addresses that were auto-voted for
 */
async function getAutoVotesForRound(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock: number,
): Promise<Set<string>> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const autoVoteCastEvent = xAllocationVotingContract.getEvent(
    "AllocationAutoVoteCast",
  ) as any;
  const autoVoteSkippedEvent = xAllocationVotingContract.getEvent(
    "AutoVoteSkipped",
  ) as any;

  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  const voters = new Set<string>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: autoVoteCastEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: autoVoteCastEvent,
        },
        {
          criteria: {
            address: contractAddress,
            topic0: autoVoteSkippedEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: autoVoteSkippedEvent,
        },
      ],
    });

    for (const log of logs) {
      const voter = log.topics?.[1];
      if (voter) {
        voters.add(("0x" + voter.slice(26)).toLowerCase());
      }
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return voters;
}

/**
 * Query RelayerFeeTaken events for a specific round (cycle) with pagination
 * Returns the set of voter addresses that had their rewards claimed by the relayer
 */
async function getAutoClaimsForRound(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock?: number,
): Promise<Set<string>> {
  const voterRewardsContract = ABIContract.ofAbi(VoterRewards__factory.abi);
  const relayerFeeTakenEvent = voterRewardsContract.getEvent(
    "RelayerFeeTaken",
  ) as any;

  // Encode cycle (roundId) as topic (indexed parameter)
  const cycleHex = "0x" + roundId.toString(16).padStart(64, "0");

  const voters = new Set<string>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: relayerFeeTakenEvent.encodeFilterTopicsNoNull({})[0],
            topic2: cycleHex,
          },
          eventAbi: relayerFeeTakenEvent,
        },
      ],
    });

    for (const log of logs) {
      const decodedData = relayerFeeTakenEvent.decodeEventLog({
        topics: log.topics.map((topic: string) => Hex.of(topic)),
        data: Hex.of(log.data),
      });
      const voter = decodedData.args.voter as string;
      voters.add(voter.toLowerCase());
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return voters;
}

/**
 * Get total relayer rewards deposited for a specific round
 */
async function getTotalRelayerRewards(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
): Promise<bigint> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );

  const rewardsResult = await thor.contracts.executeCall(
    contractAddress,
    relayerPoolContract.getFunction("getTotalRewards"),
    [roundId],
  );

  const rawRewards = rewardsResult.success
    ? rewardsResult.result?.array?.[0]
    : undefined;
  return rawRewards ? BigInt(String(rawRewards)) : BigInt(0);
}

/**
 * Estimate relayer rewards by summing getRelayerFee for each voted user
 */
async function estimateRelayerRewards(
  thor: ThorClient,
  voterRewardsAddress: string,
  roundId: number,
  votedUsers: Set<string>,
): Promise<bigint> {
  if (votedUsers.size === 0) {
    return BigInt(0);
  }

  const voterRewardsContract = ABIContract.ofAbi(VoterRewards__factory.abi);
  let totalEstimatedFees = BigInt(0);

  const userArray = Array.from(votedUsers);
  const BATCH_SIZE = 50;

  for (let i = 0; i < userArray.length; i += BATCH_SIZE) {
    const batch = userArray.slice(i, i + BATCH_SIZE);

    const feePromises = batch.map(async (user) => {
      const result = await withRetry(() =>
        thor.contracts.executeCall(
          voterRewardsAddress,
          voterRewardsContract.getFunction("getRelayerFee"),
          [roundId, user],
        ),
      );
      if (result.success && result.result?.array?.[0]) {
        return BigInt(String(result.result.array[0]));
      }
      return BigInt(0);
    });

    const fees = await Promise.all(feePromises);
    for (const fee of fees) {
      totalEstimatedFees += fee;
    }

    if (i + BATCH_SIZE < userArray.length) {
      await sleep(300);
    }
  }

  return totalEstimatedFees;
}

/**
 * Get round setup data from TotalAutoVotingActionsSet event.
 * This is the on-chain source of truth for how many auto-voting users
 * the contract counted at the round snapshot via its checkpoint counter.
 */
async function getRoundSetupData(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock: number,
): Promise<{ contractAutoVotingUsersCount: number; numRelayers: number }> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );
  const actionsSetEvent = relayerPoolContract.getEvent(
    "TotalAutoVotingActionsSet",
  ) as any;

  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  const logs = await thor.logs.filterEventLogs({
    range: {
      unit: "block" as const,
      from: fromBlock,
      to: toBlock,
    },
    options: {
      offset: 0,
      limit: 10,
    },
    order: "asc",
    criteriaSet: [
      {
        criteria: {
          address: contractAddress,
          topic0: actionsSetEvent.encodeFilterTopicsNoNull({})[0],
          topic1: roundIdHex,
        },
        eventAbi: actionsSetEvent,
      },
    ],
  });

  if (logs.length === 0) {
    return { contractAutoVotingUsersCount: 0, numRelayers: 0 };
  }

  const decodedData = actionsSetEvent.decodeEventLog({
    topics: logs[0].topics.map((topic: string) => Hex.of(topic)),
    data: Hex.of(logs[0].data),
  });

  return {
    contractAutoVotingUsersCount: Number(
      decodedData.args.totalAutoVoteUsers ?? 0,
    ),
    numRelayers: Number(decodedData.args.numRelayers ?? 0),
  };
}

/**
 * Get action verification data from RelayerRewardsPool contract
 * - totalWeightedActions: Expected weighted actions for the round
 * - completedWeightedActions: Actual weighted actions completed
 * - missedAutoVotingUsersCount: Users that were completely missed
 */
async function getActionVerificationData(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
): Promise<{
  expectedActions: number;
  completedActions: number;
  missedUsersCount: number;
}> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );

  // Get total weighted actions (expected)
  const totalWeightedResult = await thor.contracts.executeCall(
    contractAddress,
    relayerPoolContract.getFunction("totalWeightedActions"),
    [roundId],
  );
  const expectedActions = totalWeightedResult.success
    ? Number(totalWeightedResult.result?.array?.[0] ?? 0)
    : 0;

  // Get completed weighted actions
  const completedWeightedResult = await thor.contracts.executeCall(
    contractAddress,
    relayerPoolContract.getFunction("completedWeightedActions"),
    [roundId],
  );
  const completedActions = completedWeightedResult.success
    ? Number(completedWeightedResult.result?.array?.[0] ?? 0)
    : 0;

  // Get missed auto-voting users count
  const missedResult = await thor.contracts.executeCall(
    contractAddress,
    relayerPoolContract.getFunction("getMissedAutoVotingUsersCount"),
    [roundId],
  );
  const missedUsersCount = missedResult.success
    ? Number(missedResult.result?.array?.[0] ?? 0)
    : 0;

  return { expectedActions, completedActions, missedUsersCount };
}

/**
 * Get count of users legitimately reduced via ExpectedActionsReduced events
 * These are users who couldn't vote (VOT3→B3TR conversion, invalid passport, etc.)
 */
async function getReducedUsersCount(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock?: number,
): Promise<number> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );
  const reducedEvent = relayerPoolContract.getEvent(
    "ExpectedActionsReduced",
  ) as any;

  // Encode roundId as topic (indexed parameter)
  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  let totalReducedUsers = 0;
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: reducedEvent.encodeFilterTopicsNoNull({})[0],
            topic1: roundIdHex,
          },
          eventAbi: reducedEvent,
        },
      ],
    });

    for (const log of logs) {
      const decodedData = reducedEvent.decodeEventLog({
        topics: log.topics.map((topic: string) => Hex.of(topic)),
        data: Hex.of(log.data),
      });
      totalReducedUsers += Number(decodedData.args.userCount ?? 0);
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return totalReducedUsers;
}

/**
 * Get unique transaction IDs from AllocationAutoVoteCast events for a round
 */
async function getVotingTransactionIds(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock: number,
): Promise<Set<string>> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const autoVoteCastEvent = xAllocationVotingContract.getEvent(
    "AllocationAutoVoteCast",
  ) as any;
  const autoVoteSkippedEvent = xAllocationVotingContract.getEvent(
    "AutoVoteSkipped",
  ) as any;
  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  const txIds = new Set<string>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: autoVoteCastEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: autoVoteCastEvent,
        },
        {
          criteria: {
            address: contractAddress,
            topic0: autoVoteSkippedEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: autoVoteSkippedEvent,
        },
      ],
    });

    for (const log of logs) {
      if (log.meta?.txID) {
        txIds.add(log.meta.txID);
      }
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return txIds;
}

/**
 * Get unique transaction IDs from RelayerFeeTaken events for a round
 */
async function getClaimingTransactionIds(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock?: number,
): Promise<Set<string>> {
  const voterRewardsContract = ABIContract.ofAbi(VoterRewards__factory.abi);
  const relayerFeeTakenEvent = voterRewardsContract.getEvent(
    "RelayerFeeTaken",
  ) as any;
  const cycleHex = "0x" + roundId.toString(16).padStart(64, "0");

  const txIds = new Set<string>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: relayerFeeTakenEvent.encodeFilterTopicsNoNull({})[0],
            topic2: cycleHex,
          },
          eventAbi: relayerFeeTakenEvent,
        },
      ],
    });

    for (const log of logs) {
      if (log.meta?.txID) {
        txIds.add(log.meta.txID);
      }
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return txIds;
}

/**
 * Calculate total VTHO spent from a set of transaction IDs
 * VTHO = gasUsed * (baseFee + priorityFee)
 */
async function calculateVthoSpent(
  thor: ThorClient,
  txIds: Set<string>,
): Promise<bigint> {
  let totalVtho = BigInt(0);

  for (const txId of txIds) {
    try {
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      if (receipt) {
        // The receipt.paid field contains the actual VTHO paid
        const paid = BigInt(receipt.paid ?? 0);
        totalVtho += paid;
      }
    } catch (error) {
      // Skip failed receipt fetches
      console.warn(`    Warning: Could not fetch receipt for tx ${txId}`);
    }
  }

  return totalVtho;
}

/**
 * Get all registered relayer addresses from RelayerRewardsPool
 */
async function getRegisteredRelayers(
  thor: ThorClient,
  contractAddress: string,
): Promise<string[]> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );
  const result = await thor.contracts.executeCall(
    contractAddress,
    relayerPoolContract.getFunction("getRegisteredRelayers"),
    [],
  );
  if (!result.success || !result.result?.array?.[0]) return [];
  const relayers = result.result.array[0] as string[];
  return relayers.map((r) => r.toLowerCase());
}

/**
 * Get per-relayer action breakdown for a round from RelayerActionRegistered events.
 * Returns a map: relayerAddress -> { votedForCount, rewardsClaimedCount, weightedActions, actions }
 */
async function getRelayerActionsForRound(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock?: number,
): Promise<
  Map<
    string,
    {
      votedForCount: number;
      rewardsClaimedCount: number;
      weightedActions: number;
      actions: number;
    }
  >
> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );
  const actionEvent = relayerPoolContract.getEvent(
    "RelayerActionRegistered",
  ) as any;
  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  const relayerMap = new Map<
    string,
    {
      votedForCount: number;
      rewardsClaimedCount: number;
      weightedActions: number;
      actions: number;
    }
  >();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: actionEvent.encodeFilterTopicsNoNull({})[0],
            topic3: roundIdHex,
          },
          eventAbi: actionEvent,
        },
      ],
    });

    for (const log of logs) {
      const decodedData = actionEvent.decodeEventLog({
        topics: log.topics.map((topic: string) => Hex.of(topic)),
        data: Hex.of(log.data),
      });
      const relayer = (decodedData.args.relayer as string).toLowerCase();
      const actionCount = Number(decodedData.args.actionCount ?? 0);
      const weight = Number(decodedData.args.weight ?? 0);

      const existing = relayerMap.get(relayer) ?? {
        votedForCount: 0,
        rewardsClaimedCount: 0,
        weightedActions: 0,
        actions: 0,
      };

      existing.actions = Math.max(existing.actions, actionCount);
      existing.weightedActions += weight;

      // Vote actions have weight 3, claim actions have weight 1
      if (weight === 3) {
        existing.votedForCount += 1;
      } else if (weight === 1) {
        existing.rewardsClaimedCount += 1;
      }

      relayerMap.set(relayer, existing);
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) {
      break;
    }
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return relayerMap;
}

/**
 * Get per-relayer VTHO spent on voting for a round.
 * Groups voting transaction receipts by tx.origin (relayer).
 */
async function getPerRelayerVthoSpentOnVoting(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock: number,
): Promise<Map<string, bigint>> {
  const xAllocationVotingContract = ABIContract.ofAbi(
    XAllocationVoting__factory.abi,
  );
  const autoVoteCastEvent = xAllocationVotingContract.getEvent(
    "AllocationAutoVoteCast",
  ) as any;
  const autoVoteSkippedEvent = xAllocationVotingContract.getEvent(
    "AutoVoteSkipped",
  ) as any;
  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  const txSet = new Set<string>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: { unit: "block" as const, from: fromBlock, to: toBlock },
      options: { offset, limit: MAX_EVENTS_PER_REQUEST },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: autoVoteCastEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: autoVoteCastEvent,
        },
        {
          criteria: {
            address: contractAddress,
            topic0: autoVoteSkippedEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: autoVoteSkippedEvent,
        },
      ],
    });

    for (const log of logs) {
      if (log.meta?.txID) txSet.add(log.meta.txID);
    }
    if (logs.length < MAX_EVENTS_PER_REQUEST) break;
    offset += MAX_EVENTS_PER_REQUEST;
  }

  const relayerVtho = new Map<string, bigint>();
  for (const txId of txSet) {
    try {
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      if (receipt) {
        const origin = (receipt.meta?.txOrigin ?? "").toLowerCase();
        const paid = BigInt(receipt.paid ?? 0);
        relayerVtho.set(origin, (relayerVtho.get(origin) ?? BigInt(0)) + paid);
      }
    } catch {
      // skip
    }
  }

  return relayerVtho;
}

/**
 * Get per-relayer VTHO spent on claiming for a round (claims for prevRound during this round).
 */
async function getPerRelayerVthoSpentOnClaiming(
  thor: ThorClient,
  voterRewardsAddress: string,
  prevRoundId: number,
  fromBlock: number,
  toBlock: number,
): Promise<Map<string, bigint>> {
  const voterRewardsContract = ABIContract.ofAbi(VoterRewards__factory.abi);
  const relayerFeeTakenEvent = voterRewardsContract.getEvent(
    "RelayerFeeTaken",
  ) as any;
  const cycleHex = "0x" + prevRoundId.toString(16).padStart(64, "0");

  const txSet = new Set<string>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: { unit: "block" as const, from: fromBlock, to: toBlock },
      options: { offset, limit: MAX_EVENTS_PER_REQUEST },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: voterRewardsAddress,
            topic0: relayerFeeTakenEvent.encodeFilterTopicsNoNull({})[0],
            topic2: cycleHex,
          },
          eventAbi: relayerFeeTakenEvent,
        },
      ],
    });

    for (const log of logs) {
      if (log.meta?.txID) txSet.add(log.meta.txID);
    }
    if (logs.length < MAX_EVENTS_PER_REQUEST) break;
    offset += MAX_EVENTS_PER_REQUEST;
  }

  const relayerVtho = new Map<string, bigint>();
  for (const txId of txSet) {
    try {
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      if (receipt) {
        const origin = (receipt.meta?.txOrigin ?? "").toLowerCase();
        const paid = BigInt(receipt.paid ?? 0);
        relayerVtho.set(origin, (relayerVtho.get(origin) ?? BigInt(0)) + paid);
      }
    } catch {
      // skip
    }
  }

  return relayerVtho;
}

/**
 * Get per-relayer claimable rewards for a round.
 */
async function getPerRelayerClaimableRewards(
  thor: ThorClient,
  contractAddress: string,
  relayerAddresses: string[],
  roundId: number,
): Promise<Map<string, bigint>> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );
  const rewardsMap = new Map<string, bigint>();

  for (const addr of relayerAddresses) {
    const result = await withRetry(() =>
      thor.contracts.executeCall(
        contractAddress,
        relayerPoolContract.getFunction("claimableRewards"),
        [addr, roundId],
      ),
    );
    const val =
      result.success && result.result?.array?.[0]
        ? BigInt(String(result.result.array[0]))
        : BigInt(0);
    if (val > BigInt(0)) {
      rewardsMap.set(addr.toLowerCase(), val);
    }
  }

  return rewardsMap;
}

/**
 * Get per-relayer rewards actually claimed from RelayerRewardsPool via RelayerRewardsClaimed events.
 * Returns a map: relayerAddress -> total amount claimed for the given roundId.
 */
async function getRelayerRewardsClaimed(
  thor: ThorClient,
  contractAddress: string,
  roundId: number,
  fromBlock: number,
  toBlock?: number,
): Promise<Map<string, bigint>> {
  const relayerPoolContract = ABIContract.ofAbi(
    RelayerRewardsPool__factory.abi,
  );
  const claimEvent = relayerPoolContract.getEvent(
    "RelayerRewardsClaimed",
  ) as any;
  const roundIdHex = "0x" + roundId.toString(16).padStart(64, "0");

  const claimedMap = new Map<string, bigint>();
  let offset = 0;
  const MAX_EVENTS_PER_REQUEST = 1000;

  while (true) {
    const logs = await thor.logs.filterEventLogs({
      range: {
        unit: "block" as const,
        from: fromBlock,
        to: toBlock,
      },
      options: {
        offset,
        limit: MAX_EVENTS_PER_REQUEST,
      },
      order: "asc",
      criteriaSet: [
        {
          criteria: {
            address: contractAddress,
            topic0: claimEvent.encodeFilterTopicsNoNull({})[0],
            topic2: roundIdHex,
          },
          eventAbi: claimEvent,
        },
      ],
    });

    for (const log of logs) {
      const decoded = claimEvent.decodeEventLog({
        topics: log.topics.map((t: string) => Hex.of(t)),
        data: Hex.of(log.data),
      });
      const relayer = (decoded.args.relayer as string).toLowerCase();
      const amount = BigInt(decoded.args.amount ?? 0);
      claimedMap.set(relayer, (claimedMap.get(relayer) ?? BigInt(0)) + amount);
    }

    if (logs.length < MAX_EVENTS_PER_REQUEST) break;
    offset += MAX_EVENTS_PER_REQUEST;
  }

  return claimedMap;
}

// ============ Formatting Helpers ============

/**
 * Format token amount (18 decimals) to human readable string
 */
function formatTokenAmount(amountWei: bigint, symbol: string): string {
  const decimals = 18;
  const divisor = BigInt(10 ** decimals);
  const integerPart = amountWei / divisor;
  const fractionalPart = amountWei % divisor;

  // Format with 2 decimal places
  const fractionalStr = fractionalPart
    .toString()
    .padStart(decimals, "0")
    .slice(0, 2);
  return `${integerPart}.${fractionalStr} ${symbol}`;
}

function formatB3TR(amountWei: bigint): string {
  return formatTokenAmount(amountWei, "B3TR");
}

function formatVTHO(amountWei: bigint): string {
  return formatTokenAmount(amountWei, "VTHO");
}

/**
 * Analyze a single round
 */
async function analyzeRound(
  thor: ThorClient,
  roundId: number,
): Promise<RoundAnalytics> {
  console.log(`\n  Analyzing round ${roundId}...`);

  // Get round boundaries
  const roundSnapshot = await getRoundSnapshot(
    thor,
    CONFIG.xAllocationVotingContractAddress,
    roundId,
  );
  const roundDeadline = await getRoundDeadline(
    thor,
    CONFIG.xAllocationVotingContractAddress,
    roundId,
  );

  // Get round setup data from the contract (source of truth for user count)
  const roundSetup = await getRoundSetupData(
    thor,
    CONFIG.relayerRewardsPoolContractAddress,
    roundId,
    roundSnapshot,
    roundDeadline,
  );
  const numRelayers = roundSetup.numRelayers;

  // Get auto-voting users at round start via event scanning
  const autoVotingUsers = await getAllAutoVotingEnabledUsers(
    thor,
    CONFIG.xAllocationVotingContractAddress,
    0,
    roundSnapshot,
  );

  // Verify event-based count matches the contract's checkpoint counter
  const contractUsersCount = roundSetup.contractAutoVotingUsersCount;
  if (
    contractUsersCount > 0 &&
    autoVotingUsers.length !== contractUsersCount
  ) {
    console.warn(
      `    ⚠ USER COUNT MISMATCH: event scan found ${autoVotingUsers.length} users, ` +
        `contract checkpoint has ${contractUsersCount} ` +
        `(delta: ${contractUsersCount - autoVotingUsers.length})`,
    );
  }

  // Use the contract's count as source of truth for autoVotingUsersCount
  // since it's what determines totalWeightedActions on-chain
  const autoVotingUsersCount =
    contractUsersCount > 0 ? contractUsersCount : autoVotingUsers.length;
  console.log(
    `    - Auto-voting users at snapshot: ${autoVotingUsersCount}` +
      (contractUsersCount > 0 &&
      autoVotingUsers.length !== contractUsersCount
        ? ` (event scan: ${autoVotingUsers.length})`
        : ""),
  );

  // Get users who were voted for by relayer
  const votedForUsers = await getAutoVotesForRound(
    thor,
    CONFIG.xAllocationVotingContractAddress,
    roundId,
    roundSnapshot,
    roundDeadline,
  );
  console.log(`    - Users voted for: ${votedForUsers.size}`);

  // Get users who had rewards claimed by relayer
  // Claims happen after the round ends, so we search from deadline onwards
  const claimedUsers = await getAutoClaimsForRound(
    thor,
    CONFIG.voterRewardsContractAddress,
    roundId,
    roundDeadline,
    undefined,
  );
  console.log(`    - Users with rewards claimed: ${claimedUsers.size}`);

  // Get total relayer rewards deposited
  const totalRelayerRewards = await getTotalRelayerRewards(
    thor,
    CONFIG.relayerRewardsPoolContractAddress,
    roundId,
  );
  console.log(
    `    - Total relayer rewards: ${formatB3TR(totalRelayerRewards)}`,
  );

  // Estimate relayer rewards by summing getRelayerFee for all voted users
  const estimatedRelayerRewards = await estimateRelayerRewards(
    thor,
    CONFIG.voterRewardsContractAddress,
    roundId,
    votedForUsers,
  );
  console.log(
    `    - Estimated relayer rewards: ${formatB3TR(estimatedRelayerRewards)}`,
  );
  console.log(`    - Number of relayers: ${numRelayers}`);

  // Get VTHO spent on voting transactions (voting for this round)
  const votingTxIds = await getVotingTransactionIds(
    thor,
    CONFIG.xAllocationVotingContractAddress,
    roundId,
    roundSnapshot,
    roundDeadline,
  );
  const vthoSpentOnVoting = await calculateVthoSpent(thor, votingTxIds);
  console.log(
    `    - VTHO spent on voting (round ${roundId}): ${formatVTHO(vthoSpentOnVoting)} (${votingTxIds.size} txs)`,
  );

  // Get VTHO spent on claiming transactions for PREVIOUS round
  // During round N, we claim rewards for round N-1 (since N-1 just ended)
  const prevRoundId = roundId - 1;
  let vthoSpentOnClaiming = BigInt(0);
  let claimingTxCount = 0;

  if (prevRoundId >= FIRST_AUTO_VOTING_ROUND) {
    const prevRoundDeadline = await getRoundDeadline(
      thor,
      CONFIG.xAllocationVotingContractAddress,
      prevRoundId,
    );
    const claimingTxIds = await getClaimingTransactionIds(
      thor,
      CONFIG.voterRewardsContractAddress,
      prevRoundId, // Claims for previous round
      prevRoundDeadline,
      roundDeadline, // Limit to transactions during this round's period
    );
    vthoSpentOnClaiming = await calculateVthoSpent(thor, claimingTxIds);
    claimingTxCount = claimingTxIds.size;
    console.log(
      `    - VTHO spent on claiming (round ${prevRoundId}): ${formatVTHO(vthoSpentOnClaiming)} (${claimingTxCount} txs)`,
    );
  } else {
    console.log(`    - VTHO spent on claiming: N/A (first auto-voting round)`);
  }

  const vthoSpentTotal = vthoSpentOnVoting + vthoSpentOnClaiming;
  console.log(
    `    - Total VTHO spent this round: ${formatVTHO(vthoSpentTotal)}`,
  );

  // Get action verification data from contract
  const verificationData = await getActionVerificationData(
    thor,
    CONFIG.relayerRewardsPoolContractAddress,
    roundId,
  );
  console.log(`    - Expected actions: ${verificationData.expectedActions}`);
  console.log(`    - Completed actions: ${verificationData.completedActions}`);

  // Get count of legitimately reduced users (VOT3→B3TR, invalid passport, etc.)
  const reducedUsersCount = await getReducedUsersCount(
    thor,
    CONFIG.relayerRewardsPoolContractAddress,
    roundId,
    roundSnapshot,
    undefined,
  );
  console.log(`    - Reduced users (legit skips): ${reducedUsersCount}`);

  // Check if round has ended
  const isRoundEnded = await isCycleEnded(
    thor,
    CONFIG.emissionsContractAddress,
    roundId,
  );
  console.log(`    - Round ended: ${isRoundEnded ? "Yes" : "No"}`);

  // Status check: voting + claiming completion
  const expectedToVote = autoVotingUsersCount - reducedUsersCount;
  const votingComplete = votedForUsers.size >= expectedToVote;
  const missedVotes = expectedToVote - votedForUsers.size;

  // For ended rounds, use on-chain action counters (includes both votes AND claims)
  // For active rounds, only voting is expected — claiming happens after the round ends
  const allActionsOk = isRoundEnded
    ? verificationData.completedActions >= verificationData.expectedActions
    : votingComplete;

  let actionStatus: string;
  if (autoVotingUsersCount === 0) {
    actionStatus = "N/A";
  } else if (votingComplete) {
    if (isRoundEnded && !allActionsOk) {
      const missedClaims = Math.max(0, expectedToVote - claimedUsers.size);
      actionStatus = `⚠ ${missedClaims} claims missing`;
    } else if (reducedUsersCount === 0) {
      actionStatus = "✓ All voted";
    } else {
      actionStatus = `✓ OK (${reducedUsersCount} skips)`;
    }
  } else {
    actionStatus = `⚠ ${missedVotes} not voted`;
  }
  console.log(`    - Action status: ${actionStatus}`);

  return {
    roundId,
    autoVotingUsersCount,
    votedForCount: votedForUsers.size,
    rewardsClaimedCount: claimedUsers.size,
    totalRelayerRewards: formatB3TR(totalRelayerRewards),
    totalRelayerRewardsRaw: totalRelayerRewards.toString(),
    estimatedRelayerRewards: formatB3TR(estimatedRelayerRewards),
    estimatedRelayerRewardsRaw: estimatedRelayerRewards.toString(),
    numRelayers,
    vthoSpentOnVoting: formatVTHO(vthoSpentOnVoting),
    vthoSpentOnVotingRaw: vthoSpentOnVoting.toString(),
    vthoSpentOnClaiming: formatVTHO(vthoSpentOnClaiming),
    vthoSpentOnClaimingRaw: vthoSpentOnClaiming.toString(),
    vthoSpentTotal: formatVTHO(vthoSpentTotal),
    vthoSpentTotalRaw: vthoSpentTotal.toString(),
    expectedActions: verificationData.expectedActions,
    completedActions: verificationData.completedActions,
    reducedUsersCount,
    missedUsersCount: verificationData.missedUsersCount,
    allActionsOk,
    actionStatus,
    isRoundEnded,
  };
}

/**
 * Print results as a formatted table
 */
function printTable(rounds: RoundAnalytics[]): void {
  console.log("\n");
  // Conversion rate for B3TR to VTHO
  const B3TR_TO_VTHO_RATE = 19;

  console.log("=".repeat(150));
  console.log("AUTO-VOTING ANALYTICS REPORT");
  console.log("=".repeat(150));

  // Header
  const header = [
    "Round".padEnd(6),
    "Users".padEnd(6),
    "Voted".padEnd(6),
    "Claimed".padEnd(8),
    "Relayers".padEnd(9),
    "Status".padEnd(22),
    "VTHO Spent".padEnd(14),
    "Fee Rewards*".padEnd(32),
    "ROI".padEnd(10),
  ].join(" | ");

  console.log(header);
  console.log("-".repeat(155));

  // Rows
  for (const round of rounds) {
    // Get the B3TR amount (actual or estimated)
    let feeRewardsB3TR: number;
    let isEstimated = false;

    if (round.totalRelayerRewardsRaw !== "0") {
      feeRewardsB3TR = Number(round.totalRelayerRewardsRaw) / 1e18;
    } else if (round.estimatedRelayerRewardsRaw !== "0") {
      feeRewardsB3TR = Number(round.estimatedRelayerRewardsRaw) / 1e18;
      isEstimated = true;
    } else {
      feeRewardsB3TR = 0;
    }

    // Convert B3TR to VTHO equivalent
    const feeRewardsVTHO = feeRewardsB3TR * B3TR_TO_VTHO_RATE;
    const vthoSpent = Number(round.vthoSpentTotalRaw) / 1e18;

    // Calculate ROI
    let roiDisplay: string;
    if (vthoSpent === 0) {
      roiDisplay = "N/A";
    } else {
      const profit = feeRewardsVTHO - vthoSpent;
      const roiPercent = (profit / vthoSpent) * 100;
      const sign = profit >= 0 ? "+" : "";
      roiDisplay = `${sign}${roiPercent.toFixed(0)}%`;
    }

    // Format fee rewards with VTHO equivalent in parentheses
    let feeRewardsDisplay: string;
    if (feeRewardsB3TR > 0) {
      const prefix = isEstimated ? "~" : "";
      feeRewardsDisplay = `${prefix}${feeRewardsB3TR.toFixed(2)} B3TR (~${feeRewardsVTHO.toFixed(0)} VTHO)`;
    } else {
      feeRewardsDisplay = "0.00 B3TR";
    }

    const row = [
      round.roundId.toString().padEnd(6),
      round.autoVotingUsersCount.toString().padEnd(6),
      round.votedForCount.toString().padEnd(6),
      round.rewardsClaimedCount.toString().padEnd(8),
      round.numRelayers.toString().padEnd(9),
      round.actionStatus.padEnd(22),
      round.vthoSpentTotal.padEnd(14),
      feeRewardsDisplay.padEnd(32),
      roiDisplay.padEnd(10),
    ].join(" | ");
    console.log(row);
  }

  console.log("=".repeat(155));
  console.log(
    "* VTHO equivalent calculated using conversion rate: 1 B3TR = 19 VTHO",
  );
}

/**
 * Parse CLI args for --checkpoint and --output
 */
function parseArgs(): {
  checkpointPath: string | null;
  outputPath: string | null;
} {
  const argv = process.argv.slice(2);
  let checkpointPath: string | null = null;
  let outputPath: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--checkpoint" && argv[i + 1]) {
      checkpointPath = argv[i + 1];
      i++;
    } else if (argv[i]?.startsWith("--checkpoint=")) {
      checkpointPath = argv[i].slice("--checkpoint=".length);
    } else if (argv[i] === "--output" && argv[i + 1]) {
      outputPath = argv[i + 1];
      i++;
    } else if (argv[i]?.startsWith("--output=")) {
      outputPath = argv[i].slice("--output=".length);
    }
  }
  return { checkpointPath, outputPath };
}

/**
 * Load existing report from checkpoint path. Returns null if file missing or invalid.
 */
function loadCheckpoint(filepath: string): AnalyticsReport | null {
  try {
    if (!fs.existsSync(filepath)) return null;
    const raw = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(raw) as AnalyticsReport;
    if (!data?.rounds || !Array.isArray(data.rounds)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Save report to JSON file. If outputPath is provided, also write there.
 * Returns the primary path written (outputPath if set, else timestamped path).
 */
function saveReport(
  report: AnalyticsReport,
  outputPath: string | null,
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `auto-voting-report-${timestamp}.json`;
  const defaultDir = path.join(__dirname, "..", "output");
  const defaultFilepath = path.join(defaultDir, filename);

  const writeTo = (filepath: string) => {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  };

  writeTo(defaultFilepath);
  if (outputPath) {
    const resolved = path.isAbsolute(outputPath)
      ? outputPath
      : path.resolve(process.cwd(), outputPath);
    writeTo(resolved);
    return resolved;
  }
  return defaultFilepath;
}

// ============ Main ============

async function main(): Promise<void> {
  const { checkpointPath, outputPath } = parseArgs();

  console.log("Auto-Voting Round Analytics");
  console.log("===========================");
  console.log(`Network: Mainnet`);
  console.log(`Starting from round: ${FIRST_AUTO_VOTING_ROUND}`);
  if (checkpointPath) console.log(`Checkpoint: ${checkpointPath}`);
  if (outputPath) console.log(`Output: ${outputPath}`);

  const thor = ThorClient.at(MAINNET_URL, { isPollingEnabled: false });

  const currentRoundId = await getCurrentRoundId(
    thor,
    CONFIG.xAllocationVotingContractAddress,
  );
  console.log(`Current round: ${currentRoundId}`);

  const checkpoint = checkpointPath ? loadCheckpoint(checkpointPath) : null;
  const completedFromCheckpoint =
    checkpoint?.rounds?.filter((r) => r.isRoundEnded) ?? [];
  const incompleteFromCheckpoint =
    checkpoint?.rounds?.filter((r) => !r.isRoundEnded) ?? [];

  const startRoundId =
    incompleteFromCheckpoint.length > 0
      ? Math.min(...incompleteFromCheckpoint.map((r) => r.roundId))
      : completedFromCheckpoint.length > 0
        ? Math.max(...completedFromCheckpoint.map((r) => r.roundId)) + 1
        : FIRST_AUTO_VOTING_ROUND;

  if (startRoundId > currentRoundId && checkpoint) {
    console.log("Checkpoint is up to date; no new rounds to analyze.");
    const report: AnalyticsReport = {
      generatedAt: new Date().toISOString(),
      network: "mainnet",
      firstRound: checkpoint.firstRound,
      currentRound: currentRoundId,
      rounds: checkpoint.rounds.sort((a, b) => a.roundId - b.roundId),
      relayers: checkpoint.relayers ?? [],
    };
    const filepath = saveReport(report, outputPath);
    console.log(`Report saved to: ${filepath}`);
    return;
  }

  const newRounds: RoundAnalytics[] = [];
  for (let roundId = startRoundId; roundId <= currentRoundId; roundId++) {
    try {
      const roundAnalytics = await analyzeRound(thor, roundId);
      newRounds.push(roundAnalytics);
    } catch (error) {
      console.error(`  Error analyzing round ${roundId}:`, error);
    }
  }

  const byRoundId = new Map<number, RoundAnalytics>();
  for (const r of completedFromCheckpoint) {
    byRoundId.set(r.roundId, r);
  }
  for (const r of newRounds) {
    byRoundId.set(r.roundId, r);
  }
  const rounds = Array.from(byRoundId.values()).sort(
    (a, b) => a.roundId - b.roundId,
  );

  printTable(rounds);

  // ============ Per-Relayer Analytics ============
  console.log("\n  Collecting per-relayer analytics...");

  const registeredRelayers = await getRegisteredRelayers(
    thor,
    CONFIG.relayerRewardsPoolContractAddress,
  );
  console.log(`    - Registered relayers: ${registeredRelayers.length}`);

  // Start from checkpoint relayer data for completed rounds
  const checkpointRelayerMap = new Map<
    string,
    Map<number, RelayerRoundBreakdown>
  >();
  if (checkpoint?.relayers) {
    for (const rel of checkpoint.relayers) {
      const roundMap = new Map<number, RelayerRoundBreakdown>();
      for (const rd of rel.rounds) {
        // Keep checkpoint data for completed rounds we're not re-analyzing
        if (rd.roundId < startRoundId) {
          roundMap.set(rd.roundId, rd);
        }
      }
      checkpointRelayerMap.set(rel.address.toLowerCase(), roundMap);
    }
  }

  // Collect per-relayer data for newly analyzed rounds
  for (let roundId = startRoundId; roundId <= currentRoundId; roundId++) {
    console.log(`    - Analyzing relayer data for round ${roundId}...`);

    const roundSnapshot = await getRoundSnapshot(
      thor,
      CONFIG.xAllocationVotingContractAddress,
      roundId,
    );
    const roundDeadline = await getRoundDeadline(
      thor,
      CONFIG.xAllocationVotingContractAddress,
      roundId,
    );

    // Get action breakdown from RelayerActionRegistered events
    const relayerActions = await getRelayerActionsForRound(
      thor,
      CONFIG.relayerRewardsPoolContractAddress,
      roundId,
      roundSnapshot,
      undefined,
    );

    // Get per-relayer VTHO spent on voting
    const votingVtho = await getPerRelayerVthoSpentOnVoting(
      thor,
      CONFIG.xAllocationVotingContractAddress,
      roundId,
      roundSnapshot,
      roundDeadline,
    );

    // Get per-relayer VTHO spent on claiming (for previous round)
    let claimingVtho = new Map<string, bigint>();
    const prevRoundId = roundId - 1;
    if (prevRoundId >= FIRST_AUTO_VOTING_ROUND) {
      const prevDeadline = await getRoundDeadline(
        thor,
        CONFIG.xAllocationVotingContractAddress,
        prevRoundId,
      );
      claimingVtho = await getPerRelayerVthoSpentOnClaiming(
        thor,
        CONFIG.voterRewardsContractAddress,
        prevRoundId,
        prevDeadline,
        roundDeadline,
      );
    }

    // Get per-relayer claimable rewards
    const allRelayersForRound = new Set([
      ...registeredRelayers,
      ...relayerActions.keys(),
    ]);
    const claimableRewards = await getPerRelayerClaimableRewards(
      thor,
      CONFIG.relayerRewardsPoolContractAddress,
      Array.from(allRelayersForRound),
      roundId,
    );

    // Get per-relayer rewards actually claimed from the pool
    const relayerRewardsClaimed = await getRelayerRewardsClaimed(
      thor,
      CONFIG.relayerRewardsPoolContractAddress,
      roundId,
      roundSnapshot,
      undefined,
    );

    // Merge into relayer map
    for (const addr of allRelayersForRound) {
      if (!checkpointRelayerMap.has(addr)) {
        checkpointRelayerMap.set(addr, new Map());
      }
      const roundMap = checkpointRelayerMap.get(addr)!;
      const actions = relayerActions.get(addr);

      roundMap.set(roundId, {
        roundId,
        votedForCount: actions?.votedForCount ?? 0,
        rewardsClaimedCount: actions?.rewardsClaimedCount ?? 0,
        weightedActions: actions?.weightedActions ?? 0,
        actions: actions?.actions ?? 0,
        claimableRewardsRaw: (
          claimableRewards.get(addr) ?? BigInt(0)
        ).toString(),
        relayerRewardsClaimedRaw: (
          relayerRewardsClaimed.get(addr) ?? BigInt(0)
        ).toString(),
        vthoSpentOnVotingRaw: (votingVtho.get(addr) ?? BigInt(0)).toString(),
        vthoSpentOnClaimingRaw: "0",
      });
    }

    // Attribute claiming VTHO to the round being claimed (prevRoundId)
    // so it aligns with rewardsClaimedCount on the same round entry.
    if (prevRoundId >= FIRST_AUTO_VOTING_ROUND) {
      for (const [addr, vtho] of claimingVtho) {
        if (!checkpointRelayerMap.has(addr)) {
          checkpointRelayerMap.set(addr, new Map());
        }
        const roundMap = checkpointRelayerMap.get(addr)!;
        const prevEntry = roundMap.get(prevRoundId);
        if (prevEntry) {
          prevEntry.vthoSpentOnClaimingRaw = (
            BigInt(prevEntry.vthoSpentOnClaimingRaw) + vtho
          ).toString();
        } else {
          roundMap.set(prevRoundId, {
            roundId: prevRoundId,
            votedForCount: 0,
            rewardsClaimedCount: 0,
            weightedActions: 0,
            actions: 0,
            claimableRewardsRaw: "0",
            relayerRewardsClaimedRaw: "0",
            vthoSpentOnVotingRaw: "0",
            vthoSpentOnClaimingRaw: vtho.toString(),
          });
        }
      }
    }
  }

  // Build final relayers array (include all known relayers, even if no round data)
  const allKnownRelayers = new Set([
    ...registeredRelayers,
    ...checkpointRelayerMap.keys(),
  ]);
  const relayers: RelayerAnalytics[] = Array.from(allKnownRelayers).map(
    (addr) => ({
      address: addr,
      rounds: Array.from(checkpointRelayerMap.get(addr)?.values() ?? [])
        .filter(
          (rd) =>
            rd.actions > 0 ||
            rd.weightedActions > 0 ||
            BigInt(rd.claimableRewardsRaw) > BigInt(0) ||
            BigInt(rd.relayerRewardsClaimedRaw) > BigInt(0),
        )
        .sort((a, b) => a.roundId - b.roundId),
    }),
  );

  console.log(
    `    - Relayer analytics collected for ${relayers.length} relayers`,
  );

  const report: AnalyticsReport = {
    generatedAt: new Date().toISOString(),
    network: "mainnet",
    firstRound: FIRST_AUTO_VOTING_ROUND,
    currentRound: currentRoundId,
    rounds,
    relayers,
  };

  const filepath = saveReport(report, outputPath);
  console.log(`\nReport saved to: ${filepath}`);
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
