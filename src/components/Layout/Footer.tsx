"use client";

import {
  Box,
  Container,
  Flex,
  HStack,
  Link,
  SimpleGrid,
  Text,
  useMediaQuery,
  VStack,
  Image,
  Heading,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useTranslation } from "react-i18next";

import { basePath } from "@/config/basePath";
import { ColorModeToggle, useColorModeValue } from "../ui/color-mode";
import { LanguageSelector } from "./components/LanguageSelector";

const RESOURCES = [
  { labelKey: "Network Status", href: "https://vechainstats.com" },
  {
    labelKey: "API Documentation",
    href: "https://docs.vebetterdao.org/automation-and-relayers/automation",
  },
  { labelKey: "Governance App", href: "https://governance.vebetterdao.org" },
];

const GITHUB_REPOS = [
  {
    labelKey: "AI Skills",
    href: "https://github.com/vechain/vechain-ai-skills",
  },
  {
    labelKey: "Relayer Node",
    href: "https://github.com/vechain/vebetterdao-relayer-node",
  },
  {
    labelKey: "Contracts",
    href: "https://github.com/vechain/vebetterdao-contracts",
  },
];

const NAVIGATION = [
  { labelKey: "Home", href: "/" },
  { labelKey: "Rounds", href: "/rounds" },
  { labelKey: "Relayers", href: "/relayers" },
  { labelKey: "My Relayer", href: "/relayer" },
  { labelKey: "Become a Relayer", href: "/new-relayer" },
  { labelKey: "Run a Relayer", href: "/run" },
  { labelKey: "Learn", href: "/learn" },
];

function NavigationLinks() {
  const { t } = useTranslation();
  return (
    <VStack align="start" gap={2}>
      <Text fontWeight="bold" textStyle="sm">
        {t("NAVIGATION")}
      </Text>
      {NAVIGATION.map((item) => (
        <Link
          key={item.labelKey}
          asChild
          textStyle="xs"
          color="text.subtle"
          _hover={{ color: "text.default" }}
        >
          <NextLink href={item.href}>{t(item.labelKey)}</NextLink>
        </Link>
      ))}
    </VStack>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const [isDesktop] = useMediaQuery(["(min-width: 1200px)"]);
  const logoFilter = useColorModeValue("none", "brightness(0) invert(1)");

  const languageColumn = (
    <VStack align="start" gap={2}>
      <Text fontWeight="bold" textStyle="sm">
        {t("Language")}
      </Text>
      <LanguageSelector />
    </VStack>
  );

  return (
    <Box
      as="footer"
      borderTop="sm"
      borderColor="border.secondary"
      bg="bg.primary"
      mt={8}
    >
      <Container maxW="breakpoint-xl" px={4} py={{ base: 8, md: 10 }}>
        <Flex
          w="full"
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          gap={{ base: 8, md: 8 }}
        >
          <VStack align="start" gap={2} flexShrink={0}>
            <HStack gap={2} align="flex-start" w="full">
              <Image
                src={`${basePath}/assets/vb.svg`}
                alt="VeBetterDAO"
                width={7}
                height={7}
                style={{ filter: logoFilter }}
              />
              <Heading size="lg" fontWeight="bold">
                {t("VeBetter Relayers")}
              </Heading>
            </HStack>
            <Text textStyle="xs" color="text.subtle">
              {t("The central hub for managing and monitoring relayers.")}
            </Text>
            {isDesktop && <ColorModeToggle mt="2" />}
          </VStack>

          <SimpleGrid columns={{ base: 2, md: 4 }} gap={{ base: 8, md: 8 }}>
            {languageColumn}
            <VStack align="start" gap={2}>
              <Text fontWeight="bold" textStyle="sm">
                {t("Resources")}
              </Text>
              {RESOURCES.map((link) => (
                <Link
                  key={link.labelKey}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  textStyle="xs"
                  color="text.subtle"
                  _hover={{ color: "text.default" }}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </VStack>

            <VStack align="start" gap={2}>
              <Text fontWeight="bold" textStyle="sm">
                {t("GITHUB")}
              </Text>
              {GITHUB_REPOS.map((link) => (
                <Link
                  key={link.labelKey}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  textStyle="xs"
                  color="text.subtle"
                  _hover={{ color: "text.default" }}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </VStack>

            <NavigationLinks />
          </SimpleGrid>
        </Flex>

        <Text
          w="full"
          textStyle="xs"
          color="text.subtle"
          textAlign="center"
          pt={8}
        >
          {t("{{year}} VeBetterDAO Relayer Ecosystem. All rights reserved.", {
            year: new Date().getFullYear(),
          })}
        </Text>
      </Container>
    </Box>
  );
}
