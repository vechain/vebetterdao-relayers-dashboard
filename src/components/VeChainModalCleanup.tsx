"use client"

import { useEffect } from "react"

/**
 * Cleans up stale Chakra v2 modal artifacts left behind by VeChain Kit.
 *
 * VeChain Kit uses Chakra v2 internally while the host app uses Chakra v3.
 * When VeChain Kit modals close, their Chakra v2 overlay elements and body
 * scroll locks sometimes persist, blocking all pointer interactions on the page.
 *
 * This component observes the DOM and removes orphaned overlays / resets body
 * styles once the modal content has actually been removed.
 */
export function VeChainModalCleanup() {
  useEffect(() => {
    /**
     * Remove any Chakra v2 modal artifacts that are blocking the page.
     * We check for overlays that exist without a corresponding open modal.
     */
    function cleanup() {
      const overlays = document.querySelectorAll(".chakra-modal__overlay")
      const contentContainers = document.querySelectorAll(".chakra-modal__content-container")

      // If overlays exist but no content containers, the modal closed but cleanup failed
      if (overlays.length > 0 && contentContainers.length === 0) {
        overlays.forEach(overlay => overlay.remove())
        resetBodyStyles()
        return
      }

      // Also check for content containers that have no visible content
      if (contentContainers.length > 0) {
        const hasVisibleModal = Array.from(contentContainers).some(
          container => container.querySelector(".chakra-modal__content") !== null,
        )
        if (!hasVisibleModal) {
          contentContainers.forEach(container => container.remove())
          overlays.forEach(overlay => overlay.remove())
          resetBodyStyles()
        }
      }
    }

    function resetBodyStyles() {
      // Remove Chakra v2 scroll-lock artifacts
      document.body.style.removeProperty("overflow")
      document.body.style.removeProperty("padding-right")
      document.body.style.removeProperty("position")

      // Remove aria-hidden from the main app container set by Chakra v2 modals
      const nextRoot = document.getElementById("__next")
      if (nextRoot?.getAttribute("aria-hidden") === "true") {
        nextRoot.removeAttribute("aria-hidden")
      }

      // Remove data-scroll-locked attribute and class from react-remove-scroll
      if (document.documentElement.dataset.scrollLocked) {
        delete document.documentElement.dataset.scrollLocked
      }
      document.querySelectorAll("[data-remove-scroll-bar]").forEach(el => el.remove())
    }

    // Use a MutationObserver to detect when Chakra v2 modal elements change
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        // Check removed nodes – if modal content was removed but overlay remains
        if (mutation.removedNodes.length > 0) {
          // Small delay to let Chakra v2 finish its own cleanup
          setTimeout(cleanup, 100)
          return
        }
        // Check for attribute changes on body (e.g., stuck overflow: hidden)
        if (mutation.type === "attributes" && mutation.target === document.body) {
          const hasOverlay = document.querySelector(".chakra-modal__overlay")
          const hasContent = document.querySelector(".chakra-modal__content")
          if (!hasContent && !hasOverlay && document.body.style.overflow === "hidden") {
            resetBodyStyles()
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "aria-hidden"],
    })

    // Also run cleanup periodically as a safety net
    const interval = setInterval(cleanup, 2000)

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])

  return null
}
