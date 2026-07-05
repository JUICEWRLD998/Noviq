import patterns from "@noviq/design-tokens/patterns.module.css"
import type { HTMLAttributes } from "react"
import styles from "./Card.module.css"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Frosted-glass surface with an edge-light ring (for hero / emphasis). */
  glass?: boolean
  /** Remove default padding (for tables / custom layouts). */
  flush?: boolean
}

export function Card({ glass = false, flush = false, className, children, ...rest }: CardProps) {
  const cls = [
    styles.card,
    glass ? `${patterns.glassCard} ${patterns.edgeLight}` : styles.solid,
    flush ? styles.flush : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.header, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={[styles.title, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </h3>
  )
}
