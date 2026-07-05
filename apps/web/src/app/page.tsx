import patterns from "@noviq/design-tokens/patterns.module.css"
import { clientEnv } from "@noviq/env"
import Link from "next/link"
import styles from "./page.module.css"

const HELLO_CONTRACT = "0x09Ade87D05bfF239e4a28bA266c2D88585D736C4"

export default function Home() {
  const env = clientEnv()
  const explorerContract = `${env.NEXT_PUBLIC_HSK_EXPLORER_URL}/address/${HELLO_CONTRACT}`

  return (
    <main className={styles.main}>
      <div className={`${patterns.mesh} ${patterns.filmGrain}`} aria-hidden="true" />

      <div className={`${styles.card} ${patterns.glassCard} ${patterns.edgeLight}`}>
        <p className={styles.kicker}>Noviq · Phase 1 · design system online</p>
        <h1 className={styles.title}>Don&apos;t trust the agent. Trust the covenant.</h1>
        <p className={styles.lede}>
          Programmable trust for autonomous AI money. Safety is enforced on-chain, not in the model.
        </p>

        <dl className={styles.grid}>
          <div className={styles.row}>
            <dt>Chain</dt>
            <dd>HSK Chain Testnet</dd>
          </div>
          <div className={styles.row}>
            <dt>Chain ID</dt>
            <dd className={styles.mono}>{env.NEXT_PUBLIC_HSK_CHAIN_ID}</dd>
          </div>
          <div className={styles.row}>
            <dt>RPC</dt>
            <dd className={styles.mono}>{env.NEXT_PUBLIC_HSK_RPC_URL}</dd>
          </div>
          <div className={styles.row}>
            <dt>Hello contract</dt>
            <dd className={styles.mono}>
              <a href={explorerContract} target="_blank" rel="noreferrer">
                {HELLO_CONTRACT}
              </a>
            </dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <Link className={styles.link} href="/styleguide">
            → View the styleguide
          </Link>
        </div>
      </div>
    </main>
  )
}
