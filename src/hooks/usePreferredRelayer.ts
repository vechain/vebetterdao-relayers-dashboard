"use client"

import { useCallClause } from "@vechain/vechain-kit"

import { relayerPoolAbi, relayerPoolAddress } from "./contracts"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

/**
 * Get the preferred relayer for a given user address.
 * Returns the relayer address (lowercase) or undefined if none is set.
 */
export function usePreferredRelayer(userAddress: string | undefined) {
  return useCallClause({
    abi: relayerPoolAbi,
    address: relayerPoolAddress,
    method: "getPreferredRelayer",
    args: [userAddress as `0x${string}`],
    queryOptions: {
      enabled: !!userAddress,
      select: (data: readonly unknown[]) => {
        const addr = data[0] as string
        if (!addr || addr === ZERO_ADDRESS) return undefined
        return addr.toLowerCase()
      },
    },
  })
}
