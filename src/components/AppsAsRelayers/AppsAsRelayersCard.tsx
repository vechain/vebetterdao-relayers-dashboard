"use client";

import {
  Box,
  Button,
  Card,
  CloseButton,
  HStack,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { LuArrowUpRight, LuRocket, LuSmartphone } from "react-icons/lu";

import { useDismissedBanner } from "@/hooks/useDismissedBanners";

import { AppsAsRelayersModal } from "./AppsAsRelayersModal";

interface AppsAsRelayersCardProps {
  forceBanner?: boolean;
}

export function AppsAsRelayersCard({
  forceBanner = false,
}: AppsAsRelayersCardProps) {
  const { isDismissed, dismiss } = useDismissedBanner("apps-as-relayers");
  const { open, onOpen, onClose } = useDisclosure();

  if (!forceBanner && isDismissed) return null;

  return (
    <>
      <Card.Root
        p={{ base: "5", md: "8" }}
        variant="primary"
        overflow="hidden"
        position="relative"
        w="full"
      >
        {!forceBanner && (
          <CloseButton
            position="absolute"
            top="3"
            right="3"
            size="sm"
            zIndex={2}
            onClick={dismiss}
          />
        )}
        <VStack align="start" gap="3" position="relative" zIndex={1}>
          <Text textStyle={{ base: "lg", md: "xl" }} fontWeight="bold">
            {"Autovoting as a Service"}
          </Text>
          <Text textStyle="md" color="text.subtle">
            {"Stop paying for votes. Start getting paid to handle them."}
          </Text>
          <HStack gap="2" mt="4" flexWrap="wrap">
            <NextLink href="/new-relayer">
              <Button variant="primary" size="sm" rounded="full">
                {"Become a Relayer"}
                <LuRocket />
              </Button>
            </NextLink>
            <Button variant="link" size="sm" rounded="full" onClick={onOpen}>
              {"Learn"}
              <LuArrowUpRight />
            </Button>
          </HStack>
        </VStack>
        <Box
          position="absolute"
          right="-1"
          bottom="-1"
          opacity={0.08}
          color="text.subtle"
          fontSize={{ base: "96px", md: "128px" }}
        >
          <LuSmartphone />
        </Box>
      </Card.Root>

      <AppsAsRelayersModal isOpen={open} onClose={onClose} />
    </>
  );
}
