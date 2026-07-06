"use client"

import { AddressChip, ReasonBadge, StatusBadge, TxLink } from "@/components/chain"
import { PageHeader } from "@/components/layout"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Field"
import { Skeleton } from "@/components/ui/Skeleton"
import { type ActionRow, useActions } from "@/hooks/useActions"
import { formatHsk, formatTime } from "@/lib/format"
import { use, useMemo, useState } from "react"
import styles from "./audit.module.css"

type StatusFilter = "all" | "allowed" | "blocked" | "proposed"
type KindFilter = "all" | "agent" | "attack" | "owner"

const STATUS_FILTERS: StatusFilter[] = ["all", "allowed", "blocked", "proposed"]
const KIND_FILTERS: KindFilter[] = ["all", "agent", "attack", "owner"]
const KIND_TONE = { agent: "neutral", attack: "danger", owner: "accent" } as const

function toCsv(rows: ActionRow[]): string {
  const head = [
    "time",
    "kind",
    "status",
    "recipient",
    "amount_wei",
    "reasonCode",
    "reason",
    "txHash",
  ]
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
  const [query, setQuery] = useState("")

  const rows = useMemo(() => {
    let r = data ?? []
    if (status !== "all") r = r.filter((a) => a.status === status)
    if (kind !== "all") r = r.filter((a) => a.kind === kind)
    const q = query.trim().toLowerCase()
    if (q) {
      r = r.filter(
        (a) =>
          a.recipient?.toLowerCase().includes(q) ||
          a.txHash?.toLowerCase().includes(q) ||
          a.reasonLabel?.toLowerCase().includes(q),
      )
    }
    return r
  }, [data, status, kind, query])

  const total = data?.length ?? 0
  const filtered = status !== "all" || kind !== "all" || query.trim() !== ""
  const short = address.slice(2, 10)
  const empty = rows.length === 0

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
              disabled={empty}
              onClick={() => download(`noviq-audit-${short}.csv`, toCsv(rows), "text/csv")}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={empty}
              onClick={() =>
                download(
                  `noviq-audit-${short}.json`,
                  JSON.stringify(rows, null, 2),
                  "application/json",
                )
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
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.chip}
              data-active={status === s || undefined}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Kind</span>
          {KIND_FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              className={styles.chip}
              data-active={kind === k || undefined}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient, tx, or reason…"
            aria-label="Search the audit trail"
          />
        </div>
      </div>

      <p className={styles.count} aria-live="polite">
        {isLoading ? (
          "Loading…"
        ) : (
          <>
            <strong>{rows.length}</strong> {rows.length === 1 ? "action" : "actions"}
            {filtered && total > 0 ? ` of ${total}` : ""}
          </>
        )}
      </p>

      <Card flush className={styles.tableCard}>
        <div className={styles.tableHead} role="presentation">
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
          ) : empty ? (
            <p className={styles.empty}>
              {total === 0 ? "No actions recorded yet." : "No actions match these filters."}
            </p>
          ) : (
            rows.map((a) => (
              <div key={a.id} className={styles.row}>
                <time className={styles.time} dateTime={a.createdAt}>
                  {formatTime(a.createdAt)}
                </time>
                <span data-label="Action">
                  <Badge tone={KIND_TONE[a.kind]}>{a.kind}</Badge>
                </span>
                <span data-label="Recipient">
                  {a.recipient ? <AddressChip address={a.recipient} /> : "—"}
                </span>
                <span className={styles.num} data-label="Amount">
                  {a.amount || a.value ? `${formatHsk(a.amount ?? a.value)} HSK` : "—"}
                </span>
                <span className={styles.result} data-label="Result">
                  <StatusBadge status={a.status} />
                  {a.status === "blocked" && <ReasonBadge code={a.reasonCode} />}
                </span>
                <span data-label="Tx">{a.txHash ? <TxLink hash={a.txHash} /> : "—"}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  )
}
