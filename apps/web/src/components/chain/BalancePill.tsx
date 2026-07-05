import { formatHsk } from "@/lib/format"
import styles from "./chain.module.css"

interface BalancePillProps {
  /** Balance in wei (string/bigint) or already-formatted HSK if `raw` is false. */
  wei?: string | bigint | null
  unit?: string
}

export function BalancePill({ wei, unit = "HSK" }: BalancePillProps) {
  return (
    <span className={styles.balance}>
      <span className={styles.balanceValue}>{formatHsk(wei)}</span>
      <span className={styles.balanceUnit}>{unit}</span>
    </span>
  )
}
