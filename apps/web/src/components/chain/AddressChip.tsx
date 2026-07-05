"use client"

import { explorerAddress, shorten } from "@/lib/format"
import { useState } from "react"
import styles from "./chain.module.css"

interface AddressChipProps {
  address: string
  /** Link out to the explorer address page. */
  link?: boolean
  /** Enable click-to-copy. */
  copy?: boolean
  lead?: number
  tail?: number
}

export function AddressChip({
  address,
  link = false,
  copy = true,
  lead = 6,
  tail = 4,
}: AddressChipProps) {
  const [copied, setCopied] = useState(false)
  const short = shorten(address, lead, tail)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (link) {
    return (
      <a
        className={styles.chip}
        href={explorerAddress(address)}
        target="_blank"
        rel="noreferrer"
        title={address}
      >
        <span className={styles.mono}>{short}</span>
        <span className={styles.ext} aria-hidden="true">
          ↗
        </span>
      </a>
    )
  }

  if (copy) {
    return (
      <button type="button" className={styles.chip} onClick={onCopy} title={address}>
        <span className={styles.mono}>{short}</span>
        <span className={styles.ext} aria-hidden="true">
          {copied ? "✓" : "⧉"}
        </span>
      </button>
    )
  }

  return (
    <span className={`${styles.chip} ${styles.static}`} title={address}>
      <span className={styles.mono}>{short}</span>
    </span>
  )
}
