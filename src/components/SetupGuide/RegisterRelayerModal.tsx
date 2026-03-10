"use client"

import { useState, useEffect } from "react"
import {
  Button,
  HStack,
  Input,
  Text,
  VStack,
  Box,
} from "@chakra-ui/react"
import {
  useWallet,
  useSendTransaction,
  useVechainDomain,
} from "@vechain/vechain-kit"
import { useTranslation } from "react-i18next"
import { encodeFunctionData } from "viem"
import { LuCircleCheck, LuCircleAlert, LuLoaderCircle } from "react-icons/lu"

import { useQueryClient } from "@tanstack/react-query"

import { BaseModal } from "@/components/Base/BaseModal"
import { relayerPoolAbi, relayerPoolAddress } from "@/hooks/contracts"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RegisterRelayerModal({ isOpen, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { account } = useWallet()
  const queryClient = useQueryClient()
  const [relayerAddress, setRelayerAddress] = useState("")
  const [isCustomAddress, setIsCustomAddress] = useState(false)

  const {
    sendTransaction,
    status,
    isTransactionPending,
    error,
    resetStatus,
  } = useSendTransaction({
    signerAccountAddress: account?.address ?? "",
    onTxConfirmed: () => {
      queryClient.invalidateQueries()
      onSuccess()
    },
  })

  useEffect(() => {
    if (account?.address && !isCustomAddress) {
      setRelayerAddress(account.address)
    }
  }, [account?.address, isCustomAddress])

  useEffect(() => {
    if (isOpen) {
      resetStatus()
      setIsCustomAddress(false)
      if (account?.address) {
        setRelayerAddress(account.address)
      }
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegister = async () => {
    if (!resolvedAddress || !isValidAddress) return

    const data = encodeFunctionData({
      abi: relayerPoolAbi,
      functionName: "registerRelayer",
      args: [resolvedAddress as `0x${string}`],
    })

    await sendTransaction([
      {
        to: relayerPoolAddress,
        value: "0x0",
        data,
        comment: "Register as a VeBetterDAO relayer",
      },
    ])
  }

  const handleAddressChange = (value: string) => {
    setIsCustomAddress(true)
    setRelayerAddress(value)
  }

  const handleResetToConnected = () => {
    setIsCustomAddress(false)
    setRelayerAddress(account?.address ?? "")
  }

  const isRawAddress = /^0x[a-fA-F0-9]{40}$/.test(relayerAddress)
  const isDomainInput = relayerAddress.includes(".") && !relayerAddress.startsWith("0x")

  const { data: domainData, isLoading: domainLoading } = useVechainDomain(
    isDomainInput ? relayerAddress : undefined,
  )

  const resolvedAddress = isDomainInput
    ? domainData?.address
    : relayerAddress

  const isValidAddress = resolvedAddress ? /^0x[a-fA-F0-9]{40}$/.test(resolvedAddress) : false

  if (status === "success") {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton>
        <VStack gap={6} py={4} align="center">
          <Box color="green.400">
            <LuCircleCheck size={48} />
          </Box>
          <VStack gap={2}>
            <Text textStyle="lg" fontWeight="bold" textAlign="center">
              {t("Registration Successful")}
            </Text>
            <Text textStyle="sm" color="text.subtle" textAlign="center">
              {t("You are now a registered relayer. Time to run your node!")}
            </Text>
          </VStack>
          <Button onClick={onClose} variant="solid" rounded="full" w="full">
            {t("Continue")}
          </Button>
        </VStack>
      </BaseModal>
    )
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton>
      <VStack gap={6} py={4} align="stretch">
        <VStack gap={2} align="start">
          <Text textStyle="lg" fontWeight="bold">
            {t("Register as Relayer")}
          </Text>
          <Text textStyle="sm" color="text.subtle">
            {t("This will register the address below as a relayer on RelayerRewardsPool.")}
          </Text>
        </VStack>

        <VStack gap={2} align="stretch">
          <HStack justify="space-between">
            <Text textStyle="sm" fontWeight="medium">
              {t("Relayer Address")}
            </Text>
            {isCustomAddress && account?.address && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleResetToConnected}
              >
                {t("Use connected wallet")}
              </Button>
            )}
          </HStack>
          <Input
            value={relayerAddress}
            onChange={e => handleAddressChange(e.target.value)}
            placeholder={t("0x... or name.vet")}
            fontFamily="mono"
            size="sm"
          />
          {!isCustomAddress && account?.address && (
            <Text textStyle="xs" color="text.subtle">
              {t("Your connected wallet address is pre-filled. You can change it or enter a .vet domain.")}
            </Text>
          )}
          {isDomainInput && domainLoading && (
            <HStack gap={1}>
              <LuLoaderCircle size={12} className="animate-spin" />
              <Text textStyle="xs" color="text.subtle">
                {t("Resolving domain...")}
              </Text>
            </HStack>
          )}
          {isDomainInput && !domainLoading && domainData?.address && (
            <Text textStyle="xs" color="green.400" fontFamily="mono">
              {t("Resolved: {{address}}", { address: domainData.address })}
            </Text>
          )}
          {isDomainInput && !domainLoading && !domainData?.address && relayerAddress.length > 2 && (
            <Text textStyle="xs" color="red.400">
              {t("Could not resolve this domain.")}
            </Text>
          )}
          {isCustomAddress && !isDomainInput && !isRawAddress && relayerAddress.length > 0 && (
            <Text textStyle="xs" color="red.400">
              {t("Enter a valid address (0x...) or a .vet domain.")}
            </Text>
          )}
        </VStack>

        {error && (
          <HStack gap={2} color="red.400">
            <LuCircleAlert />
            <Text textStyle="sm">
              {error.reason ?? t("Transaction failed. Please try again.")}
            </Text>
          </HStack>
        )}

        <Button
          onClick={handleRegister}
          disabled={!isValidAddress || isTransactionPending || domainLoading}
          variant="solid"
          rounded="full"
          w="full"
          loading={isTransactionPending}
          loadingText={t("Registering...")}
        >
          {t("Register")}
        </Button>
      </VStack>
    </BaseModal>
  )
}
