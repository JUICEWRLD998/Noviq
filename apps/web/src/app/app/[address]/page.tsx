import { ActivityFeed } from "@/components/app/ActivityFeed"
import { AuditorPanel } from "@/components/app/AuditorPanel"
import { PolicySummary } from "@/components/app/PolicySummary"
import { getAccountByAddress, getActivePolicy } from "@noviq/db"
import { notFound } from "next/navigation"
import styles from "./dashboard.module.css"

export const dynamic = "force-dynamic"

export default async function DashboardPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  const account = await getAccountByAddress(address)
  if (!account) notFound()
  const policy = await getActivePolicy(account.id)

  return (
    <div className={styles.grid}>
      <div className={styles.main}>
        <PolicySummary
          policy={(policy?.policyJson as Record<string, unknown>) ?? null}
          version={policy?.version ?? null}
        />
        <ActivityFeed address={account.address} />
      </div>
      <aside className={styles.aside}>
        <AuditorPanel address={account.address} />
      </aside>
    </div>
  )
}
