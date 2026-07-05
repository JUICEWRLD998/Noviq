"use client"

import { useState } from "react"
import styles from "./CodeBlock.module.css"

interface CodeBlockProps {
  code: string
  /** Show a copy button in the top-right. */
  copy?: boolean
  /** Cap the height and scroll (for long policy JSON / calldata). */
  scroll?: boolean
  label?: string
}

/** Mono block for addresses, policy JSON, calldata, tx hashes. */
export function CodeBlock({ code, copy = true, scroll = false, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      {copy && (
        <button
          type="button"
          className={styles.copy}
          onClick={onCopy}
          aria-label="Copy to clipboard"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
      <pre className={[styles.pre, scroll ? styles.scroll : ""].filter(Boolean).join(" ")}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
