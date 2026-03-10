"use client"

import { Button, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { useWallet } from "@vechain/vechain-kit"
import { LuExternalLink, LuHeart, LuInfo } from "react-icons/lu"

import { getConfig } from "@/config"
import { useIsAutoVotingEnabled } from "@/hooks/useIsAutoVotingEnabled"

import { BaseModal } from "../Base/BaseModal"

interface ChooseRelayerModalProps {
  isOpen: boolean
  onClose: () => void
  relayerAddress: string
  relayerName: string
}

export function ChooseRelayerModal({ isOpen, onClose, relayerName }: ChooseRelayerModalProps) {
  const { account } = useWallet()
  const { data: isAutoVotingEnabled, isLoading } = useIsAutoVotingEnabled(account?.address)
  const { governanceUrl } = getConfig()
  const allocationsUrl = `${governanceUrl}/allocations`

  if (!isLoading && !isAutoVotingEnabled) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton isCloseable>
        <VStack gap={5} align="stretch">
          <HStack gap="3">
            <LuInfo size={24} />
            <Heading size="md" fontWeight="bold">
              {"Enable auto-voting first"}
            </Heading>
          </HStack>

          <Text color="text.subtle" textStyle="sm">
            {"To choose a preferred relayer, you need to have auto-voting enabled. Auto-voting lets relayers cast votes and claim rewards on your behalf each round."}
          </Text>

          <Text color="text.subtle" textStyle="sm">
            {"You can enable auto-voting and set your app preferences on the VeBetterDAO governance app. Once enabled, come back here to choose your preferred relayer."}
          </Text>

          <HStack gap="3" pt="2">
            <a href={allocationsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="md" rounded="full">
                {"Go to Allocations"}
                <LuExternalLink />
              </Button>
            </a>
            <Button variant="ghost" size="md" rounded="full" onClick={onClose}>
              {"Cancel"}
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
            {"Choose preferred relayer"}
          </Heading>
        </HStack>

        <Text color="text.subtle" textStyle="sm">
          {"You are about to set "}
          <Text as="span" fontWeight="bold" color="text.primary">
            {relayerName}
          </Text>
          {" as your preferred relayer. This relayer will be prioritized to handle your votes and reward claims each round."}
        </Text>

        <Text color="text.subtle" textStyle="xxs">
          {"This feature is coming soon. Preferred relayer selection will be available in a future contract upgrade."}
        </Text>

        <HStack gap="3" pt="2">
          <Button variant="primary" size="md" rounded="full" disabled>
            <LuHeart />
            {"Confirm"}
          </Button>
          <Button variant="ghost" size="md" rounded="full" onClick={onClose}>
            {"Cancel"}
          </Button>
        </HStack>
      </VStack>
    </BaseModal>
  )
}
