import type { ButtonHTMLAttributes } from "react"
import styles from "./Button.module.css"

type Variant = "accent" | "ghost" | "danger" | "outline"
type Size = "sm" | "md" | "lg"

/** Shared class builder so links can look identical to buttons. */
export function buttonClassName(variant: Variant = "accent", size: Size = "md", extra?: string) {
  return [styles.btn, styles[variant], styles[size], extra].filter(Boolean).join(" ")
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  variant = "accent",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClassName(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={styles.label} data-dim={loading || undefined}>
        {children}
      </span>
    </button>
  )
}
