"use client"

import dynamic from "next/dynamic"

import { DashboardSkeleton } from "./DashboardSkeleton"

const DashboardContent = dynamic(() => import("./DashboardContent"), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
})

export default function HomePage() {
  return <DashboardContent />
}
