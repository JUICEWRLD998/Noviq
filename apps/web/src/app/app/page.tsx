import { AccountCard } from "@/components/app/AccountCard"
import { Grid, PageHeader } from "@/components/layout"
import { buttonClassName } from "@/components/ui/Button"
import { type CovenantAccount, listAccounts } from "@noviq/db"
import Link from "next/link"
import styles from "./covenants.module.css"

export const dynamic = "force-dynamic"

async function loadAccounts(): Promise<{ accounts: CovenantAccount[]; error: string | null }> {
  try {
    return { accounts: await listAccounts(), error: null }
  } catch (err) {
    return { accounts: [], error: err instanceof Error ? err.message : "Failed to load covenants" }
  }
}

export default async function CovenantsPage() {
  const { accounts, error } = await loadAccounts()

  return (
    <>
      <PageHeader
        kicker="Console"
        title="Covenants"
        description="Smart-contract wallets bound by an on-chain covenant. Open one to watch its agent, run the attack console, or edit its policy."
        actions={
          <Link href="/app/new" className={buttonClassName("accent", "md")}>
            New covenant
          </Link>
        }
      />

      <div className={styles.body}>
        {error ? (
          <div className={styles.notice} data-tone="danger">
            <p className={styles.noticeTitle}>Couldn’t reach the database</p>
            <p className={styles.noticeText}>{error}</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>No covenants yet</p>
            <p className={styles.noticeText}>
              Deploy a CovenantAccount, fund it, and compile your first policy.
            </p>
            <Link href="/app/new" className={buttonClassName("accent", "md")}>
              Create your first covenant
            </Link>
          </div>
        ) : (
          <Grid min="18rem">
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </Grid>
        )}
      </div>
    </>
  )
}
