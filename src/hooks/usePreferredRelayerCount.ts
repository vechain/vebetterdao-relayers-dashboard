"use client"

import { useQuery } from "@tanstack/react-query"
import { useThor } from "@vechain/vechain-kit"
import { toEventSelector, pad } from "viem"

import { relayerPoolAddress } from "./contracts"

const PREFERRED_RELAYER_SET_TOPIC = toEventSelector(
  "event PreferredRelayerSet(address indexed user, address indexed relayer)",
)

const PAGE_SIZE = 256

/**
 * Fetches all PreferredRelayerSet events and counts how many users
 * currently have the given relayer as their preferred relayer.
 *
 * "Currently" means the latest event per user is checked — if a user
 * later switched to a different relayer, they are not counted.
 */
export function usePreferredRelayerCount(relayerAddress: string | undefined) {
  const thor = useThor()

  return useQuery({
    queryKey: ["preferred-relayer-count", relayerAddress?.toLowerCase()],
    queryFn: async (): Promise<number> => {
      if (!relayerAddress) return 0

      // Fetch ALL PreferredRelayerSet events (paginated)
      // We need all events to determine the latest preference per user.
      let offset = 0
      const allEvents: Array<{ user: string; relayer: string; blockNumber: number; logIndex: number }> = []

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
          // topic1 = indexed user address, topic2 = indexed relayer address
          const user = log.topics[1]?.toLowerCase()
          const relayer = log.topics[2]?.toLowerCase()
          if (user && relayer) {
            allEvents.push({
              user,
              relayer,
              blockNumber: log.meta.blockNumber,
              logIndex: log.meta.txID ? parseInt(log.meta.txID.slice(-4), 16) : 0,
            })
          }
        }

        if (logs.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }

      // Build map: user → latest preferred relayer
      // Events are fetched in ascending order, so later entries overwrite earlier ones
      const latestPreference = new Map<string, string>()
      for (const event of allEvents) {
        latestPreference.set(event.user, event.relayer)
      }

      // Count users whose latest preference matches the target relayer
      const target = pad(relayerAddress.toLowerCase() as `0x${string}`, { size: 32 }).toLowerCase()
      let count = 0
      for (const relayer of latestPreference.values()) {
        if (relayer === target) count++
      }

      return count
    },
    enabled: !!relayerAddress && !!thor,
    staleTime: 5 * 60_000, // 5 minutes
  })
}
