// Formatting helpers for chain data at the UI edge: wei → human units,
// truncated addresses/hashes, and explorer deep-links.

import { HSK_TESTNET } from "@noviq/sdk"
import { formatEther } from "viem"

const EXPLORER = (process.env.NEXT_PUBLIC_HSK_EXPLORER_URL ?? HSK_TESTNET.explorerUrl).replace(
  /\/$/,
  "",
)

/** `0x1234…abcd` — truncate a hex address/hash for display (keep mono font). */
export function shorten(hex: string, lead = 6, tail = 4): string {
  if (!hex) return ""
  if (hex.length <= lead + tail + 1) return hex
  return `${hex.slice(0, lead)}…${hex.slice(-tail)}`
}

/** Wei (string or bigint) → trimmed HSK amount, e.g. "12.5". */
export function formatHsk(wei: string | bigint | null | undefined, maxFrac = 4): string {
  if (wei === null || wei === undefined || wei === "") return "0"
  let value: bigint
  try {
    value = typeof wei === "bigint" ? wei : BigInt(wei)
  } catch {
    return "0"
  }
  const full = formatEther(value)
  const parts = full.split(".")
  const whole = parts[0] ?? "0"
  const frac = parts[1] ?? ""
  if (!frac) return whole
  const trimmed = frac.slice(0, maxFrac).replace(/0+$/, "")
  return trimmed ? `${whole}.${trimmed}` : whole
}

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`
}

export function explorerAddress(address: string): string {
  return `${EXPLORER}/address/${address}`
}

/** Locale time for audit rows / feed. Stable across SSR (UTC-safe short form). */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
