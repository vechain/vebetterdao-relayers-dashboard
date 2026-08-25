"use client";

import { useQuery } from "@tanstack/react-query";

import type { AnalyticsReport } from "@/lib/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Both dev and production read the same live report. The committed copy under
// public/data/ is only ever as fresh as the last `git pull`, and a stale one makes recent
// rounds render as "Round N not found" locally while production shows them fine — an easy
// way to chase a dashboard bug that doesn't exist. Set NEXT_PUBLIC_USE_LOCAL_REPORT=true
// to read the committed file instead (offline work, or testing a locally generated report).
const REPORT_URL =
  process.env.NEXT_PUBLIC_USE_LOCAL_REPORT === "true"
    ? `${basePath}/data/report.json`
    : "https://raw.githubusercontent.com/vechain/vebetterdao-relayers-dashboard/main/public/data/report.json";

async function fetchReport(): Promise<AnalyticsReport> {
  const res = await fetch(REPORT_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load report");
  return res.json() as Promise<AnalyticsReport>;
}

export function useReportData() {
  return useQuery({
    queryKey: ["relayer-report"],
    queryFn: fetchReport,
    staleTime: 5 * 60 * 1000,
  });
}
