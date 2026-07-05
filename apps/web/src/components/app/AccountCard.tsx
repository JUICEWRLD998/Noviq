import { shorten } from "@/lib/format"
import type { CovenantAccount } from "@noviq/db"
import Link from "next/link"
import styles from "./account-card.module.css"

export function AccountCard({ account }: { account: CovenantAccount }) {
  return (
    <Link href={`/app/${account.address}`} className={styles.card}>
      <div className={styles.head}>
        <span className={styles.address}>{shorten(account.address, 8, 6)}</span>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      </div>
      <dl className={styles.meta}>
        <div className={styles.row}>
          <dt>Owner</dt>
          <dd>{shorten(account.ownerAddress, 6, 4)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Agent</dt>
          <dd>{shorten(account.agentAddress, 6, 4)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Chain</dt>
          <dd>{account.chainId}</dd>
        </div>
      </dl>
    </Link>
  )
}
