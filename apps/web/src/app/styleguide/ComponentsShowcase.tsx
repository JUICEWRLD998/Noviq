"use client"

// Live render of the reusable component kit (not just tokens) so the system is
// provable and reviewable in one place.

import { AddressChip, BalancePill, ReasonBadge, StatusBadge, TxLink } from "@/components/chain"
import { Grid, Stack } from "@/components/layout"
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CodeBlock,
  Input,
  Skeleton,
  Stat,
  useToast,
} from "@/components/ui"
import styles from "./showcase.module.css"

const SAMPLE_ADDR = "0x84848A21b9f5C4B2E7d3a1F0c6e8B9a2D4f7C1a3"
const SAMPLE_TX = "0x3fa2c1b8d9e0f7a6b5c4d3e2f1908172635445362718293a0b1c2d3e4f5061728"

export function ComponentsShowcase() {
  const toast = useToast()

  return (
    <Stack gap={6}>
      <div>
        <h3 className={styles.h3}>Buttons</h3>
        <div className={styles.row}>
          <Button>Approve covenant</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Slash bond</Button>
          <Button loading>Deploying</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div>
        <h3 className={styles.h3}>Badges &amp; status</h3>
        <div className={styles.row}>
          <Badge>Neutral</Badge>
          <Badge tone="accent" dot>
            Active
          </Badge>
          <StatusBadge status="proposed" />
          <StatusBadge status="allowed" />
          <StatusBadge status="blocked" />
          <ReasonBadge code={0} />
          <ReasonBadge code={3} />
          <ReasonBadge code={5} />
        </div>
      </div>

      <div>
        <h3 className={styles.h3}>Chain primitives</h3>
        <div className={styles.row}>
          <AddressChip address={SAMPLE_ADDR} />
          <AddressChip address={SAMPLE_ADDR} link />
          <TxLink hash={SAMPLE_TX} />
          <BalancePill wei="12500000000000000000" />
        </div>
      </div>

      <div>
        <h3 className={styles.h3}>Cards, stats &amp; inputs</h3>
        <Grid min="18rem">
          <Card>
            <CardHeader>
              <CardTitle>Treasury account</CardTitle>
              <Badge tone="success" dot>
                Live
              </Badge>
            </CardHeader>
            <Stat label="Balance" value="12.5" unit="HSK" hint="≈ policy per-tx cap ×12" />
          </Card>
          <Card glass>
            <CardTitle>Glass surface</CardTitle>
            <p className={styles.muted}>Frosted glass + edge-light ring for emphasis panels.</p>
            <Input placeholder="Send at most 100 USDC per day…" />
          </Card>
        </Grid>
      </div>

      <div>
        <h3 className={styles.h3}>Code block</h3>
        <CodeBlock
          label="Compiled policy"
          code={`{
  "assets": [{ "symbol": "HSK", "perTxCap": "1", "dailyCap": "5" }],
  "recipients": ["0x84848A21…C1a3"],
  "windowSeconds": 86400
}`}
        />
      </div>

      <div>
        <h3 className={styles.h3}>Loading &amp; toasts</h3>
        <Stack gap={3}>
          <Skeleton width="60%" />
          <Skeleton width="40%" />
          <div className={styles.row}>
            <Button
              variant="outline"
              onClick={() =>
                toast({ title: "Transaction sent", description: "Awaiting confirmation…" })
              }
            >
              Neutral toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Policy set on-chain",
                  tone: "success",
                  description: "Covenant is now active.",
                })
              }
            >
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Reverted",
                  tone: "danger",
                  description: "Recipient not on allowlist.",
                })
              }
            >
              Danger toast
            </Button>
          </div>
        </Stack>
      </div>
    </Stack>
  )
}
