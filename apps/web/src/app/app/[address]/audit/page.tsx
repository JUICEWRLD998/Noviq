"use client"

import { use, useMemo, useState } from "react"
import { AddressChip, ReasonBadge, StatusBadge, TxLink } from "@/components/chain"
import { PageHeader } from "@/components/layout"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { type ActionRow, useActions } from "@/hooks/useActions"
import { formatHsk, formatTime } from "@/lib/format"
import styles from "./audit.module.css"

type StatusFilter = "all" | "allowed" | "blocked" | "proposed"
type KindFilter = "all" | "agent" | "attack" | "owner"

const KIND_TONE = { agent: "neutral", attack: "danger", owner: "accent" } as const

function toCsv(rows: ActionRow[]): string {
  const head = ["time", "kind", "status", "recipient", "amount_wei", "reasonCode", "reason", "txHash"]
  const body = rows.map((r) =>
    [
      r.createdAt,
      r.kind,
      r.status,
      r.recipient ?? "",
      r.amount ?? r.value ?? "",
      r.reasonCode ?? "",
      (r.reasonLabel ?? "").replace(/"/g, '""'),
      r.txHash ?? "",
    ]
      .map((c) => `"${String(c)}"`)
      .join(","),
  )
  return [head.join(","), ...body].join("\n")
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params)
  const { data, isLoading, isError } = useActions(address, 200, 30_000)
  const [status, setStatus] = useState<StatusFilter>("all")
  const [kind, setKind] = useState<KindFilter>("all")

  const rows = useMemo(() => {
    let r = data ?? []
    if (status !== "all") r = r.filter((a) => a.status === status)
    if (kind !== "all") r = r.filter((a) => a.kind === kind)
    return r
  }, [data, status, kind])

  const short = address.slice(2, 10)

  return (
    <>
      <PageHeader
        kicker="Audit log"
        title="Compliance trail"
        description="Every proposed, allowed, and blocked action — attributable and timestamped. Export it for review."
        actions={
          <div className={styles.exports}>
            <Button
              size="sm"
              variant="outline"
              disabled={rows.length === 0}
              onClick={() => download(`noviq-audit-${short}.csv`, toCsv(rows), "text/csv")}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={rows.length === 0}
              onClick={() =>
                download(`noviq-audit-${short}.json`, JSON.stringify(rows, null, 2), "application/json")
              }
            >
              Export JSON
            </Button>
          </div>
        }
      />

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          {(["all", "allowed", "blocked", "proposed"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              className={styles.chip}
              data-active={status === s || undefined}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Kind</span>
          {(["all", "agent", "attack", "owner"] as KindFilter[]).map((k) => (
            <button
              key={k}
              type="button"
              className={styles.chip}
              data-active={kind === k || undefined}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <Card flush className={styles.tableCard}>
        <div className={styles.tableHead}>
          <span>Time</span>
          <span>Action</span>
          <span>Recipient</span>
          <span className={styles.num}>Amount</span>
          <span>Result</span>
          <span>Tx</span>
        </div>

        <div className={styles.tableBody}>
          {isLoading ? (
            <div className={styles.loading}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="2.5rem" />
              ))}
            </div>
          ) : isError ? (
            <p className={styles.empty}>Couldn’t load the audit trail.</p>
          ) : rows.length === 0 ? (
            <p className={styles.empty}>No actions match these filters.</p>
          ) : (
            rows.map((a) => (
              <div key={a.id} className={styles.row}>
                <time className={styles.time}>{formatTime(a.createdAt)}</time>
                <span>
                  <Badge tone={KIND_TONE[a.kind]}>{a.kind}</Badge>
                </span>
                <span>{a.recipient ? <AddressChip address={a.recipient} /> : "—"}</span>
                <span className={styles.num}>
                  {a.amount || a.value ? `${formatHsk(a.amount ?? a.value)} HSK` : "—"}
                </span>
                <span className={styles.result}>
                  <StatusBadge status={a.status} />
                  {a.status === "blocked" && <ReasonBadge code={a.reasonCode} />}
                </span>
                <span>{a.txHash ? <TxLink hash={a.txHash} /> : "—"}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  )
}
