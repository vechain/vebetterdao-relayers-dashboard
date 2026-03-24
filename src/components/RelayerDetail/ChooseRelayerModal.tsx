"use client"

import { Button, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { useSendTransaction, useWallet } from "@vechain/vechain-kit"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { LuExternalLink, LuHeart, LuInfo } from "react-icons/lu"
import { encodeFunctionData } from "viem"

import { getConfig } from "@/config"
import { useIsAutoVotingEnabled } from "@/hooks/useIsAutoVotingEnabled"
import { relayerPoolAbi, relayerPoolAddress } from "@/hooks/contracts"

import { BaseModal } from "../Base/BaseModal"

interface ChooseRelayerModalProps {
  isOpen: boolean
  onClose: () => void
  relayerAddress: string
  relayerName: string
}

export function ChooseRelayerModal({ isOpen, onClose, relayerAddress, relayerName }: ChooseRelayerModalProps) {
  const { t } = useTranslation()
  const { account } = useWallet()
  const { data: isAutoVotingEnabled, isLoading } = useIsAutoVotingEnabled(account?.address)
  const { governanceUrl } = getConfig()
  const allocationsUrl = `${governanceUrl}/allocations`
  const queryClient = useQueryClient()

  const { sendTransaction, isTransactionPending, resetStatus } =
    useSendTransaction({
      signerAccountAddress: account?.address ?? "",
      onTxConfirmed: () => {
        queryClient.invalidateQueries()
        onClose()
      },
    })

  const handleConfirm = async () => {
    resetStatus()

    await sendTransaction([
      {
        to: relayerPoolAddress,
        value: "0x0",
        data: encodeFunctionData({
          abi: relayerPoolAbi,
          functionName: "setPreferredRelayer",
          args: [relayerAddress as `0x${string}`],
        }),
        comment: `Set ${relayerName} as preferred relayer`,
      },
    ])
  }

  if (!isLoading && !isAutoVotingEnabled) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton isCloseable>
        <VStack gap={5} align="stretch">
          <HStack gap="3">
            <LuInfo size={24} />
            <Heading size="md" fontWeight="bold">
              {t("Enable auto-voting first")}
            </Heading>
          </HStack>

          <Text color="text.subtle" textStyle="sm">
            {t("To choose a preferred relayer, you need to have auto-voting enabled. Auto-voting lets relayers cast votes and claim rewards on your behalf each round.")}
          </Text>

          <Text color="text.subtle" textStyle="sm">
            {t("You can enable auto-voting and set your app preferences on the VeBetterDAO governance app. Once enabled, come back here to choose your preferred relayer.")}
          </Text>

          <HStack gap="3" pt="2">
            <a href={allocationsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="md" rounded="full">
                {t("Go to Allocations")}
                <LuExternalLink />
              </Button>
            </a>
            <Button variant="ghost" size="md" rounded="full" onClick={onClose}>
              {t("Cancel")}
            </Button>
          </HStack>
        </VStack>
      </BaseModal>
    )
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton isCloseable>
      <VStack gap={5} align="stretch">
        <HStack gap="3">
          <LuHeart size={24} />
          <Heading size="md" fontWeight="bold">
            {t("Choose preferred relayer")}
          </Heading>
        </HStack>

        <Text color="text.subtle" textStyle="sm">
          {t("You are about to set {{name}} as your preferred relayer. This relayer will be prioritized to handle your votes and reward claims each round.", { name: relayerName })}
        </Text>

        <HStack gap="3" pt="2">
          <Button
            variant="primary"
            size="md"
            rounded="full"
            onClick={handleConfirm}
            loading={isTransactionPending}
            loadingText={t("Confirming...")}
          >
            <LuHeart />
            {t("Confirm")}
          </Button>
          <Button variant="ghost" size="md" rounded="full" onClick={onClose}>
            {t("Cancel")}
          </Button>
        </HStack>
      </VStack>
    </BaseModal>
  )
}
