import type { HTMLAttributes } from "react"
import styles from "./Badge.module.css"

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Show a leading status dot. */
  dot?: boolean
}

export function Badge({ tone = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone], className].filter(Boolean).join(" ")} {...rest}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
