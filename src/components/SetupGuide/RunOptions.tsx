"use client"

import {
  Badge,
  Box,
  Button,
  Card,
  Clipboard,
  Code,
  HStack,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { FaAndroid, FaApple } from "react-icons/fa"
import {
  LuContainer,
  LuGlobe,
  LuPackage,
  LuPlay,
  LuSmartphone,
} from "react-icons/lu"

function CopyButton({ text }: { text: string }) {
  return (
    <Clipboard.Root value={text}>
      <Clipboard.Trigger asChild>
        <IconButton variant="ghost" size="xs" rounded="full" opacity={0.7} _hover={{ opacity: 1 }}>
          <Clipboard.Indicator />
        </IconButton>
      </Clipboard.Trigger>
    </Clipboard.Root>
  )
}

type Props = {
  onRunInBrowser: () => void
}

export function RunOptions({ onRunInBrowser }: Props) {
  return (
    <VStack gap={4} w="full">
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
        <Card.Root borderWidth="2px" borderColor="actions.primary.default">
          <Card.Body gap={4}>
            <HStack gap={3}>
              <Box p={2} borderRadius="lg" bg="bg.tertiary">
                <LuGlobe size={20} />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontWeight="bold" textStyle="md">
                  {"Run in Browser"}
                </Text>
                <Text textStyle="sm" color="text.subtle">
                  {"Paste your mnemonic and run directly here. No install needed."}
                </Text>
              </VStack>
            </HStack>
            <Button onClick={onRunInBrowser} variant="solid" rounded="full" size="sm" gap={2}>
              <LuPlay size={14} />
              {"Run Node"}
            </Button>
          </Card.Body>
        </Card.Root>

        <Card.Root borderWidth="2px" borderColor="border.secondary">
          <Card.Body gap={8}>
            <VStack gap={4}>
              <HStack gap={3} w="full" justify="start">
                <Box p={2} borderRadius="lg" bg="bg.tertiary">
                  <LuContainer size={20} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" textStyle="md">
                    {"Run with Docker"}
                  </Text>
                  <Text textStyle="sm" color="text.subtle">
                    {"Persistent, headless, auto-restarts."}
                  </Text>
                </VStack>
              </HStack>
              <HStack bg="bg.tertiary" borderRadius="md" px={3} py={2} justify="space-between">
                <Code bg="transparent" textStyle="xs" fontFamily="mono" wordBreak="break-all">
                  {'docker run -it --env MNEMONIC="..." ghcr.io/vechain/vebetterdao-relayer-node:1.0.0'}
                </Code>
                <CopyButton text='docker run -it --env MNEMONIC="..." ghcr.io/vechain/vebetterdao-relayer-node:1.0.0' />
              </HStack>
            </VStack>

            <VStack gap={4}>
              <HStack gap={3} w="full" justify="start">
                <Box p={2} borderRadius="lg" bg="bg.tertiary">
                  <LuPackage size={20} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" textStyle="md">
                    {"Run with npm"}
                  </Text>
                  <Text textStyle="sm" color="text.subtle">
                    {"One command, requires Node.js 20+."}
                  </Text>
                </VStack>
              </HStack>
              <HStack bg="bg.tertiary" borderRadius="md" px={3} py={2} justify="space-between" w="full">
                <Code bg="transparent" textStyle="xs" fontFamily="mono" wordBreak="break-all">
                  {'MNEMONIC="..." npx @vechain/vebetterdao-relayer-node@1.0.0'}
                </Code>
                <CopyButton text='MNEMONIC="..." npx @vechain/vebetterdao-relayer-node@1.0.0' />
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Card.Root borderWidth="2px" borderColor="border.secondary" opacity={0.6} w="full">
        <Card.Body gap={3}>
          <HStack gap={3} justify="space-between">
            <HStack>
              <Box p={2} borderRadius="lg" bg="bg.tertiary">
                <LuSmartphone size={20} />
              </Box>
              <VStack align="start" gap={0}>
                <HStack gap={2}>
                  <Text fontWeight="bold" textStyle="md">
                    {"Run on Phone"}
                  </Text>
                  <Badge variant="subtle" size="sm">
                    {"Coming soon"}
                  </Badge>
                </HStack>
                <Text textStyle="sm" color="text.subtle">
                  {"Run your relayer from your mobile device."}
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
    </VStack>
  )
}
