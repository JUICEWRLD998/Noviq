import { AccountBalance } from "@/components/app/AccountBalance"
import { AccountTabs } from "@/components/app/AccountTabs"
import { AddressChip } from "@/components/chain"
import { getAccountByAddress } from "@noviq/db"
import { notFound } from "next/navigation"
import styles from "./account.module.css"

export const dynamic = "force-dynamic"

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ address: string }>
}) {
  const { address } = await params
  const account = await getAccountByAddress(address)
  if (!account) notFound()

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.label}>Covenant account</span>
          <AddressChip address={account.address} link lead={10} tail={8} />
        </div>
        <AccountBalance address={account.address as `0x${string}`} />
      </div>
      <AccountTabs address={account.address} />
      <div className={styles.content}>{children}</div>
    </div>
  )
}
