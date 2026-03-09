"use client"

import {
  Box,
  Button,
  CloseButton,
  Drawer,
  Heading,
  HStack,
  IconButton,
  Link,
  Portal,
  Separator,
  useDisclosure,
  useMediaQuery,
  VStack,
} from "@chakra-ui/react"
import { useWallet, WalletButton } from "@vechain/vechain-kit"
import Image from "next/image"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { LuHouse, LuInfo, LuMenu, LuPlay, LuRadar, LuUsers } from "react-icons/lu"

import { ColorModeButton, useColorModeValue } from "@/components/ui/color-mode"
import { basePath } from "@/config/basePath"
import { useRelayerRegistration } from "@/hooks/useRelayerRegistration"

type NavPage = "home" | "relayers" | "relayer" | "run" | "learn"

type NavRoute = { value: NavPage; label: string; href: string; icon: typeof LuHouse }

const BASE_ROUTES: NavRoute[] = [
  { value: "home", label: "Home", href: "/", icon: LuHouse },
  { value: "relayers", label: "Relayers", href: "/relayers", icon: LuUsers },
  { value: "run", label: "Run", href: "/run", icon: LuPlay },
  { value: "learn", label: "Learn", href: "/learn", icon: LuInfo },
]

const MY_RELAYER_ROUTE: NavRoute = { value: "relayer", label: "My Relayer", href: "/relayer", icon: LuRadar }

export function Navbar() {
  const [isDesktop] = useMediaQuery(["(min-width: 1200px)"])
  const { open, onClose, onOpen } = useDisclosure()
  const pathname = usePathname()
  const { account } = useWallet()
  const { data: isRegistered } = useRelayerRegistration(account?.address)

  const routes: NavRoute[] = isRegistered
    ? [BASE_ROUTES[0]!, BASE_ROUTES[1]!, MY_RELAYER_ROUTE, ...BASE_ROUTES.slice(2)]
    : BASE_ROUTES
  const logoFilter = useColorModeValue("none", "brightness(0) invert(1)")
  const walletTextColor = useColorModeValue("#1A1A1A", "#E4E4E4")
  const walletHoverBg = useColorModeValue("#f8f8f8", "#2D2D2F")

  const isActive = (route: NavRoute) =>
    pathname === route.href ||
    (route.value === "home" && (pathname === "" || pathname === "/")) ||
    (route.value === "relayers" && pathname.startsWith("/relayers"))

  return (
    <Box bg="bg.secondary" px={0} position="sticky" top={0} zIndex={3} w="full">
      <HStack justify="space-between" p={isDesktop ? "16px 48px" : "8px 20px"}>
        <HStack flex="1" justifyContent="start">
          <Link asChild>
            <NextLink href={"/"}>
              <HStack gap={2} align="flex-start" w="full">
                <Image src={`${basePath}/assets/vb.svg`} alt="VeBetterDAO" width={28} height={28} style={{ filter: logoFilter }} />
                <Heading size="lg" fontWeight="bold">
                  {"Relayers"}
                </Heading>
              </HStack>
            </NextLink>
          </Link>
        </HStack>

        {isDesktop && (
          <Box position="absolute" left="50%" transform="translateX(-50%)" zIndex={1}>
            <HStack
              gap={2}
              justifyContent="center"
              borderRadius="full"
              border="sm"
              borderColor="border.secondary"
              bg="bg.primary"
              p={2}>
              {routes.map(route => (
                <NextLink key={route.value} href={route.href}>
                  <Button
                    border="none"
                    rounded="full"
                    variant={isActive(route) ? "subtle" : "ghost"}
                    size="sm"
                    fontWeight={isActive(route) ? "bold" : "normal"}
                    textStyle="sm"
                    px="4"
                    py="2">
                    {route.label}
                  </Button>
                </NextLink>
              ))}
            </HStack>
          </Box>
        )}

        <HStack flex="1" gap={2} justifyContent="end" alignItems="center">
          <NextLink href="/run">
            <Button variant="primary" size={isDesktop ? "md" : "sm"} rounded="full">
              <LuPlay />
              {"Run"}
            </Button>
          </NextLink>

          {isDesktop && (
            <>
              <WalletButton
                buttonStyle={{
                  variant: "outline",
                  size: "md",
                  borderRadius: "full",
                  textColor: walletTextColor,
                  _hover: { bg: walletHoverBg },
                }}
                connectionVariant="popover"
              />
            </>
          )}

          {!isDesktop && (
            <IconButton onClick={onOpen} variant="ghost" rounded="6px" size="lg" aria-label="Open menu">
              <LuMenu size={28} />
            </IconButton>
          )}
        </HStack>
      </HStack>

      {!isDesktop && (
        <Drawer.Root size="sm" placement="end" open={open} onOpenChange={e => !e.open && onClose()}>
          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner>
              <Drawer.Content maxWidth="95%" borderTopLeftRadius={16} borderBottomLeftRadius={16}>
                <Drawer.CloseTrigger asChild>
                  <CloseButton position="absolute" top={4} right={4} size="sm" />
                </Drawer.CloseTrigger>

                <Drawer.Header>
                  <Heading size="lg" fontWeight="bold">
                    {"VeBetter Relayers"}
                  </Heading>
                </Drawer.Header>

                <Drawer.Body px={5} display="flex" flexDirection="column" justifyContent="space-between">
                  <VStack gap={0} w="full" align="stretch">
                    <Box py={3} onClick={onClose}>
                      <WalletButton
                        buttonStyle={{
                          variant: "outline",
                          size: "md",
                          borderRadius: "full",
                          width: "100%",
                          textColor: walletTextColor,
                          _hover: { bg: walletHoverBg },
                        }}
                        connectionVariant="popover"
                      />
                    </Box>
                    <Separator my={2} />
                    {routes.map(route => (
                      <NextLink key={route.value} href={route.href} onClick={onClose}>
                        <Button
                          variant="ghost"
                          w="full"
                          display="flex"
                          justifyContent="flex-start"
                          alignItems="center"
                          gap={4}
                          size="lg"
                          fontWeight={isActive(route) ? "bold" : "normal"}>
                          <route.icon size={20} />
                          {route.label}
                        </Button>
                      </NextLink>
                    ))}
                  </VStack>
                  <Box pb={6}>
                    <Separator mb={4} />
                    <ColorModeButton withText w="full" display="flex" justifyContent="flex-start" size="lg" gap={4} />
                  </Box>
                </Drawer.Body>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
      )}
    </Box>
  )
}
