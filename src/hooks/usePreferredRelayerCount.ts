"use client"

import { useQuery } from "@tanstack/react-query"
import type { ThorClient } from "@vechain/sdk-network"
import { useThor } from "@vechain/vechain-kit"
import { toEventSelector, pad } from "viem"

import { relayerPoolAddress } from "./contracts"

const PREFERRED_RELAYER_SET_TOPIC = toEventSelector(
  "event PreferredRelayerSet(address indexed user, address indexed relayer)",
)

const PAGE_SIZE = 256

/**
 * Fetch all PreferredRelayerSet events and count how many users currently
 * prefer the given relayer.  Events are fetched in ascending order so the
 * last event per user represents their current preference.
 */
async function fetchPreferredRelayerCount(
  thor: ThorClient,
  relayerAddress: string,
): Promise<number> {
  const latestPreference = new Map<string, string>()
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const logs = await thor.logs.filterRawEventLogs({
      criteriaSet: [
        {
          address: relayerPoolAddress,
          topic0: PREFERRED_RELAYER_SET_TOPIC,
        },
      ],
      options: { offset, limit: PAGE_SIZE },
      order: "asc",
    })

    for (const log of logs) {
      const user = log.topics[1]?.toLowerCase()
      const relayer = log.topics[2]?.toLowerCase()
      if (user && relayer) {
        latestPreference.set(user, relayer)
      }
    }

    if (logs.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const target = pad(relayerAddress.toLowerCase() as `0x${string}`, { size: 32 }).toLowerCase()
  let count = 0
  for (const relayer of latestPreference.values()) {
    if (relayer === target) count++
  }
  return count
}

/**
 * Returns the number of users who currently have the given relayer set as
 * their preferred relayer.
 */
export function usePreferredRelayerCount(relayerAddress: string | undefined) {
  const thor = useThor()

  return useQuery({
    queryKey: ["preferred-relayer-count", relayerAddress?.toLowerCase()],
    queryFn: () => fetchPreferredRelayerCount(thor, relayerAddress!),
    enabled: !!relayerAddress && !!thor,
    staleTime: 5 * 60_000, // 5 minutes
  })
}
