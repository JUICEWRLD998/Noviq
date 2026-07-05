import { clientEnv } from "@noviq/env"
import styles from "./page.module.css"

export default function Home() {
  const env = clientEnv()

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <p className={styles.kicker}>Noviq · Phase 0 bring-up</p>
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
            <dt>Explorer</dt>
            <dd className={styles.mono}>
              <a href={env.NEXT_PUBLIC_HSK_EXPLORER_URL} target="_blank" rel="noreferrer">
                {env.NEXT_PUBLIC_HSK_EXPLORER_URL}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
