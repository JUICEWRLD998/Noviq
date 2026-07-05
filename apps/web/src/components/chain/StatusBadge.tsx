import { Badge, type BadgeTone } from "@/components/ui/Badge"
import { reasonLabel } from "@noviq/sdk"

type ActionStatus = "proposed" | "allowed" | "blocked"

const STATUS_TONE: Record<ActionStatus, BadgeTone> = {
  proposed: "neutral",
  allowed: "success",
  blocked: "danger",
}

const STATUS_LABEL: Record<ActionStatus, string> = {
  proposed: "Proposed",
  allowed: "Allowed",
  blocked: "Blocked",
}

export function StatusBadge({ status }: { status: ActionStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

/** Human reason from a guard reason code (0 = OK). Danger tone when non-OK. */
export function ReasonBadge({ code }: { code: number | null | undefined }) {
  if (code === null || code === undefined) return null
  const isOk = code === 0
  return <Badge tone={isOk ? "success" : "danger"}>{reasonLabel(code)}</Badge>
}
