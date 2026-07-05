import { explorerTx, shorten } from "@/lib/format"
import styles from "./chain.module.css"

interface TxLinkProps {
  hash: string
  label?: string
}

/** Link to a transaction on the HSK testnet explorer. */
export function TxLink({ hash, label }: TxLinkProps) {
  return (
    <a
      className={styles.chip}
      href={explorerTx(hash)}
      target="_blank"
      rel="noreferrer"
      title={hash}
    >
      <span className={styles.mono}>{label ?? shorten(hash, 10, 6)}</span>
      <span className={styles.ext} aria-hidden="true">
        ↗
      </span>
    </a>
  )
}
