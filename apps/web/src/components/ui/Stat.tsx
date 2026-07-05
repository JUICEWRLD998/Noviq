import type { ReactNode } from "react"
import styles from "./Stat.module.css"

interface StatProps {
  label: ReactNode
  value: ReactNode
  /** Optional unit rendered muted after the value (e.g. "HSK"). */
  unit?: ReactNode
  hint?: ReactNode
}

/** A labelled figure with tabular-nums for money/addresses. */
export function Stat({ label, value, unit, hint }: StatProps) {
  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
