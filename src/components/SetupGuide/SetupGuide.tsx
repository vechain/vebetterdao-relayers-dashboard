"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Grid,
  Button,
  Card,
  Heading,
  HStack,
  Link,
  Text,
  VStack,
  Box,
  Image,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  LuArrowLeft,
  LuCoins,
  LuExternalLink,
  LuScale,
  LuServer,
  LuZap,
  LuCheck,
  LuWallet,
  LuUserPlus,
  LuPencil,
  LuPlay,
  LuShare2,
  LuRadar,
} from "react-icons/lu";
import {
  useWallet,
  useConnectModal,
  useVechainDomain,
  useAccountCustomizationModal,
} from "@vechain/vechain-kit";

import { RegisterRelayerModal } from "./RegisterRelayerModal";
import { ShareRelayerModal } from "./ShareRelayerModal";
import { RunOptions } from "./RunOptions";
import { Rules } from "./Rules";

function Step({
  number,
  title,
  disabled,
  completed,
  children,
}: {
  number: number;
  title: string;
  disabled?: boolean;
  completed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card.Root
      variant="primary"
      p={{ base: "4", md: "6" }}
      opacity={disabled ? 0.4 : 1}
      transition="opacity 0.3s ease"
      pointerEvents={disabled ? "none" : "auto"}
    >
      <VStack align="start" gap="3">
        <HStack gap="3" align="center">
          {completed ? (
            <Box
              bg="green.500"
              rounded="full"
              w="7"
              h="7"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
            >
              <LuCheck size={14} />
            </Box>
          ) : (
            <Text
              textStyle="sm"
              fontWeight="bold"
              color="actions.primary.text"
              bg="actions.primary.default"
              rounded="full"
              w="7"
              h="7"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {number}
            </Text>
          )}
          <Text textStyle={{ base: "md", md: "lg" }} fontWeight="semibold">
            {title}
          </Text>
        </HStack>
        <VStack align="start" gap="3" pl="10" w="full">
          {children}
        </VStack>
      </VStack>
    </Card.Root>
  );
}

