"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./account-tabs.module.css"

export function AccountTabs({ address }: { address: string }) {
  const pathname = usePathname()
  const base = `/app/${address}`
  const tabs = [
    { href: base, label: "Dashboard" },
    { href: `${base}/editor`, label: "Covenant" },
    { href: `${base}/attack`, label: "Attack console" },
    { href: `${base}/audit`, label: "Audit log" },
  ]

  return (
    <nav className={styles.tabs} aria-label="Account sections">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname === t.href
        return (
          <Link key={t.href} href={t.href} className={styles.tab} data-active={active || undefined}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
