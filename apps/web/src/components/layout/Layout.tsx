import type { HTMLAttributes, ReactNode } from "react"
import styles from "./Layout.module.css"

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Max content width. `wide` for dashboards, default for reading/marketing. */
  size?: "default" | "wide" | "narrow"
}

export function Container({ size = "default", className, children, ...rest }: ContainerProps) {
  return (
    <div
      className={[styles.container, styles[size], className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  )
}

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  align?: "start" | "center" | "end" | "stretch"
}

export function Stack({
  gap = 4,
  align = "stretch",
  className,
  children,
  style,
  ...rest
}: StackProps) {
  return (
    <div
      className={[styles.stack, className].filter(Boolean).join(" ")}
      style={{ gap: `var(--space-${gap})`, alignItems: align, ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Minimum column width; columns auto-fit and wrap responsively. */
  min?: string
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
}

export function Grid({ min = "16rem", gap = 5, className, children, style, ...rest }: GridProps) {
  return (
    <div
      className={[styles.grid, className].filter(Boolean).join(" ")}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`,
        gap: `var(--space-${gap})`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  kicker?: ReactNode
  title: ReactNode
  titleAs?: "h1" | "h2" | "h3"
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  kicker,
  title,
  titleAs: Title = "h1",
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
        <Title className={styles.pageTitle}>{title}</Title>
        {description && <p className={styles.pageDesc}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  )
}
