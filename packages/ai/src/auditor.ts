// The Auditor — turns on-chain guard decisions into a plain-language, attributable
// compliance narrative, flags anomalies, and recommends whether the agent's bond
// should be slashed. Runs on the events emitted by PolicyGuard / CovenantAccount.

import { z } from "zod"
import { MODELS } from "./models"
import { OpenRouterClient } from "./openrouter"

/** One guard decision to be audited (shape mirrors the indexed events). */
export interface AuditEvent {
  /** Wall-clock or block time, ISO string or block number as text. */
  at: string
  /** Whether the guard allowed the action. */
  allowed: boolean
  /** Human reason label (from the SDK's `reasonLabel`) when blocked. */
  reason?: string
  /** Effective recipient of the action. */
  recipient?: string
  /** Human-readable amount, e.g. "250 USDC". */
  amount?: string
  /** Optional free-form context (goal, agent note, tx hash). */
  note?: string
}

const AuditSchema = z.object({
  /** Plain-language narration of what happened and why it matters. */
  narration: z.string(),
  /** Overall severity of the reviewed window. */
  severity: z.enum(["info", "warn", "critical"]),
  /** Specific concerns worth a compliance officer's attention. */
  flags: z.array(z.string()).default([]),
  /** Whether the agent's off-mandate behavior warrants a bond slash. */
  recommendSlash: z.boolean().default(false),
})

export type AuditReport = z.infer<typeof AuditSchema>

const SYSTEM_PROMPT = `You are the Noviq Auditor, an AI compliance officer for autonomous agent wallets.

You are given a chronological list of on-chain guard decisions (each allowed or blocked, with reason, recipient, and amount). Produce a factual, attributable compliance narrative.

Respond with ONLY a JSON object:
{
  "narration": "clear, plain-language account of what the agent did and how the covenant responded",
  "severity": "info" | "warn" | "critical",
  "flags": ["specific concerns, e.g. repeated blocked transfers to an unknown address"],
  "recommendSlash": false
}

Guidance:
- Blocked actions are the guard working as intended — note them, but a single block is usually "info" or "warn", not "critical".
- Escalate to "critical" and consider recommendSlash=true for patterns that suggest a compromised or malicious agent: repeated attempts to reach non-allowlisted recipients, probing for limits, or attempted large exfiltration.
- Be precise and cite the amounts/recipients you were given. Do not invent facts.
- Output raw JSON only — no markdown, no code fences, no commentary.`

/**
 * Produce a compliance report over a window of guard decisions.
 */
export async function auditActions(
  events: AuditEvent[],
  client: OpenRouterClient = new OpenRouterClient(),
): Promise<AuditReport> {
  return client.completeJson({
    model: MODELS.auditor,
    temperature: 0.2,
    schema: AuditSchema,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Guard decisions (chronological):\n${JSON.stringify(events, null, 2)}` },
    ],
  })
}
