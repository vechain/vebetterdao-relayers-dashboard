"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useTranslation } from "react-i18next";
import { LuLayoutGrid, LuUsers } from "react-icons/lu";

import { BaseModal } from "../Base/BaseModal";
import { Rules } from "../SetupGuide/Rules";

interface AppsAsRelayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppsAsRelayersModal({
  isOpen,
  onClose,
}: AppsAsRelayersModalProps) {
  const { t } = useTranslation();
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton isCloseable>
      <VStack gap={5} align="stretch">
        <Heading size="lg" fontWeight="bold">
          {t("Autovoting as a Service")}
        </Heading>

        <Rules />

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Card.Root variant="outline" p={5}>
            <VStack align="stretch" gap={3} justify="space-between" h="full">
              <Box as="span" color="blue.solid" fontSize="24px" lineHeight="1">
                <LuUsers />
              </Box>
              <Text fontWeight="semibold">
                {t("For Community Navigators \uD83C\uDF1F")}
              </Text>
              <Text textStyle="sm" color="text.subtle">
                {t(
                  "This is your chance to make an impact! \uD83D\uDE80 As a respected community member, run a relayer node to help decentralize the voting process and earn B3TR rewards for every vote you handle. Be the backbone of VeBetterDAO \uD83D\uDCAA",
                )}
              </Text>

              <NextLink href="/new-relayer" onClick={onClose}>
                <Button variant="primary" size="sm" rounded="full">
                  {t("Register as a Relayer")}
                </Button>
              </NextLink>
            </VStack>
          </Card.Root>

          <Card.Root variant="outline" p={5}>
            <VStack align="start" gap={3}>
              <Box as="span" color="blue.solid" fontSize="24px" lineHeight="1">
                <LuLayoutGrid />
              </Box>
              <Text fontWeight="semibold">{t("For X2Earn Apps")}</Text>
              <Text textStyle="sm" color="text.subtle">
                {t(
                  "As an app on VeBetterDAO, running your own relayer is a powerful economic opportunity. Your users set you as a preference, you execute their votes (directed to your app), and you earn relayer fees — all without anyone transferring funds or giving up custody of their tokens.",
                )}
              </Text>

              <Button variant="solid" size="sm" rounded="full" disabled>
                {t("SDK Coming Soon")}
              </Button>
            </VStack>
          </Card.Root>
        </SimpleGrid>
      </VStack>
    </BaseModal>
  );
}
