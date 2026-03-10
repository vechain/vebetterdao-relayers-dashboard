"use client"

import { useCallback, useEffect, useRef } from "react"
import {
  Button,
  Text,
  VStack,
  HStack,
  Box,
  Link,
} from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { FaXTwitter, FaTelegram, FaLink } from "react-icons/fa6"
import { LuPartyPopper, LuRadar } from "react-icons/lu"
import NextLink from "next/link"

import { BaseModal } from "@/components/Base/BaseModal"

type Props = {
  isOpen: boolean
  onClose: () => void
  relayerAddress?: string
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      rotation: number
      rotationSpeed: number
      opacity: number
    }[] = []

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 2,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      })
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let allDone = true
      for (const p of particles) {
        if (p.opacity <= 0) continue
        allDone = false

        p.x += p.vx
        p.vy += 0.15
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.opacity -= 0.008
        p.vx *= 0.99

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4)
        ctx.restore()
      }

      if (!allDone) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  )
}

export function ShareRelayerModal({ isOpen, onClose, relayerAddress }: Props) {
  const { t } = useTranslation()
  const dashboardUrl = typeof window !== "undefined"
    ? `${window.location.origin}/relayer?address=${relayerAddress ?? ""}`
    : ""

  const shareText = t("I just became a relayer on @VeBetterDAO! Choose me as your relayer and let's earn together.")

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(dashboardUrl)
  }, [dashboardUrl])

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(dashboardUrl)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(dashboardUrl)}&text=${encodeURIComponent(shareText)}`

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton>
      <VStack gap={6} py={4} align="center" position="relative" overflow="hidden" minH="300px">
        <ConfettiCanvas active={isOpen} />

        <Box color="actions.primary.default" zIndex={2}>
          <LuPartyPopper size={48} />
        </Box>

        <VStack gap={2} zIndex={2}>
          <Text textStyle="lg" fontWeight="bold" textAlign="center">
            {t("You're All Set!")}
          </Text>
          <Text textStyle="sm" color="text.subtle" textAlign="center">
            {t("Share your relayer profile so users can choose you as their preferred relayer.")}
          </Text>
        </VStack>

        <VStack gap={3} w="full" zIndex={2}>
          <Link
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            w="full"
            _hover={{ textDecoration: "none" }}
          >
            <Button variant="outline" rounded="full" w="full" gap={2}>
              <FaXTwitter />
              {t("Share on X")}
            </Button>
          </Link>

          <Link
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            w="full"
            _hover={{ textDecoration: "none" }}
          >
            <Button variant="outline" rounded="full" w="full" gap={2}>
              <FaTelegram />
              {t("Share on Telegram")}
            </Button>
          </Link>

          <Button
            variant="outline"
            rounded="full"
            w="full"
            gap={2}
            onClick={handleCopyLink}
          >
            <FaLink />
            {t("Copy Link")}
          </Button>
        </VStack>

        <HStack gap={3} zIndex={2}>
          <NextLink href="/relayer" onClick={onClose}>
            <Button variant="solid" size="sm" rounded="full" gap={2}>
              <LuRadar />
              {t("Manage Relayer")}
            </Button>
          </NextLink>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("Maybe later")}
          </Button>
        </HStack>
      </VStack>
    </BaseModal>
  )
}
