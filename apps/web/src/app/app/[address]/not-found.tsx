import { buttonClassName } from "@/components/ui/Button"
import Link from "next/link"
import styles from "./account.module.css"

export default function AccountNotFound() {
  return (
    <div className={styles.notFound}>
      <h2 className={styles.notFoundTitle}>Covenant not found</h2>
      <p className={styles.notFoundText}>
        This account isn’t indexed yet, or the address is wrong. If you just deployed it, give the
        indexer a moment.
      </p>
      <Link href="/app" className={buttonClassName("accent", "md")}>
        Back to covenants
      </Link>
    </div>
  )
}
