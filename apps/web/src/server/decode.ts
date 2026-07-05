// Decode a reverted CovenantAccount.execute() into a Noviq ReasonCode.
//
// A covenant violation reverts with `PolicyViolation(uint8)` raised INSIDE the
// guard, before CovenantAccount's own logic — so the error fragment lives on the
// PolicyGuard ABI, not the account ABI. We decode against the merged ABI (and
// fall back to raw decode) so viem reliably names the error. `simulate` remains
// the authoritative source of the code; this enriches on-chain reverts.

import { covenantAccountAbi, policyGuardAbi, reasonLabel } from "@noviq/sdk"
import { BaseError, ContractFunctionRevertedError, type Hex, decodeErrorResult } from "viem"

const errorAbi = [...policyGuardAbi, ...covenantAccountAbi]

export interface RevertInfo {
  reasonCode: number
  reasonLabel: string
  errorName: string | undefined
}

const UNKNOWN: RevertInfo = { reasonCode: -1, reasonLabel: "Unknown revert", errorName: undefined }

/** Best-effort decode of a viem write/simulate error into a ReasonCode. */
export function decodeExecuteRevert(err: unknown): RevertInfo {
  if (!(err instanceof BaseError)) return UNKNOWN

  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
  if (!(revert instanceof ContractFunctionRevertedError)) return UNKNOWN

  let name = revert.data?.errorName
  let args = revert.data?.args as readonly unknown[] | undefined

  // viem only auto-decodes errors present in the ABI it was called with; if the
  // account-ABI call couldn't name PolicyViolation, decode the raw revert bytes
  // (found by walking the error's cause chain) against the guard ABI.
  if (!name) {
    const raw = findRawData(err)
    if (raw) {
      try {
        const decoded = decodeErrorResult({ abi: errorAbi, data: raw })
        name = decoded.errorName
        args = decoded.args as readonly unknown[] | undefined
      } catch {
        // fall through to UNKNOWN
      }
    }
  }

  if (name === "PolicyViolation") {
    const code = Number(args?.[0] ?? -1)
    return { reasonCode: code, reasonLabel: reasonLabel(code), errorName: name }
  }
  if (name) return { reasonCode: -1, reasonLabel: name, errorName: name }
  return UNKNOWN
}

/** Walk an error's `cause` chain for the first `data` field holding revert bytes. */
function findRawData(err: unknown): Hex | undefined {
  let cur: unknown = err
  const seen = new Set<unknown>()
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur)
    const rec = cur as { data?: unknown; cause?: unknown }
    if (typeof rec.data === "string" && rec.data.startsWith("0x")) return rec.data as Hex
    cur = rec.cause
  }
  return undefined
}
