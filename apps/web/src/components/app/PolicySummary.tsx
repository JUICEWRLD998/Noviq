import { AddressChip } from "@/components/chain"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/Card"
import { Stat } from "@/components/ui/Stat"
import styles from "./policy-summary.module.css"

interface AssetLimit {
  symbol?: string
  perTxCap?: string
  dailyCap?: string
}
interface PolicyShape {
  assets?: AssetLimit[]
  recipients?: string[]
  targets?: string[]
  windowSeconds?: number
  largeAction?: { threshold?: string; timelockSeconds?: number }
}

function windowLabel(seconds?: number): string {
  if (!seconds) return "rolling day"
  if (seconds % 86400 === 0) return `${seconds / 86400}d`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  return `${seconds}s`
}

export function PolicySummary({
  policy,
  version,
}: {
  policy: Record<string, unknown> | null
  version: number | null
}) {
  if (!policy) {
    return (
      <Card>
        <CardTitle>No active covenant</CardTitle>
        <p className={styles.empty}>
          This account has no policy set. Compile one in the covenant editor — until then the guard
          blocks every action.
        </p>
      </Card>
    )
  }

  const p = policy as PolicyShape
  const win = windowLabel(p.windowSeconds)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active covenant</CardTitle>
        {version !== null && (
          <Badge tone="accent" dot>
            v{version}
          </Badge>
        )}
      </CardHeader>

      <div className={styles.assets}>
        {(p.assets ?? []).map((a) => (
          <div key={a.symbol ?? "asset"} className={styles.asset}>
            <Stat
              label={`${a.symbol ?? "Asset"} · per tx`}
              value={a.perTxCap ?? "—"}
              unit={a.symbol}
            />
            <Stat label={`Per ${win}`} value={a.dailyCap ?? "—"} unit={a.symbol} />
          </div>
        ))}
      </div>

      <dl className={styles.rules}>
        <div className={styles.rule}>
          <dt>Allowlisted recipients</dt>
          <dd className={styles.chips}>
            {p.recipients && p.recipients.length > 0 ? (
              p.recipients.map((r) => <AddressChip key={r} address={r} link />)
            ) : (
              <span className={styles.none}>none — no recipient restriction</span>
            )}
          </dd>
        </div>
        {p.targets && p.targets.length > 0 && (
          <div className={styles.rule}>
            <dt>Allowed call targets</dt>
            <dd className={styles.chips}>
              {p.targets.map((t) => (
                <AddressChip key={t} address={t} link />
              ))}
            </dd>
          </div>
        )}
        {p.largeAction?.threshold && (
          <div className={styles.rule}>
            <dt>Large action</dt>
            <dd>
              ≥ {p.largeAction.threshold} requires{" "}
              {p.largeAction.timelockSeconds
                ? `${p.largeAction.timelockSeconds}s timelock`
                : "co-sign"}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
