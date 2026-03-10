"use client";

import { useToken } from "@chakra-ui/react";
import { useCurrentLanguage } from "@vechain/vechain-kit";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getConfig } from "@/config";
import type { EnvConfig } from "@/config";
import dynamic from "next/dynamic";

import { useColorMode } from "@/components/ui/color-mode";

const VeChainKitProvider = dynamic(
  () => import("@vechain/vechain-kit").then((mod) => mod.VeChainKitProvider),
  {
    ssr: false,
  },
);

/** Syncs host app i18n language changes into VeChain Kit (e.g. footer LanguageSelector). */
function LanguageSync({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { setLanguage: setKitLanguage } = useCurrentLanguage();

  useEffect(() => {
    const handle = (lng: string) =>
      setKitLanguage(lng.split("-")[0] || "en");
    i18n.on("languageChanged", handle);
    return () => i18n.off("languageChanged", handle);
  }, [i18n, setKitLanguage]);

  return <>{children}</>;
}

interface Props {
  readonly children: React.ReactNode;
}

export function VechainKitProviderWrapper({ children }: Props) {
  const { colorMode } = useColorMode();
  const { i18n } = useTranslation();
  const isDarkMode = colorMode === "dark";
  const lang = i18n.language?.split("-")[0] ?? "en";

  const [
    bgPrimary,
    primaryDefault,
    primaryText,
    primaryHover,
    secondaryDefault,
    secondaryHover,
    borderSecondary,
  ] = useToken("colors", [
    "bg.primary",
    "actions.primary.default",
    "actions.primary.text",
    "actions.primary.hover",
    "card.subtle",
    "card.hover",
    "border.secondary",
  ]);

  const env = (process.env.NEXT_PUBLIC_APP_ENV ?? "mainnet") as EnvConfig;
  const config = getConfig(env);
  const networkType = config.network.type;

  return (
    <VeChainKitProvider
      theme={{
        modal: {
          backgroundColor: bgPrimary,
          border: `1px solid ${borderSecondary}`,
          useBottomSheetOnMobile: true,
        },
        buttons: {
          primaryButton: {
            bg: primaryDefault,
            color: primaryText,
            hoverBg: primaryHover,
            rounded: "full",
          },
          secondaryButton: {
            border: `1px solid ${borderSecondary}`,
            bg: secondaryDefault,
            hoverBg: secondaryHover,
          },
        },
      }}
      dappKit={{
        allowedWallets: ["veworld", "wallet-connect"],
        walletConnectOptions: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
          ? {
              projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
              metadata: {
                name: "VeBetter Relayers",
                description: "VeBetterDAO Auto-Voting VeBetter Relayers",
                url:
                  typeof window !== "undefined" ? window.location.origin : "",
                icons: [],
              },
            }
          : undefined,
      }}
      loginMethods={[
        { method: "vechain", gridColumn: 4 },
        { method: "dappkit", gridColumn: 4 },
      ]}
      darkMode={isDarkMode}
      language={lang}
      onLanguageChange={(language) => {
        if (i18n.language !== language) i18n.changeLanguage(language);
      }}
      network={{ type: networkType }}
    >
      <LanguageSync>{children}</LanguageSync>
    </VeChainKitProvider>
  );
}
