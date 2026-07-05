"use client"

import { ConnectButton } from "@/components/chain"
import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./appbar.module.css"

const LINKS = [
  { href: "/app", label: "Covenants" },
  { href: "/styleguide", label: "Styleguide" },
]

export function AppBar() {
  const pathname = usePathname()
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <Link href="/" className={styles.wordmark}>
          Noviq
        </Link>
        <nav className={styles.nav}>
          {LINKS.map((l) => {
            const active = l.href === "/app" ? pathname === "/app" : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={styles.navLink}
                data-active={active || undefined}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <ConnectButton size="sm" />
    </header>
  )
}