export function SetupGuide() {
  const { account } = useWallet();
  const { open: openConnectModal } = useConnectModal();
  const { open: openCustomization } = useAccountCustomizationModal();
  const { data: domain } = useVechainDomain(account?.address);
  const router = useRouter();

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const isStepCompleted = (step: number) => completedSteps.has(step);
  const isStepEnabled = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return isStepCompleted(1);
    if (step === 3) return isStepCompleted(2);
    if (step === 4) return isStepCompleted(2);
    if (step === 5) return isStepCompleted(2);
    if (step === 6) return isStepCompleted(2);
    return false;
  };

  const completeStep = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    completeStep(2);
  }, [completeStep]);

  const handleRunInBrowser = useCallback(() => {
    completeStep(4);
    router.push("/run");
  }, [completeStep, router]);

  const { t } = useTranslation();
  return (
    <VStack align="start" gap="6" w="full">
      <HStack gap="3" align="center">
        <NextLink href="/">
          <Button variant="ghost" size="sm" rounded="full">
            <LuArrowLeft />
            {t("Back")}
          </Button>
        </NextLink>
      </HStack>

      <VStack align="start" gap="1">
        <Heading size={{ base: "xl", md: "2xl" }} fontWeight="bold">
          {t("Become a Relayer")}
        </Heading>
        <Text textStyle="md" color="text.subtle">
          {t(
            "Follow these steps to join the network and start earning B3TR rewards.",
          )}
        </Text>
      </VStack>

      <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap="4" w="full">
        <VStack gap="4" align="stretch">
          {/* Step 1: Prepare wallet */}
          <Step
            number={1}
            title={t("Prepare a Wallet")}
            completed={isStepCompleted(1)}
          >
            <Text textStyle="sm" color="text.subtle">
              {t(
                "You need a VeChain wallet with some VTHO for gas fees. We recommend creating a dedicated wallet for this purpose — its private key will be used to run the relayer node, so it's best to keep it separate from your main wallet.",
              )}
            </Text>
            {!isStepCompleted(1) && (
              <Button
                onClick={() => completeStep(1)}
                variant="solid"
                rounded="full"
                size="sm"
                gap={2}
              >
                <LuWallet size={14} />
                {t("I have a wallet prepared")}
              </Button>
            )}
          </Step>

          {/* Step 2: Register as relayer */}
          <Step
            number={2}
            title={t("Register as a Relayer")}
            disabled={!isStepEnabled(2)}
            completed={isStepCompleted(2)}
          >
            <Text textStyle="sm" color="text.subtle">
              {t(
                "Register your address on the RelayerRewardsPool contract to join the network. This is a one-time on-chain transaction.",
              )}
            </Text>
            {!isStepCompleted(2) && (
              <>
                {!account?.address ? (
                  <Button
                    onClick={() => openConnectModal()}
                    variant="solid"
                    rounded="full"
                    size="sm"
                    gap={2}
                  >
                    <LuWallet size={14} />
                    {t("Connect Wallet")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setRegisterModalOpen(true)}
                    variant="solid"
                    rounded="full"
                    size="sm"
                    gap={2}
                  >
                    <LuUserPlus size={14} />
                    {t("Register")}
                  </Button>
                )}
              </>
            )}
          </Step>

          {/* Step 3: Customize your profile */}
          <Step
            number={3}
            title={t("Customize Your Profile")}
            disabled={!isStepEnabled(3)}
            completed={isStepCompleted(3)}
          >
            <Text textStyle="sm" color="text.subtle">
              {t(
                "Switch to and connect with your relayer wallet, then customize your profile with an avatar, name, and description so users can recognize you.",
              )}
            </Text>
            {!isStepCompleted(3) && isStepEnabled(3) && (
              <Button
                onClick={() => {
                  openCustomization();
                  completeStep(3);
                }}
                variant="solid"
                rounded="full"
                size="sm"
                gap={2}
              >
                <LuPencil size={14} />
                {t("Customize")}
              </Button>
            )}
          </Step>

          {/* Step 4: Run the node */}
          <Step
            number={4}
            title={t("Run the Node")}
            disabled={!isStepEnabled(4)}
            completed={isStepCompleted(4)}
          >
            <Text textStyle="sm" color="text.subtle">
              {t(
                "Choose how to run your relayer node. You can run it directly in your browser, with Docker, or via npm.",
              )}
            </Text>
            {!isStepCompleted(4) && isStepEnabled(4) && (
              <RunOptions onRunInBrowser={handleRunInBrowser} />
            )}
          </Step>

          {/* Step 5: Share your profile */}
          <Step
            number={5}
            title={t("Share Your Profile")}
            disabled={!isStepEnabled(5)}
            completed={isStepCompleted(5)}
          >
            <Text textStyle="sm" color="text.subtle">
              {t(
                "Let people know you're a relayer so they can choose you. The more users you serve, the more you earn.",
              )}
            </Text>
            {!isStepCompleted(5) && isStepEnabled(5) && (
              <Button
                onClick={() => {
                  setShareModalOpen(true);
                  completeStep(5);
                }}
                variant="solid"
                rounded="full"
                size="sm"
                gap={2}
              >
                <LuShare2 size={14} />
                {t("Share")}
              </Button>
            )}
          </Step>

          {/* Step 6: Manage your relayer */}
          <Step
            number={6}
            title={t("Manage Your Relayer")}
            disabled={!isStepEnabled(6)}
          >
            <Text textStyle="sm" color="text.subtle">
              {t(
                "View your relayer's performance, track rewards, and manage your settings from the relayer dashboard.",
              )}
            </Text>
            {isStepEnabled(6) && (
              <Button
                onClick={() => router.push("/relayer")}
                variant="solid"
                rounded="full"
                size="sm"
                gap={2}
              >
                <LuRadar size={14} />
                {t("Manage Relayer")}
              </Button>
            )}
          </Step>
        </VStack>

        {/* Sidebar */}
        <Rules />
      </Grid>

      <RegisterRelayerModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      <ShareRelayerModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        relayerAddress={domain?.domain ?? account?.address}
      />
    </VStack>
  );
}
