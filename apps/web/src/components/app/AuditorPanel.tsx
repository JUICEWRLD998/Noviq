"use client"

import { Badge, type BadgeTone } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle } from "@/components/ui/Card"
import { useAuditStream } from "@/hooks/useAuditStream"
import { fadeUp } from "@/lib/motion"
import { motion } from "framer-motion"
import styles from "./auditor-panel.module.css"

const SEVERITY_TONE: Record<string, BadgeTone> = {
  info: "success",
  warn: "warning",
  critical: "danger",
}

export function AuditorPanel({ address }: { address: string }) {
  const { status, report, error, run } = useAuditStream(address)
  const busy = status === "generating"

  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle>Auditor</CardTitle>
        <Button size="sm" variant="outline" onClick={run} loading={busy}>
          {report ? "Re-run audit" : "Run audit"}
        </Button>
      </CardHeader>

      <p className={styles.lede}>
        A second AI reviews recent activity and narrates a compliance-grade summary.
      </p>

      {status === "idle" && !report && (
        <p className={styles.hint}>Run an audit to generate a narrative over the latest actions.</p>
      )}

      {busy && !report && (
        <div className={styles.generating}>
          <span className={styles.spinner} aria-hidden="true" />
          Reviewing on-chain activity…
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {report && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className={styles.report}>
          <div className={styles.reportHead}>
            <Badge tone={SEVERITY_TONE[report.severity] ?? "neutral"} dot>
              {report.severity}
            </Badge>
            {report.recommendSlash && <Badge tone="danger">Recommends slash</Badge>}
          </div>
          <p className={styles.narration}>{report.narration}</p>
          {report.flags.length > 0 && (
            <ul className={styles.flags}>
              {report.flags.map((f) => (
                <li key={f} className={styles.flag}>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </Card>
  )
}
