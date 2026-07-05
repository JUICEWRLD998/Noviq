// Noviq covenant policy: the human-authored schema and its encoder to the exact
// on-chain `PolicyGuard.setPolicy` arguments.
//
// A covenant is authored (by the Intent Compiler or the editor UI) in *human
// units* — decimal token amounts, seconds, symbols. `encodePolicy` lowers that
// into the packed tuples the guard stores. The shapes here mirror
// `contracts/src/libraries/PolicyTypes.sol` one-for-one; keep them in sync.

import { type Address, type Hex, isAddress, isHex, parseUnits } from "viem"
import { z } from "zod"

/** Native HSK is represented by the zero address across the contract layer. */
export const NATIVE_ASSET: Address = "0x0000000000000000000000000000000000000000"

/** Default rolling-cap window: one day, in seconds. */
export const DEFAULT_WINDOW_SECONDS = 86_400

// ── Reason codes (mirror of the Solidity `ReasonCode` enum) ─────────────────

/** Guard decision codes; index-identical to `PolicyTypes.sol:ReasonCode`. */
export const ReasonCode = {
  OK: 0,
  PolicyInactive: 1,
  AssetNotAllowed: 2,
  PerTxCapExceeded: 3,
  DailyCapExceeded: 4,
  RecipientNotAllowed: 5,
  SelectorNotAllowed: 6,
  TargetNotAllowed: 7,
  LargeActionNotApproved: 8,
} as const

export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode]

/** Human-readable label for each guard decision code. */
export const REASON_LABELS: Record<ReasonCode, string> = {
  [ReasonCode.OK]: "Allowed",
  [ReasonCode.PolicyInactive]: "No active covenant for this account",
  [ReasonCode.AssetNotAllowed]: "Asset is not on the allowlist",
  [ReasonCode.PerTxCapExceeded]: "Amount exceeds the per-transaction cap",
  [ReasonCode.DailyCapExceeded]: "Amount would exceed the rolling window cap",
  [ReasonCode.RecipientNotAllowed]: "Recipient is not on the allowlist",
  [ReasonCode.SelectorNotAllowed]: "Function selector is not allowed",
  [ReasonCode.TargetNotAllowed]: "Call target is not allowed",
  [ReasonCode.LargeActionNotApproved]: "Large action requires timelock or co-sign",
}

/** Resolve a raw guard code (uint8) to its human label; unknown codes fall back. */
export function reasonLabel(code: number): string {
  return REASON_LABELS[code as ReasonCode] ?? `Unknown reason (${code})`
}

// ── Authoring schema (human units) ──────────────────────────────────────────

const addressSchema = z
  .string()
  .refine((v): v is Address => isAddress(v), { message: "Invalid EVM address" })

/** A 4-byte function selector, e.g. `0xa9059cbb`. */
const selectorSchema = z
  .string()
  .refine((v): v is Hex => isHex(v) && v.length === 10, {
    message: "Selector must be a 4-byte hex string (0x + 8 chars)",
  })

/** A non-negative decimal amount in human units, e.g. "100" or "0.5". */
const decimalAmount = z
  .string()
  .regex(/^\d+(\.\d+)?$/, { message: "Amount must be a non-negative decimal string" })

const assetPolicySchema = z.object({
  /** Display symbol, e.g. "HSK" or "USDC". Not sent on-chain. */
  symbol: z.string().min(1),
  /** Token contract; the zero address (default) means native HSK. */
  address: addressSchema.default(NATIVE_ASSET),
  /** Token decimals used to scale the human amounts below. */
  decimals: z.number().int().min(0).max(36).default(18),
  /** Max amount allowed in a single transaction. */
  perTxCap: decimalAmount,
  /** Max cumulative amount allowed within the rolling window. */
  dailyCap: decimalAmount,
})

