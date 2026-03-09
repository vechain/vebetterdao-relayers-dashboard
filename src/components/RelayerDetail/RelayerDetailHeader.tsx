"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Clipboard,
  HStack,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  useConnectModal,
  useGetAvatarOfAddress,
  useGetTextRecords,
  useVechainDomain,
  useWallet,
} from "@vechain/vechain-kit";
import NextLink from "next/link";
import { useState } from "react";
import { LuArrowLeft, LuCheck, LuClipboard, LuExternalLink, LuHeart } from "react-icons/lu";

import { useRelayerRegistration } from "@/hooks/useRelayerRegistration";

import { ChooseRelayerModal } from "./ChooseRelayerModal";

interface RelayerDetailHeaderProps {
  address: string;
  isActive: boolean;
}

export function RelayerDetailHeader({
  address,
  isActive,
}: RelayerDetailHeaderProps) {
  const { data: domain } = useVechainDomain(address);
  const { data: avatarSrc } = useGetAvatarOfAddress(address);
  const { data: textRecords } = useGetTextRecords(domain?.domain ?? "");
  const { data: isRegistered } = useRelayerRegistration(address);
  const { account } = useWallet();
  const { open: openConnect } = useConnectModal();
  const [showModal, setShowModal] = useState(false);

  const displayName =
    domain?.domain ?? `${address.slice(0, 6)}...${address.slice(-4)}`;
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const explorerUrl = `https://explore.vechain.org/address/${address}`;
  const description = textRecords?.description;

  const handleChooseRelayer = () => {
    if (!account?.address) {
      openConnect();
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <VStack align="start" gap="4">
        <NextLink href="/relayers">
          <Button variant="ghost" size="sm">
            <LuArrowLeft />
            {"Back to relayers"}
          </Button>
        </NextLink>

        <Card.Root variant="primary" w="full">
          <Card.Body>
            <HStack
              gap={{ base: "4", md: "6" }}
              align={{ base: "start", md: "center" }}
              flexDir={{ base: "column", sm: "row" }}
              justify="space-between"
              w="full"
            >
              {/* Left: avatar + info */}
              <HStack
                gap={{ base: "3", md: "5" }}
                align="center"
                minW="0"
                flex="1"
              >
                {/* Avatar */}
                <Box flexShrink={0}>
                  <Image
                    src={avatarSrc ?? ""}
                    alt={displayName}
                    w={{ base: "56px", md: "72px" }}
                    h={{ base: "56px", md: "72px" }}
                    rounded="full"
                    objectFit="cover"
                    border="2px solid"
                    borderColor="border.subtle"
                  />
                </Box>

                {/* Name + address + badges + description */}
                <VStack gap="1" align="start" minW="0">
                  <HStack gap="2" flexWrap="wrap">
                    <Text
                      textStyle={{ base: "lg", md: "xl" }}
                      fontWeight="bold"
                      lineClamp={1}
                    >
                      {displayName}
                    </Text>
                    <Badge
                      size="sm"
                      variant="solid"
                      colorPalette={isActive ? "green" : "gray"}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                    {isRegistered && (
                      <Badge size="sm" variant="outline" colorPalette="blue">
                        {"Registered"}
                      </Badge>
                    )}
                  </HStack>

                  <HStack gap="2" color="text.subtle">
                    <Text textStyle="xs" lineClamp={1}>
                      {domain?.domain ? shortAddress : address}
                    </Text>
                    <Clipboard.Root value={address}>
                      <Clipboard.Trigger asChild>
                        <Box
                          as="button"
                          cursor="pointer"
                          _hover={{ color: "text.primary" }}
                          transition="color 0.15s"
                          aria-label="Copy address"
                        >
                          <Clipboard.Indicator copied={<LuCheck size={12} />}>
                            <LuClipboard size={12} />
                          </Clipboard.Indicator>
                        </Box>
                      </Clipboard.Trigger>
                    </Clipboard.Root>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Box
                        _hover={{ color: "text.primary" }}
                        transition="color 0.15s"
                        color="text.subtle"
                      >
                        <LuExternalLink size={12} />
                      </Box>
                    </a>
                  </HStack>

                  {description && (
                    <Text textStyle="xs" color="text.subtle" lineClamp={2}>
                      {description}
                    </Text>
                  )}
                </VStack>
              </HStack>

              {/* Right: action button */}
              {isRegistered && (
                <Box flexShrink={0}>
                  <Button
                    variant="primary"
                    size="sm"
                    rounded="full"
                    onClick={handleChooseRelayer}
                  >
                    <LuHeart />
                    {"Choose as relayer"}
                  </Button>
                </Box>
              )}
            </HStack>
          </Card.Body>
        </Card.Root>
      </VStack>

      <ChooseRelayerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        relayerAddress={address}
        relayerName={displayName}
      />
    </>
  );
}
