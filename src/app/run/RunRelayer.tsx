"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Clipboard,
  Code,
  Heading,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Address, HDKey } from "@vechain/sdk-core";
import { ThorClient } from "@vechain/sdk-network";
import type { NetworkConfig } from "@vechain/vebetterdao-relayer-node/dist/types";
import { getNetworkConfig } from "@vechain/vebetterdao-relayer-node/dist/config";
import { fetchSummary } from "@vechain/vebetterdao-relayer-node/dist/contracts";
import {
  runCastVoteCycle,
  runClaimRewardCycle,
} from "@vechain/vebetterdao-relayer-node/dist/relayer";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaAndroid, FaApple } from "react-icons/fa";
import {
  LuContainer,
  LuGlobe,
  LuMaximize2,
  LuMinimize2,
  LuPackage,
  LuPlay,
  LuSmartphone,
  LuSquare,
  LuCircleX,
} from "react-icons/lu";

import { RelayerTerminal } from "@/components/RelayerTerminal";

import {
  renderSummaryText,
  renderCycleResultText,
  logSectionHeaderText,
  ts,
} from "./format";

function deriveWallet(
  mnemonic: string,
): { walletAddress: string; privateKey: string } | null {
  try {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length < 12) return null;
    const child = HDKey.fromMnemonic(words).deriveChild(0);
    const raw = child.privateKey;
    if (!raw) return null;
    return {
      walletAddress: Address.ofPublicKey(
        child.publicKey as Uint8Array,
      ).toString(),
      privateKey: Buffer.from(raw).toString("hex"),
    };
  } catch {
    return null;
  }
}

function CopyButton({ text }: { text: string }) {
  return (
    <Clipboard.Root value={text}>
      <Clipboard.Trigger asChild>
        <IconButton
          variant="ghost"
          size="xs"
          rounded="full"
          opacity={0.7}
          _hover={{ opacity: 1 }}
        >
          <Clipboard.Indicator />
        </IconButton>
      </Clipboard.Trigger>
    </Clipboard.Root>
  );
}

