"use client"

import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useSendTransaction, useWallet } from "@vechain/vechain-kit"
import { LuCoins, LuSparkles } from "react-icons/lu"
import { encodeFunctionData } from "viem"

import { relayerPoolAbi, relayerPoolAddress } from "@/hooks/contracts"
import type { UnclaimedRound } from "@/hooks/useUnclaimedRelayerRewards"
import { formatToken } from "@/lib/format"

interface Props {
  rounds: UnclaimedRound[]
  totalAmountRaw: string
  relayerAddress: string
  onClaimed?: () => void
}

function formatRoundIds(rounds: UnclaimedRound[]): string {
  if (rounds.length <= 3) {
    return rounds.map((r) => `#${r.roundId}`).join(", ")
  }
  const first = rounds.slice(0, 2).map((r) => `#${r.roundId}`).join(", ")
  const last = rounds[rounds.length - 1]
  return `${first}, ... #${last!.roundId} (${rounds.length} rounds)`
}

export function UnclaimedRewardsBanner({
  rounds,
  totalAmountRaw,
  relayerAddress,
  onClaimed,
}: Props) {
  const { account } = useWallet()

  const { sendTransaction, isTransactionPending, resetStatus } =
    useSendTransaction({
      signerAccountAddress: account?.address ?? "",
      onTxConfirmed: () => onClaimed?.(),
    })

  const handleClaim = async () => {
    resetStatus()

    const clauses = rounds.map((r) => ({
      to: relayerPoolAddress,
      value: "0x0",
      data: encodeFunctionData({
        abi: relayerPoolAbi,
        functionName: "claimRewards",
        args: [BigInt(r.roundId), relayerAddress as `0x${string}`],
      }),
      comment: `Claim relayer rewards for round #${r.roundId}`,
    }))

    await sendTransaction(clauses)
  }

  return (
    <Box
      bgGradient="to-r"
      gradientFrom={{ base: "yellow.50", _dark: "yellow.950/60" }}
      gradientTo={{ base: "orange.50", _dark: "orange.950/40" }}
      borderWidth="1px"
      borderColor={{ base: "yellow.200", _dark: "yellow.800/50" }}
      borderRadius="2xl"
      p={{ base: 4, md: 5 }}
      boxShadow="sm"
    >
      <HStack
        justify="space-between"
        align="center"
        flexDir={{ base: "column", sm: "row" }}
        gap="4"
      >
        <HStack gap={3} align="center">
          <Box
            flexShrink={0}
            w="42px"
            h="42px"
            rounded="full"
            bg={{ base: "yellow.100", _dark: "yellow.500/15" }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            color={{ base: "yellow.600", _dark: "yellow.400" }}
          >
            <LuSparkles size={20} />
          </Box>
          <VStack align="start" gap={0.5}>
            <Text
              textStyle="sm"
              fontWeight="bold"
              color={{ base: "yellow.800", _dark: "yellow.200" }}
            >
              {`${formatToken(totalAmountRaw)} B3TR unclaimed rewards`}
            </Text>
            <Text
              textStyle="xs"
              color={{ base: "yellow.700/80", _dark: "yellow.400/70" }}
            >
              {`From rounds ${formatRoundIds(rounds)}`}
            </Text>
          </VStack>
        </HStack>

        <Button
          onClick={handleClaim}
          loading={isTransactionPending}
          loadingText="Claiming..."
          variant="solid"
          size="sm"
          rounded="full"
          bg={{ base: "yellow.500", _dark: "yellow.500" }}
          color="black"
          _hover={{ bg: "yellow.400" }}
          flexShrink={0}
        >
          <LuCoins />
          {rounds.length === 1
            ? "Claim Reward"
            : `Claim All (${rounds.length})`}
        </Button>
      </HStack>
    </Box>
  )
}
