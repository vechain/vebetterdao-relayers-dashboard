import type { RelayerSummary, CycleResult } from "@vechain/vebetterdao-relayer-node/dist/types"

const RELAYER_NODE_VERSION = "1.1.0"

// ANSI color helpers for xterm
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  brightGreen: "\x1b[92m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
}

function formatB3TR(wei: bigint): string {
  const whole = wei / 10n ** 18n
  const frac = (wei % 10n ** 18n) / 10n ** 16n
  return `${whole}.${frac.toString().padStart(2, "0")} B3TR`
}

function formatVOT3(wei: bigint): string {
  const whole = wei / 10n ** 18n
  const frac = (wei % 10n ** 18n) / 10n ** 16n
  return `${whole}.${frac.toString().padStart(2, "0")} VOT3`
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4)
}

function pct(num: bigint, den: bigint): string {
  if (den === 0n) return "—"
  return ((Number(num) / Number(den)) * 100).toFixed(2) + "%"
}

function stripAnsi(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, "").length
}

function pad(left: string, right: string, width: number = 62): string {
  const gap = width - stripAnsi(left) - stripAnsi(right)
  return left + " ".repeat(Math.max(1, gap)) + right
}

// Round status (aligned with relayer-node display logic)
interface RoundStatus {
  label: string
  color: string
  hint: string
}

function getCurrentRoundStatus(s: RelayerSummary): RoundStatus {
  if (s.autoVotingUsers === 0) {
    return {
      label: "N/A",
      color: c.gray,
      hint: "No auto-voting users registered for this round.",
    }
  }
  if (!s.isRoundActive) {
    return {
      label: "Voting complete",
      color: c.blue,
      hint: "Round ended. Waiting for new round to start.",
    }
  }
  const votingPortion = s.currentTotalWeighted * 3n / 4n
  if (s.currentTotalWeighted > 0n && s.currentCompletedWeighted >= votingPortion) {
    return {
      label: "Voting complete",
      color: c.blue,
      hint: "All votes cast. Waiting for round to end to start claiming rewards.",
    }
  }
  return {
    label: "Voting in progress",
    color: c.yellow,
    hint: "Cast votes for remaining users.",
  }
}

function getPreviousRoundStatus(s: RelayerSummary): RoundStatus {
  const prevId = s.previousRoundId ?? 0
  const prevTotalWeighted = s.previousTotalWeighted ?? 0n
  if (prevId === 0 || prevTotalWeighted === 0n) {
    return {
      label: "N/A",
      color: c.gray,
      hint: "No auto-voting users were registered for this round.",
    }
  }
  if (s.previousRewardClaimable) {
    const hasShare = (s.previousRelayerClaimable ?? 0n) > 0n
    return {
      label: "Actions completed",
      color: c.green,
      hint: hasShare
        ? "All actions done. Pool unlocked — claim your relayer rewards!"
        : "All actions done. Pool unlocked.",
    }
  }
  const votingPortion = prevTotalWeighted * 3n / 4n
  const prevCompleted = s.previousCompletedWeighted ?? 0n
  if (prevCompleted < votingPortion) {
    return {
      label: "Rewards Locked",
      color: c.red,
      hint: "Some users were never voted for. Pool is locked — no relayer can claim rewards.",
    }
  }
  return {
    label: "Claiming in progress",
    color: c.magenta,
    hint: "All votes done. Claim rewards for remaining users to unlock the pool.",
  }
}

export function ts(): string {
  return `${c.gray}[${new Date().toLocaleTimeString()}]${c.reset}`
}

export function logSectionHeaderText(phase: "vote" | "claim", roundId: number): string {
  const icon = phase === "vote" ? "🗳" : "💰"
  const label = phase === "vote" ? "Cast Vote" : "Claim Rewards"
  const text = ` ${icon}  ${label} · Round #${roundId} `
  const lineLen = 60 - text.length
  const left = Math.max(1, Math.floor(lineLen / 2))
  const right = Math.max(1, lineLen - left)
  return `${c.bold}${"─".repeat(left)}${text}${"─".repeat(right)}${c.reset}`
}

