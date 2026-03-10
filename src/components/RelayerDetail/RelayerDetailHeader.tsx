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
  useAccountCustomizationModal,
  useConnectModal,
  useGetAvatarOfAddress,
  useGetTextRecords,
  useVechainDomain,
  useWallet,
} from "@vechain/vechain-kit";
import NextLink from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuCheck,
  LuClipboard,
  LuExternalLink,
  LuHeart,
  LuPencil,
  LuPlay,
  LuShare2,
} from "react-icons/lu";

import { useRelayerRegistration } from "@/hooks/useRelayerRegistration";

import { ShareRelayerModal } from "@/components/SetupGuide/ShareRelayerModal";

import { ChooseRelayerModal } from "./ChooseRelayerModal";

interface RelayerDetailHeaderProps {
  address: string;
  isActive: boolean;
  isOwnRelayer?: boolean;
}

export function RelayerDetailHeader({
  address,
  isActive,
  isOwnRelayer,
}: RelayerDetailHeaderProps) {
  const { data: domain } = useVechainDomain(address);
  const { data: avatarSrc } = useGetAvatarOfAddress(address);
  const { data: textRecords } = useGetTextRecords(domain?.domain ?? "");
  const { data: isRegistered } = useRelayerRegistration(address);
  const { account } = useWallet();
  const { open: openConnect } = useConnectModal();
  const { open: openCustomization } = useAccountCustomizationModal();
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { t } = useTranslation();
  const displayName = domain?.domain ?? t("Unknown");
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
                      {isActive ? t("Active") : t("Inactive")}
                    </Badge>
                  </HStack>

                  <HStack gap="2" color="text.subtle">
                    <Text textStyle="xs" lineClamp={1}>
                      {shortAddress}
                    </Text>
                    <Clipboard.Root value={address}>
                      <Clipboard.Trigger asChild>
                        <Box
                          as="button"
                          cursor="pointer"
                          _hover={{ color: "text.primary" }}
                          transition="color 0.15s"
                          aria-label={t("Copy address")}
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

                  {isOwnRelayer && (
                    <Button
                      variant="ghost"
                      size="xs"
                      rounded="full"
                      onClick={() => openCustomization()}
                    >
                      <LuPencil />
                      {t("Customize")}
                    </Button>
                  )}
                </VStack>
              </HStack>

              {/* Right: action buttons */}
              <HStack
                flexShrink={0}
                gap={2}
                flexDir={{ base: "column", sm: "row" }}
                w={{ base: "full", sm: "auto" }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  rounded="full"
                  onClick={() => setShowShareModal(true)}
                >
                  <LuShare2 />
                  {t("Share")}
                </Button>
                {isOwnRelayer ? (
                  <NextLink href="/run">
                    <Button variant="primary" size="sm" rounded="full">
                      <LuPlay />
                      {t("Run")}
                    </Button>
                  </NextLink>
                ) : (
                  isRegistered && (
                    <Button
                      variant="primary"
                      size="sm"
                      rounded="full"
                      onClick={handleChooseRelayer}
                    >
                      <LuHeart />
                      {t("Set as default relayer")}
                    </Button>
                  )
                )}
              </HStack>
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

      <ShareRelayerModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        relayerAddress={domain?.domain ?? address}
      />
    </>
  );
}
