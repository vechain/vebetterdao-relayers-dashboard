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
} from "react-icons/lu";
import { useWallet, useConnectModal, useVechainDomain, useAccountCustomizationModal } from "@vechain/vechain-kit";

import { RegisterRelayerModal } from "./RegisterRelayerModal";
import { ShareRelayerModal } from "./ShareRelayerModal";
import { RunOptions } from "./RunOptions";

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
          {t("Follow these steps to join the network and start earning B3TR rewards.")}
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
              {t("You need a VeChain wallet with some VTHO for gas fees. This wallet will be used to register as a relayer and run the node.")}
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
              {t("Register your address on the RelayerRewardsPool contract to join the network. This is a one-time on-chain transaction.")}
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
              {t("Switch to and connect with your relayer wallet, then customize your profile with an avatar, name, and description so users can recognize you.")}
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
              {t("Choose how to run your relayer node. You can run it directly in your browser, with Docker, or via npm.")}
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
              {t("Let people know you're a relayer so they can choose you. The more users you serve, the more you earn.")}
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
        </VStack>

        {/* Sidebar */}
        <Card.Root
          variant="primary"
          p={{ base: "5", md: "8" }}
          w="full"
          h="fit-content"
          position="sticky"
          top="4"
        >
          <VStack gap={6} align="stretch">
            <VStack gap={2} align="start">
              <Heading size="lg" fontWeight="bold">
                {t("What Are Relayers?")}
              </Heading>
              <Text color="text.subtle">
                {t("Relayers are services that cast votes and claim rewards for users who enabled auto-voting. Anyone can run one — apps, community members, developers. You earn a share of rewards for the work you do.")}
              </Text>
            </VStack>

            <HStack gap={4} align="start">
              <Box as="span" color="text.subtle" mt={1} flexShrink={0}>
                <LuZap />
              </Box>
              <VStack gap={1} align="start">
                <Text fontWeight="semibold">{t("What You Do")}</Text>
                <Text textStyle="sm" color="text.subtle">
                  {t("You run a relayer node that watches the blockchain. When a new round starts, it sees who has auto-voting enabled, submits their votes, and claims their rewards in batches.")}
                </Text>
              </VStack>
            </HStack>

            <HStack gap={4} align="start">
              <Box as="span" color="text.subtle" mt={1} flexShrink={0}>
                <LuCoins />
              </Box>
              <VStack gap={1} align="start">
                <Text fontWeight="semibold">{t("How You Earn")}</Text>
                <Text textStyle="sm" color="text.subtle">
                  {t("Each user you serve pays 10% of their weekly rewards (max 100 B3TR) into a shared pool. At the end of the week, the pool is split among relayers based on work done.")}
                </Text>
              </VStack>
            </HStack>

            <HStack gap={4} align="start">
              <Box as="span" color="text.subtle" mt={1} flexShrink={0}>
                <LuServer />
              </Box>
              <VStack gap={1} align="start">
                <Text fontWeight="semibold">{t("What You Need")}</Text>
                <Text textStyle="sm" color="text.subtle">
                  {t("A wallet with some VTHO for gas, the relayer node software, and a connection to a VeChain Thor node.")}
                </Text>
              </VStack>
            </HStack>

            <HStack gap={4} align="start">
              <Box as="span" color="text.subtle" mt={1} flexShrink={0}>
                <LuScale />
              </Box>
              <VStack gap={1} align="start">
                <Text fontWeight="semibold">{t("The Rules")}</Text>
                <Text textStyle="sm" color="text.subtle">
                  {t("Every user must be served. If even one gets missed, nobody gets paid — the whole pool stays locked.")}
                </Text>
              </VStack>
            </HStack>

            <HStack w="full" justify="center">
              <Image
                src="/assets/b3mo/B3MO_coding_02 1.png"
                maxW="200px"
                alt="B3MO Relayer"
                w="full"
                h="auto"
              />
            </HStack>
            <Link
              href="https://docs.vebetterdao.org/vebetter/automation"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" rounded="full" w="full">
                {t("Full Documentation")}
                <LuExternalLink />
              </Button>
            </Link>
          </VStack>
        </Card.Root>
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
