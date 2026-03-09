"use client"

import { useCallClause } from "@vechain/vechain-kit"

import { xAllocationAbi, xAllocationAddress } from "./contracts"

/** Check if a specific user has auto-voting enabled. */
export function useIsAutoVotingEnabled(address: string | undefined) {
  return useCallClause({
    abi: xAllocationAbi,
    address: xAllocationAddress,
    method: "isUserAutoVotingEnabled",
    args: [address as `0x${string}`],
    queryOptions: {
      enabled: !!address,
      select: (data: readonly unknown[]) => data[0] as boolean,
    },
  })
}
