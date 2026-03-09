"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

import { RelayerDetailSkeleton } from "@/components/RelayerDetail"

const RelayerDetailPage = dynamic(() => import("@/app/relayer/RelayerDetailPage"), {
  ssr: false,
})

export default function RelayerPage() {
  return (
    <Suspense fallback={<RelayerDetailSkeleton />}>
      <RelayerDetailPage />
    </Suspense>
  )
}
