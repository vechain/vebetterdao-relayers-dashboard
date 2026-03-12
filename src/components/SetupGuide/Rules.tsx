import {
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Image,
  Link,
  Button,
} from "@chakra-ui/react";
import { Card } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import {
  LuZap,
  LuCoins,
  LuServer,
  LuScale,
  LuExternalLink,
} from "react-icons/lu";

export function Rules() {
  const { t } = useTranslation();
  return (
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
            {t(
              "Relayers are services that cast votes and claim rewards for users who enabled auto-voting. Anyone can run one — apps, community members, developers. You earn a share of rewards for the work you do.",
            )}
          </Text>
        </VStack>

        <HStack gap={4} align="start">
          <Box as="span" color="text.subtle" mt={1} flexShrink={0}>
            <LuZap />
          </Box>
          <VStack gap={1} align="start">
            <Text fontWeight="semibold">{t("What You Do")}</Text>
            <Text textStyle="sm" color="text.subtle">
              {t(
                "You run a relayer node that watches the blockchain. When a new round starts, it sees who has auto-voting enabled, submits their votes, and claims their rewards in batches.",
              )}
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
              {t(
                "Each user you serve pays 10% of their weekly rewards (max 100 B3TR) into a shared pool. At the end of the week, the pool is split among relayers based on work done.",
              )}
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
              {t(
                "A wallet with some VTHO for gas, the relayer node software, and a connection to a VeChain Thor node.",
              )}
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
              {t(
                "Every user must be served. If even one gets missed, nobody gets paid — the whole pool stays locked.",
              )}
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
  );
}
