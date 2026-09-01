"use client"

import { useCallClause } from "@vechain/vechain-kit"

import { navigatorRegistryAbi, navigatorRegistryAddress } from "./contracts"

/** Check if a specific user is currently delegated to a navigator. */
export function useIsDelegatedToNavigator(address: string | undefined) {
  return useCallClause({
    abi: navigatorRegistryAbi,
    address: navigatorRegistryAddress,
    method: "getDelegatedAmount",
    args: [address as `0x${string}`],
    queryOptions: {
      enabled: !!address,
      select: (data: readonly unknown[]) => (data[0] as bigint) > 0n,
    },
  })
}