export function RunRelayer() {
  const { t } = useTranslation();
  const [mnemonic, setMnemonic] = useState("");
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const abortRef = useRef(false);
  const writelnRef = useRef<((msg: string) => void) | null>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [stopRequested, setStopRequested] = useState(false);
  const forceExitResolveRef = useRef<(() => void) | null>(null);
  const suppressLogRef = useRef(false);

  // Clear mnemonic when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      setMnemonic("");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setMnemonic("");
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const activityLogRef = useRef<string[]>([]);
  const MAX_ACTIVITY_LOG = 200;

  const log = useCallback((msg: string) => {
    if (suppressLogRef.current) return;
    const entry = `${ts()} ${msg}`;
    activityLogRef.current.push(entry);
    if (activityLogRef.current.length > MAX_ACTIVITY_LOG) activityLogRef.current.shift();
    writelnRef.current?.(entry);
  }, []);

  const logRaw = useCallback((msg: string) => {
    activityLogRef.current.push(msg);
    if (activityLogRef.current.length > MAX_ACTIVITY_LOG) activityLogRef.current.shift();
    writelnRef.current?.(msg);
  }, []);

  const handleTerminalReady = useCallback(
    (writeln: (msg: string) => void, clear: () => void) => {
      writelnRef.current = writeln;
      clearRef.current = clear;
    },
    [],
  );

  const handleStart = useCallback(async () => {
    const wallet = deriveWallet(mnemonic);
    if (!wallet) {
      writelnRef.current?.(
        "\x1b[31mInvalid mnemonic. Enter a valid 12/24 word BIP39 phrase.\x1b[0m",
      );
      return;
    }

    abortRef.current = false;
    suppressLogRef.current = false;
    setStopRequested(false);
    setRunning(true);
    setStarted(true);
    setWalletAddress(wallet.walletAddress);
    activityLogRef.current = [];

    const forceExitPromise = new Promise<"force">((r) => {
      forceExitResolveRef.current = () => r("force");
    });
    const raceForceExit = <T,>(p: Promise<T>): Promise<T | null> =>
      Promise.race([p, forceExitPromise.then(() => null)]);

    const network = process.env.NEXT_PUBLIC_APP_ENV || "mainnet";
    const config: NetworkConfig = getNetworkConfig(network);
    const nodePool =
      network === "mainnet"
        ? [
            "https://mainnet.vechain.org",
            "https://vethor-node.vechain.com",
            "https://node-mainnet.vechain.energy",
            "https://mainnet.vecha.in",
          ]
        : ["https://testnet.vechain.org"];
    let nodeIndex = 0;
    let thor = ThorClient.at(config.nodeUrl, { isPollingEnabled: false });

    const refreshScreen = (summary: Awaited<ReturnType<typeof fetchSummary>>) => {
      clearRef.current?.();
      renderSummaryText(summary).forEach((line) => writelnRef.current?.(line));
      writelnRef.current?.("");
      writelnRef.current?.("─── Activity Log " + "─".repeat(49));
      for (const entry of activityLogRef.current.slice(-30)) {
        writelnRef.current?.(entry);
      }
    };

    const rotateNode = () => {
      if (nodePool.length <= 1) return;
      nodeIndex = (nodeIndex + 1) % nodePool.length;
      const nextUrl = nodePool[nodeIndex];
      if (nextUrl == null) return;
      config.nodeUrl = nextUrl;
      thor = ThorClient.at(config.nodeUrl, { isPollingEnabled: false });
      const host = new URL(config.nodeUrl).hostname;
      log(`\x1b[33mRotating to node: ${host}\x1b[0m`);
    };

    const cycleRetries = nodePool.length;
    const retryMs = 3000;

    // Initial summary on startup
    try {
      const initial = await raceForceExit(
        fetchSummary(thor, config, wallet.walletAddress),
      );
      if (initial === null) {
        setRunning(false);
        setStopRequested(false);
        return;
      }
      refreshScreen(initial);
    } catch {
      log("\x1b[33mCould not fetch initial summary, starting cycles...\x1b[0m");
    }

    while (!abortRef.current) {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= cycleRetries; attempt++) {
        try {
          const summary = await raceForceExit(
            fetchSummary(thor, config, wallet.walletAddress),
          );
          if (summary === null) break;
          if (abortRef.current) break;

          if (summary.isRoundActive) {
            logRaw(logSectionHeaderText("vote", summary.currentRoundId));
            const voteResult = await raceForceExit(
              runCastVoteCycle(
                thor,
                config,
                wallet.walletAddress,
                wallet.privateKey,
                50,
                false,
                log,
              ),
            );
            if (voteResult === null) break;
            if (abortRef.current) break;
            renderCycleResultText(voteResult).forEach(log);
          } else {
            log("\x1b[90mRound not active, skipping cast-vote\x1b[0m");
          }

          if (abortRef.current) break;

          logRaw("");
          logRaw(logSectionHeaderText("claim", summary.previousRoundId));
          const claimResult = await raceForceExit(
            runClaimRewardCycle(
              thor,
              config,
              wallet.walletAddress,
              wallet.privateKey,
              50,
              false,
              log,
            ),
          );
          if (claimResult === null) break;
          if (abortRef.current) break;
          renderCycleResultText(claimResult).forEach(log);

          const updated = await raceForceExit(
            fetchSummary(thor, config, wallet.walletAddress),
          );
          if (updated === null) break;
          refreshScreen(updated);

          lastErr = undefined;
          break;
        } catch (err) {
          lastErr = err;
          if (attempt < cycleRetries) {
            log(
              `\x1b[33mCycle attempt ${attempt}/${cycleRetries} failed, retrying in ${retryMs / 1000}s...\x1b[0m`,
            );
            rotateNode();
            await new Promise((r) => setTimeout(r, retryMs));
          }
        }
      }

      if (lastErr !== undefined) {
        log(
          `\x1b[31mCycle error: ${lastErr instanceof Error ? (lastErr as Error).message : String(lastErr)}\x1b[0m`,
        );
      }
      if (abortRef.current) break;

      logRaw("");
      log("\x1b[90mNext cycle in 5m...\x1b[0m");
      for (let i = 0; i < 300 && !abortRef.current; i++) {
        const r = await Promise.race([
          new Promise<"tick">((r) => setTimeout(() => r("tick"), 1000)),
          forceExitPromise.then(() => "force" as const),
        ]);
        if (r === "force") break;
      }
    }

    if (suppressLogRef.current) {
      writelnRef.current?.(`${ts()} \x1b[33mStopped.\x1b[0m`);
    } else {
      log("\x1b[33mStopped.\x1b[0m");
    }
    setRunning(false);
    setStopRequested(false);
  }, [mnemonic, log, logRaw]);

  const handleStop = useCallback(() => {
    setStopRequested(true);
    abortRef.current = true;
    log("\x1b[33mStopping after current operation...\x1b[0m");
  }, [log]);

  const handleForceExit = useCallback(() => {
    abortRef.current = true;
    suppressLogRef.current = true;
    forceExitResolveRef.current?.();
    forceExitResolveRef.current = null;
    writelnRef.current?.(`${ts()} \x1b[33mForce exiting...\x1b[0m`);
  }, []);

  return (
    <VStack gap={6} align="stretch" w="full">
      <VStack align="start" gap={1}>
        <Heading size="lg">
          {started ? t("Node output") : t("Run Relayer Node")}
        </Heading>
        <Text textStyle="sm" color="text.subtle">
          {started
            ? t("Live log from your relayer running in this browser. Stop or force exit above; close the tab to end the session.")
            : t("Choose how to run your relayer node. All options use the same core logic.")}
        </Text>
      </VStack>

      {!started && (
        <>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {/* Run in Browser */}
            <Card.Root borderWidth="2px" borderColor="actions.primary.default">
              <Card.Body gap={8}>
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="bg.tertiary">
                    <LuGlobe size={20} />
                  </Box>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="bold" textStyle="md">
                      {t("Run in Browser")}
                    </Text>
                    <Text textStyle="sm" color="text.subtle">
                      {t("Paste your mnemonic and run directly here. No install needed.")}
                    </Text>
                  </VStack>
                </HStack>

                <VStack align="start" gap={5}>
                  <Input
                    type="password"
                    placeholder={t("Enter your mnemonic...")}
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    fontFamily="mono"
                    size="lg"
                  />
                  <Text textStyle="xs" color="text.subtle">
                    {t("Stays in memory only — cleared when you leave.")}
                  </Text>
                  <HStack>
                    <Button
                      onClick={handleStart}
                      disabled={mnemonic.trim().split(/\s+/).length < 12}
                      variant="solid"
                      rounded="full"
                    >
                      <LuPlay />
                      {t("Start Relayer")}
                    </Button>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Docker + npm */}
            <Card.Root borderWidth="2px" borderColor="border.secondary">
              <Card.Body gap={8}>
                <VStack gap={4}>
                  <HStack gap={3} w="full" justify={"start"}>
                    <Box p={2} borderRadius="lg" bg="bg.tertiary">
                      <LuContainer size={20} />
                    </Box>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="bold" textStyle="md">
                        {t("Run with Docker")}
                      </Text>
                      <Text textStyle="sm" color="text.subtle">
                        {t("Persistent, headless, auto-restarts.")}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack
                    bg="bg.tertiary"
                    borderRadius="md"
                    px={3}
                    py={2}
                    justify="space-between"
                  >
                    <Code
                      bg="transparent"
                      textStyle="xs"
                      fontFamily="mono"
                      wordBreak="break-all"
                    >
                      {
                        'docker run -it --env MNEMONIC="..." ghcr.io/vechain/vebetterdao-relayer-node:1.1.0'
                      }
                    </Code>
                    <CopyButton text='docker run -it --env MNEMONIC="..." ghcr.io/vechain/vebetterdao-relayer-node:1.1.0' />
                  </HStack>
                </VStack>

                <VStack gap={4}>
                  <HStack gap={3} w="full" justify={"start"}>
                    <Box p={2} borderRadius="lg" bg="bg.tertiary">
                      <LuPackage size={20} />
                    </Box>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="bold" textStyle="md">
                        {t("Run with npm")}
                      </Text>
                      <Text textStyle="sm" color="text.subtle">
                        {t("One command, requires Node.js 20+.")}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack
                    bg="bg.tertiary"
                    borderRadius="md"
                    px={3}
                    py={2}
                    justify="space-between"
                    w="full"
                  >
                    <Code
                      bg="transparent"
                      textStyle="xs"
                      fontFamily="mono"
                      wordBreak="break-all"
                    >
                      {'MNEMONIC="..." npx @vechain/vebetterdao-relayer-node@1.1.0'}
                    </Code>
                    <CopyButton text='MNEMONIC="..." npx @vechain/vebetterdao-relayer-node@1.1.0' />
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>

          {/* Run on Phone — coming soon */}
          <Card.Root
            borderWidth="2px"
            borderColor="border.secondary"
            opacity={0.6}
          >
            <Card.Body gap={3}>
              <HStack gap={3} justify="space-between">
                <HStack>
                  <Box p={2} borderRadius="lg" bg="bg.tertiary">
                    <LuSmartphone size={20} />
                  </Box>
                  <VStack align="start" gap={0}>
                    <HStack gap={2}>
                      <Text fontWeight="bold" textStyle="md">
                        {t("Run on Phone")}
                      </Text>
                      <Badge variant="subtle" size="sm">
                        {t("Coming soon")}
                      </Badge>
                    </HStack>
                    <Text textStyle="sm" color="text.subtle">
                      {t("Run your relayer from your mobile device.")}
                    </Text>
                  </VStack>
                </HStack>
                <HStack gap={4} justify="center" py={4}>
                  <FaAndroid size={32} />
                  <FaApple size={32} />
                </HStack>
              </HStack>
            </Card.Body>
          </Card.Root>
        </>
      )}

      {started && (
        <Box>
          <HStack
            mb={3}
            gap={2}
            align="center"
            py={1}
            flexWrap="wrap"
            justify="space-between"
          >
            <HStack gap={2} minW={0}>
              <Box
                w={2}
                h={2}
                borderRadius="full"
                flexShrink={0}
                bg={
                  running && !stopRequested
                    ? "green.400"
                    : stopRequested
                      ? "orange.400"
                      : "red.400"
                }
              />
              <Text
                textStyle="sm"
                fontFamily="mono"
                color="text.subtle"
                truncate
              >
                {running && !stopRequested
                  ? t("Running")
                  : stopRequested
                    ? t("Stopping")
                    : t("Stopped")}
                {walletAddress &&
                  ` · ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </Text>
              {walletAddress && <CopyButton text={walletAddress} />}
            </HStack>

            <HStack
              gap={2}
              flexShrink={0}
              css={{ touchAction: "manipulation" }}
            >
              {running ? (
                stopRequested ? (
                  <Button
                    onClick={handleForceExit}
                    colorPalette="red"
                    variant="outline"
                    rounded="full"
                    size="sm"
                    minH="44px"
                    minW="44px"
                    css={{ touchAction: "manipulation" }}
                  >
                    <LuCircleX />
                    {t("Force exit")}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStop}
                    colorPalette="red"
                    variant="outline"
                    rounded="full"
                    size="sm"
                    minH="44px"
                    minW="44px"
                    css={{ touchAction: "manipulation" }}
                  >
                    <LuSquare />
                    {t("Stop")}
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleStart}
                  variant="solid"
                  rounded="full"
                  size="sm"
                  minH="44px"
                  css={{ touchAction: "manipulation" }}
                >
                  <LuPlay />
                  {t("Restart")}
                </Button>
              )}
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                rounded="full"
                size="sm"
                minH="44px"
                minW="44px"
                title={isFullscreen ? t("Exit fullscreen") : t("Fullscreen")}
                css={{ touchAction: "manipulation" }}
              >
                {isFullscreen ? <LuMinimize2 /> : <LuMaximize2 />}
                {isFullscreen ? t("Exit fullscreen") : t("Fullscreen")}
              </Button>
            </HStack>
          </HStack>

          <Box
            ref={fullscreenRef}
            position={isFullscreen ? "fixed" : "relative"}
            inset={isFullscreen ? 0 : undefined}
            zIndex={isFullscreen ? 9999 : 1}
            bg="#1a1a2e"
            borderRadius={isFullscreen ? 0 : "12px"}
            display={isFullscreen ? "flex" : "block"}
            flexDirection={isFullscreen ? "column" : undefined}
            minH={isFullscreen ? undefined : { base: "360px", md: "420px" }}
            css={isFullscreen ? { overscrollBehavior: "none" } : undefined}
          >
            {isFullscreen && (
              <Button
                position="absolute"
                top={2}
                right={2}
                zIndex={10}
                size="sm"
                variant="outline"
                rounded="full"
                onClick={toggleFullscreen}
                bg="bg.panel"
                _hover={{ bg: "bg.tertiary" }}
              >
                <LuMinimize2 />
                {t("Exit fullscreen")}
              </Button>
            )}
            <RelayerTerminal
              onReady={handleTerminalReady}
              fullscreen={isFullscreen}
            />
          </Box>
        </Box>
      )}
    </VStack>
  );
}