export function renderSummaryText(s: RelayerSummary): string[] {
  const out: string[] = []
  const div = `${c.dim}${"─".repeat(60)}${c.reset}`

  out.push("")
  out.push(`  ${c.cyan}${c.bold}VeBetterDAO Relayer Node${c.reset}  ${c.dim}v${RELAYER_NODE_VERSION}${c.reset}`)
  out.push(`  ${div}`)
  out.push("")

  const reg = s.isRegistered ? `${c.green}Registered${c.reset}` : `${c.red}Not registered${c.reset}`
  out.push(
    `  ${c.dim}Network${c.reset}  ${c.bold}${c.white}${s.network}${c.reset}              ${c.dim}Block${c.reset} ${c.white}${s.latestBlock.toLocaleString()}${c.reset}`,
  )
  out.push(`  ${c.dim}Node${c.reset}     ${c.gray}${new URL(s.nodeUrl).hostname}${c.reset}`)
  out.push(`  ${c.dim}Address${c.reset}  ${c.yellow}${shortAddr(s.relayerAddress)}${c.reset}              ${reg}`)
  if (!s.isRegistered) {
    out.push(`  ${c.red}${c.italic}  Go to relayer.vebetterdao.org/new-relayer to register as a relayer${c.reset}`)
  }
  const prefCount = s.preferredUsersCount > 0
    ? `${c.cyan}${c.bold}${s.preferredUsersCount}${c.reset}${c.dim} users chose you as default${c.reset}`
    : `${c.dim}no users yet${c.reset}`
  out.push(`  ${c.dim}Preferred${c.reset} ${prefCount}`)

  out.push("")
  out.push(`  ${div}`)
  out.push("")

  const feeStr = s.feeDenominator > 0n ? pct(s.feePercentage, s.feeDenominator) : "—"
  out.push(
    `  ${c.dim}Weights${c.reset}  ${c.white}vote=${s.voteWeight}${c.reset}${c.dim} / ${c.reset}${c.white}claim=${s.claimWeight}${c.reset}    ${c.dim}Fee${c.reset} ${c.yellow}${feeStr}${c.reset}${c.dim} cap ${c.reset}${c.yellow}${formatB3TR(s.feeCap)}${c.reset}`,
  )

  out.push("")
  out.push(`  ${div}`)
  out.push("")

  const currentStatus = getCurrentRoundStatus(s)
  out.push(`  ${c.cyan}${c.bold}Round #${s.currentRoundId}${c.reset}  ${currentStatus.color}${currentStatus.label}${c.reset}`)
  out.push(`  ${c.dim}${c.italic}  ${currentStatus.hint}${c.reset}`)
  out.push("")
  out.push(
    `  ${c.dim}Auto-voters${c.reset} ${c.bold}${c.white}${s.autoVotingUsers}${c.reset}              ${c.dim}Relayers${c.reset} ${c.bold}${c.white}${s.registeredRelayers.length}${c.reset}`,
  )
  out.push(`  ${c.dim}Voters${c.reset}      ${c.white}${s.totalVoters}${c.reset}`)
  out.push(
    `  ${c.dim}Snapshot${c.reset}    ${c.white}${s.roundSnapshot}${c.reset}              ${c.dim}Deadline${c.reset} ${c.white}${s.roundDeadline}${c.reset}`,
  )

  const voteEaEnd = s.roundSnapshot + Number(s.earlyAccessBlocks)
  const voteEaRemaining = voteEaEnd - s.latestBlock
  if (voteEaRemaining > 0) {
    out.push(`  ${c.dim}Early access${c.reset} ${c.white}ends in ${voteEaRemaining.toLocaleString()} blocks${c.reset}`)
  } else {
    out.push(`  ${c.dim}Early access${c.reset} ${c.dim}ended${c.reset}`)
  }

  out.push("")

  const votingPortion = s.currentTotalWeighted > 0n ? s.currentTotalWeighted * 3n / 4n : 0n
  const cappedVoting = s.currentCompletedWeighted > votingPortion ? votingPortion : s.currentCompletedWeighted
  const votingPctStr = votingPortion > 0n ? pct(cappedVoting, votingPortion) : "—"
  const votingDone = votingPortion > 0n && s.currentCompletedWeighted >= votingPortion
  const votingColor = votingDone ? c.green : c.yellow
  out.push(`  ${pad(`${c.dim}Voting${c.reset}      ${votingColor}${votingPctStr}${c.reset}`, "")}`)

  const projectedShareStr =
    s.currentTotalWeighted > 0n && s.currentRelayerWeighted > 0n
      ? pct(s.currentRelayerWeighted, s.currentTotalWeighted)
      : "—"
  out.push(
    `  ${pad(
      `${c.dim}Your actions${c.reset} ${c.white}${s.currentRelayerActions}${c.reset}${c.dim} (wt: ${c.reset}${c.white}${s.currentRelayerWeighted}${c.reset}${c.dim})${c.reset}`,
      `${c.dim}Est. share${c.reset} ${c.cyan}${projectedShareStr}${c.reset}`,
    )}`,
  )

  if (s.previousRoundId > 0) {
    out.push("")
    out.push(`  ${div}`)
    out.push("")

    const prevStatus = getPreviousRoundStatus(s)
    out.push(`  ${c.cyan}${c.bold}Round #${s.previousRoundId}${c.reset}  ${prevStatus.color}${prevStatus.label}${c.reset}`)
    out.push(`  ${c.dim}${c.italic}  ${prevStatus.hint}${c.reset}`)

    const prevDeadline = s.previousRoundDeadline ?? 0
    if (prevStatus.label === "Claiming in progress" && prevDeadline > 0) {
      const claimEaEnd = prevDeadline + Number(s.earlyAccessBlocks)
      const claimEaRemaining = claimEaEnd - s.latestBlock
      if (claimEaRemaining > 0) {
        out.push(`  ${c.dim}  Early access${c.reset} ${c.white}ends in ${claimEaRemaining.toLocaleString()} blocks${c.reset}`)
      } else {
        out.push(`  ${c.dim}  Early access${c.reset} ${c.dim}ended${c.reset}`)
      }
    }

    out.push("")

    const prevTotalWeighted = s.previousTotalWeighted ?? 0n
    if (prevTotalWeighted > 0n) {
      const prevCompleted = s.previousCompletedWeighted ?? 0n
      const overallPct = pct(prevCompleted, prevTotalWeighted)
      let progressColor: string
      if (prevStatus.label === "Actions completed") progressColor = c.green
      else if (prevStatus.label === "Rewards Locked") progressColor = c.red
      else progressColor = c.magenta
      const prevMissed = s.previousMissedUsers ?? 0n
      out.push(
        `  ${pad(
          `${c.dim}Progress${c.reset}    ${progressColor}${overallPct}${c.reset}`,
          `${c.dim}Missed${c.reset} ${prevMissed > 0n ? c.red : c.green}${prevMissed}${c.reset}`,
        )}`,
      )
    }

    out.push(`  ${pad(`${c.dim}Pool${c.reset}        ${c.green}${formatB3TR(s.previousTotalRewards)}${c.reset}`, "")}`)

    const prevCompleted = s.previousCompletedWeighted ?? 0n
    const prevRelayerWeighted = s.previousRelayerWeighted ?? 0n
    const earnedWei =
      prevCompleted > 0n && prevRelayerWeighted > 0n
        ? (s.previousTotalRewards * prevRelayerWeighted) / prevCompleted
        : 0n
    const previousRelayerClaimable = s.previousRelayerClaimable ?? 0n
    const alreadyClaimed = earnedWei > 0n && previousRelayerClaimable === 0n

    if (alreadyClaimed) {
      out.push(
        `  ${pad(
          `${c.dim}You earned${c.reset}  ${c.brightGreen}${c.bold}${formatB3TR(earnedWei)}${c.reset}`,
          `${c.green}✓ Claimed${c.reset}`,
        )}`,
      )
    } else if (previousRelayerClaimable > 0n) {
      out.push(
        `  ${pad(
          `${c.dim}Your share${c.reset}  ${c.brightGreen}${c.bold}${formatB3TR(previousRelayerClaimable)}${c.reset}`,
          `${c.yellow}Unclaimed${c.reset}`,
        )}`,
      )
    } else {
      out.push(`  ${pad(`${c.dim}Your share${c.reset}  ${c.dim}0.00 B3TR${c.reset}`, "")}`)
    }

    const prevActions = s.previousRelayerActions ?? 0n
    const prevWeighted = s.previousRelayerWeighted ?? 0n
    out.push(
      `  ${pad(
        `${c.dim}Your actions${c.reset} ${c.white}${prevActions}${c.reset}${c.dim} (wt: ${c.reset}${c.white}${prevWeighted}${c.reset}${c.dim})${c.reset}`,
        "",
      )}`,
    )
  }

  out.push("")
  return out
}

