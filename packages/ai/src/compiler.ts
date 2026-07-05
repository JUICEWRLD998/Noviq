// Intent Compiler — turns a plain-English covenant into a validated Noviq policy.
//
// The model returns policy JSON in the SAME human-unit shape as the SDK's
// `PolicySchema`, so the output round-trips straight into `encodePolicy`. Any
// clause the model can't resolve confidently is returned as a `clarification`
// for the human to answer before the policy is set on-chain.

import { PolicySchema, type PolicyInput } from "@noviq/sdk"
import { z } from "zod"
import { MODELS } from "./models"
import { OpenRouterClient } from "./openrouter"

/** Optional grounding context to reduce ambiguity in the compiled policy. */
export interface CompileContext {
  /** Known tokens the covenant may reference, so the model uses real addresses. */
  assets?: Array<{ symbol: string; address: string; decimals: number }>
  /** Free-form notes (e.g. the owner's address, prior policy) for the model. */
  note?: string
}

const CompileResultSchema = z.object({
  policy: PolicySchema,
  clarifications: z.array(z.string()).default([]),
})

export type CompileResult = {
  policy: PolicyInput
  clarifications: string[]
}

const SYSTEM_PROMPT = `You are the Noviq Intent Compiler. You translate a human's plain-English "covenant" — the rules that bound an AI agent's crypto wallet — into a strict JSON policy object.

Return ONLY a JSON object with this exact shape:
{
  "policy": {
    "assets": [                     // REQUIRED, at least one
      {
        "symbol": "HSK",            // token symbol
        "address": "0x0000000000000000000000000000000000000000", // 0x0 = native HSK; use a real token address otherwise
        "decimals": 18,             // token decimals
        "perTxCap": "100",          // max per single transaction, decimal string in whole tokens
        "dailyCap": "500"           // max per rolling window, decimal string in whole tokens
      }
    ],
    "windowSeconds": 86400,         // rolling cap window; default one day
    "recipients": [],               // allowlisted recipient addresses; [] = no recipient restriction
    "selectors": [],                // allowlisted 4-byte function selectors like "0xa9059cbb"; [] = no restriction
    "targets": [],                  // allowlisted contract addresses; [] = no restriction
    "largeAction": {                // OMIT entirely if the covenant has no large-action rule
      "threshold": "1000",          // native-equivalent amount needing sign-off, decimal string
      "timelockSeconds": 3600       // delay before a queued large action can run
    }
  },
  "clarifications": []              // plain-English questions for anything you could NOT resolve confidently
}

Rules:
- Amounts are ALWAYS decimal strings in whole tokens (e.g. "100", "0.5"), never wei and never scientific notation.
- Only include tokens/addresses you are confident about. If the user names a token you don't have an address for, use it in "clarifications" instead of inventing an address.
- If the covenant names specific payees or contracts, put their addresses in "recipients"/"targets". Never invent addresses.
- Be conservative: when a limit is ambiguous, add a clarification rather than guessing.
- Output raw JSON only — no markdown, no code fences, no commentary.`

/**
 * Compile a natural-language covenant into a validated Noviq policy.
 * The returned `policy` is `PolicySchema`-valid and ready for `encodePolicy`.
 */
export async function compileCovenant(
  covenant: string,
  ctx: CompileContext = {},
  client: OpenRouterClient = new OpenRouterClient(),
): Promise<CompileResult> {
  const contextBlock = buildContextBlock(ctx)
  const result = await client.completeJson({
    model: MODELS.compiler,
    temperature: 0.1,
    schema: CompileResultSchema,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${contextBlock}Covenant:\n"""\n${covenant}\n"""` },
    ],
  })

  return { policy: result.policy, clarifications: result.clarifications }
}

function buildContextBlock(ctx: CompileContext): string {
  const parts: string[] = []
  if (ctx.assets?.length) {
    const rows = ctx.assets
      .map((a) => `- ${a.symbol}: ${a.address} (${a.decimals} decimals)`)
      .join("\n")
    parts.push(`Known tokens:\n${rows}`)
  }
  if (ctx.note) parts.push(`Notes:\n${ctx.note}`)
  return parts.length ? `${parts.join("\n\n")}\n\n` : ""
}
