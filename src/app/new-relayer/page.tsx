import dynamic from "next/dynamic"

const SetupGuide = dynamic(
  () => import("@/components/SetupGuide").then(m => m.SetupGuide),
  { ssr: false },
)

export default function NewRelayerPage() {
  return <SetupGuide />
}
