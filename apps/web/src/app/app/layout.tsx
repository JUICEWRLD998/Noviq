import { AppBar } from "@/components/app/AppBar"
import type { Metadata } from "next"
import styles from "./app.module.css"

export const metadata: Metadata = {
  title: "Noviq — Console",
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AppBar />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