const policySchema = z.object({
  /** Per-asset spend limits. At least one asset must be allowed. */
  assets: z.array(assetPolicySchema).min(1),
  /** Rolling-cap window length in seconds. */
  windowSeconds: z.number().int().positive().default(DEFAULT_WINDOW_SECONDS),
  /** KYC/allowlisted recipients. Presence enables recipient enforcement. */
  recipients: z.array(addressSchema).default([]),
  /** Allowlisted 4-byte selectors. Presence enables selector enforcement. */
  selectors: z.array(selectorSchema).default([]),
  /** Allowlisted call targets. Presence enables target enforcement. */
  targets: z.array(addressSchema).default([]),
  /** Actions at/over the threshold require timelock maturation or owner co-sign. */
  largeAction: z
    .object({
      /** Native-equivalent amount (18 decimals) that triggers approval. */
      threshold: decimalAmount,
      /** Seconds a queued large action must mature before it can execute. */
      timelockSeconds: z.number().int().nonnegative().default(0),
    })
    .optional(),
  /** Force allowlist enforcement on/off, overriding the array-presence default. */
  enforce: z
    .object({
      recipientAllowlist: z.boolean().optional(),
      selectorAllowlist: z.boolean().optional(),
      targetAllowlist: z.boolean().optional(),
    })
    .optional(),
})

export const PolicySchema = policySchema

/** Covenant as authored — defaults may be omitted. Compiler/editor emit this. */
export type PolicyInput = z.input<typeof policySchema>
/** Covenant after parsing — all defaults applied. */
export type Policy = z.output<typeof policySchema>

// ── On-chain encoding ───────────────────────────────────────────────────────

/** `PolicyConfig` struct as consumed by `PolicyGuard.setPolicy`. */
export interface PolicyConfig {
  active: boolean
  windowDuration: bigint
  largeActionThreshold: bigint
  timelockDelay: bigint
  recipientAllowlistEnabled: boolean
  selectorAllowlistEnabled: boolean
  targetAllowlistEnabled: boolean
}

/** `AssetLimit` struct as consumed by `PolicyGuard.setPolicy`. */
export interface AssetLimit {
  asset: Address
  perTxCap: bigint
  dailyCap: bigint
}

/** The full positional argument tuple for `PolicyGuard.setPolicy`. */
export interface SetPolicyArgs {
  config: PolicyConfig
  limits: AssetLimit[]
  recipients: Address[]
  selectors: Hex[]
  targets: Address[]
}

/**
 * Lower a human-authored covenant into the exact `setPolicy` argument tuple.
 * Amounts are scaled with `parseUnits` per the asset's decimals (the large-action
 * threshold uses 18 / native-equivalent). Allowlist enforcement flags default to
 * "enabled when the list is non-empty", overridable via `policy.enforce`.
 */
export function encodePolicy(input: PolicyInput): SetPolicyArgs {
  const policy = policySchema.parse(input)

  const limits: AssetLimit[] = policy.assets.map((a) => ({
    asset: a.address,
    perTxCap: parseUnits(a.perTxCap, a.decimals),
    dailyCap: parseUnits(a.dailyCap, a.decimals),
  }))

  const config: PolicyConfig = {
    active: true,
    windowDuration: BigInt(policy.windowSeconds),
    largeActionThreshold: policy.largeAction ? parseUnits(policy.largeAction.threshold, 18) : 0n,
    timelockDelay: BigInt(policy.largeAction?.timelockSeconds ?? 0),
    recipientAllowlistEnabled: policy.enforce?.recipientAllowlist ?? policy.recipients.length > 0,
    selectorAllowlistEnabled: policy.enforce?.selectorAllowlist ?? policy.selectors.length > 0,
    targetAllowlistEnabled: policy.enforce?.targetAllowlist ?? policy.targets.length > 0,
  }

  return {
    config,
    limits,
    recipients: policy.recipients,
    selectors: policy.selectors,
    targets: policy.targets,
  }
}
