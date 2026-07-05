"use client"

import { AddressChip, ReasonBadge, StatusBadge, TxLink } from "@/components/chain"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { type ActionRow, useActions } from "@/hooks/useActions"
import { formatHsk, formatTime } from "@/lib/format"
import { fadeUp } from "@/lib/motion"
import { AnimatePresence, motion } from "framer-motion"
import styles from "./activity-feed.module.css"

const KIND_TONE = { agent: "neutral", attack: "danger", owner: "accent" } as const

function amountOf(a: ActionRow): string {
  const v = a.amount ?? a.value
  return v ? `${formatHsk(v)} HSK` : "—"
}

export function ActivityFeed({ address }: { address: string }) {
  const { data, isLoading, isError } = useActions(address)

  return (
    <Card flush className={styles.card}>
      <CardHeader className={styles.head}>
        <CardTitle>Activity</CardTitle>
        <span className={styles.live} aria-hidden="true">
          <span className={styles.liveDot} /> live
        </span>
      </CardHeader>

      <div className={styles.list} aria-live="polite">
        {isLoading ? (
          <div className={styles.loading}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height="3rem" />
            ))}
          </div>
        ) : isError ? (
          <p className={styles.empty}>Couldn’t load activity.</p>
        ) : !data || data.length === 0 ? (
          <p className={styles.empty}>No activity yet. Run the agent or the attack console.</p>
        ) : (
          <AnimatePresence initial={false}>
            {data.map((a) => (
              <motion.div
                key={a.id}
                layout
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className={styles.row}
              >
                <div className={styles.rowMain}>
                  <Badge tone={KIND_TONE[a.kind]}>{a.kind}</Badge>
                  <StatusBadge status={a.status} />
                  {a.recipient && <AddressChip address={a.recipient} />}
                  <span className={styles.amount}>{amountOf(a)}</span>
                </div>
                <div className={styles.rowMeta}>
                  {a.status === "blocked" && <ReasonBadge code={a.reasonCode} />}
                  {a.txHash && <TxLink hash={a.txHash} />}
                  <time className={styles.time}>{formatTime(a.createdAt)}</time>
                </div>
                {a.reasoning && <p className={styles.reasoning}>{a.reasoning}</p>}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </Card>
  )
}