export function renderCycleResultText(r: CycleResult): string[] {
  const lines: string[] = []
  const tag = r.phase === "vote" ? `${c.cyan}Vote${c.reset}` : `${c.magenta}Claim${c.reset}`
  const dryTag = r.dryRun ? ` ${c.yellow}(DRY RUN)${c.reset}` : ""

  if (r.totalUsers === 0) {
    lines.push(`${tag} ${c.dim}no users to process${c.reset}${dryTag}`)
    return lines
  }

  const ratio =
    r.successful === r.totalUsers
      ? `${c.green}${c.bold}${r.successful}/${r.totalUsers}${c.reset}`
      : `${c.yellow}${r.successful}/${r.totalUsers}${c.reset}`
  lines.push(`${tag} ${ratio} successful${dryTag}`)

  if (r.failed.length > 0)
    lines.push(
      `${c.red}  ${r.failed.length} failed${c.reset}${c.gray} (${r.failed
        .slice(0, 3)
        .map((f) => shortAddr(f.user))
        .join(", ")}${r.failed.length > 3 ? "..." : ""})${c.reset}`,
    )

  if (r.transient.length > 0) lines.push(`${c.yellow}  ${r.transient.length} transient failures${c.reset}`)

  if (r.txIds.length > 0 && !r.dryRun)
    lines.push(`${c.gray}  txs: ${r.txIds.map((t) => t.slice(0, 10) + "...").join(", ")}${c.reset}`)

  return lines
}
