// Query helpers shared by the API routes, the indexer, and the agent worker.
// Optional columns are omitted (never set to `undefined`) to satisfy
// exactOptionalPropertyTypes.

import { and, desc, eq, sql } from "drizzle-orm"
import { getDb } from "./client"
import {
  type Action,
  type ActionKind,
  type ActionStatus,
  actions,
  agents,
  auditNotes,
  bonds,
  covenantAccounts,
  indexerState,
  policies,
  users,
} from "./schema"

// ── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(address: string) {
  const db = getDb()
  const [row] = await db
    .insert(users)
    .values({ address })
    .onConflictDoNothing({ target: users.address })
    .returning()
  if (row) return row
  const [existing] = await db.select().from(users).where(eq(users.address, address))
  return existing
}

// ── Covenant accounts ─────────────────────────────────────────────────────────

export interface UpsertAccountInput {
  address: string
  chainId: number
  ownerAddress: string
  agentAddress: string
  deployTx?: string
  deployBlock?: bigint
}

export async function upsertAccount(input: UpsertAccountInput) {
  const db = getDb()
  const base = {
    address: input.address,
    chainId: input.chainId,
    ownerAddress: input.ownerAddress,
    agentAddress: input.agentAddress,
    ...(input.deployTx !== undefined ? { deployTx: input.deployTx } : {}),
    ...(input.deployBlock !== undefined ? { deployBlock: input.deployBlock } : {}),
  }
  const [row] = await db
    .insert(covenantAccounts)
    .values(base)
    .onConflictDoUpdate({
      target: covenantAccounts.address,
      set: {
        ownerAddress: input.ownerAddress,
        agentAddress: input.agentAddress,
        ...(input.deployTx !== undefined ? { deployTx: input.deployTx } : {}),
        ...(input.deployBlock !== undefined ? { deployBlock: input.deployBlock } : {}),
      },
    })
    .returning()
  return row
}

export async function getAccountByAddress(address: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(covenantAccounts)
    .where(eq(covenantAccounts.address, address))
  return row
}

export async function listAccounts() {
  return getDb().select().from(covenantAccounts).orderBy(desc(covenantAccounts.createdAt))
}

// ── Policies (versioned) ──────────────────────────────────────────────────────

export interface InsertPolicyInput {
  accountId: string
  policyJson: Record<string, unknown>
  sourceText?: string
  setTx?: string
  active?: boolean
}

export async function insertPolicyVersion(input: InsertPolicyInput) {
  const db = getDb()
  const versionRows = await db
    .select({ next: sql<number>`coalesce(max(${policies.version}), 0) + 1` })
    .from(policies)
    .where(eq(policies.accountId, input.accountId))
  const next = versionRows[0]?.next ?? 1
  const active = input.active ?? false
  if (active) {
    await db
      .update(policies)
      .set({ active: false })
      .where(eq(policies.accountId, input.accountId))
  }
  const [row] = await db
    .insert(policies)
    .values({
      accountId: input.accountId,
      version: next,
      policyJson: input.policyJson,
      active,
      ...(input.sourceText !== undefined ? { sourceText: input.sourceText } : {}),
      ...(input.setTx !== undefined ? { setTx: input.setTx } : {}),
    })
    .returning()
  return row
}

export async function getActivePolicy(accountId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.accountId, accountId), eq(policies.active, true)))
    .orderBy(desc(policies.version))
    .limit(1)
  return row
}

/**
 * Mark one policy version active (deactivating the rest) after the owner has
 * set it on-chain. `setTx` records the on-chain setPolicy transaction.
 */
export async function activatePolicyVersion(accountId: string, version: number, setTx?: string) {
  const db = getDb()
  await db.update(policies).set({ active: false }).where(eq(policies.accountId, accountId))
  await db
    .update(policies)
    .set({ active: true, ...(setTx !== undefined ? { setTx } : {}) })
    .where(and(eq(policies.accountId, accountId), eq(policies.version, version)))
}

// ── Agents ────────────────────────────────────────────────────────────────────

export async function getActiveAgents() {
  const db = getDb()
  return db
    .select({
      agent: agents,
      account: covenantAccounts,
    })
    .from(agents)
    .innerJoin(covenantAccounts, eq(agents.accountId, covenantAccounts.id))
    .where(eq(agents.status, "running"))
}

export interface UpsertAgentInput {
  accountId: string
  goal: string
  label?: string
  status?: "idle" | "running" | "paused"
}

export async function insertAgent(input: UpsertAgentInput) {
  const db = getDb()
  const [row] = await db
    .insert(agents)
    .values({
      accountId: input.accountId,
      goal: input.goal,
      status: input.status ?? "idle",
      ...(input.label !== undefined ? { label: input.label } : {}),
    })
    .returning()
  return row
}

// ── Actions ───────────────────────────────────────────────────────────────────

export interface InsertActionInput {
  accountId: string
  kind: ActionKind
  status: ActionStatus
  reasoning?: string
  target?: string
  value?: string
  data?: string
  asset?: string
  recipient?: string
  amount?: string
  actionHash?: string
}

export async function insertAction(input: InsertActionInput) {
  const db = getDb()
  const optional = {
    ...(input.reasoning !== undefined ? { reasoning: input.reasoning } : {}),
    ...(input.target !== undefined ? { target: input.target } : {}),
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.data !== undefined ? { data: input.data } : {}),
    ...(input.asset !== undefined ? { asset: input.asset } : {}),
    ...(input.recipient !== undefined ? { recipient: input.recipient } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.actionHash !== undefined ? { actionHash: input.actionHash } : {}),
  }
  const [row] = await db
    .insert(actions)
    .values({ accountId: input.accountId, kind: input.kind, status: input.status, ...optional })
    .returning()
  return row
}

/** Attach the tx hash to an intent row immediately after send (pre-receipt). */
export async function attachTxToAction(id: string, txHash: string, actionHash?: string) {
  const db = getDb()
  await db
    .update(actions)
    .set({ txHash, ...(actionHash !== undefined ? { actionHash } : {}) })
    .where(eq(actions.id, id))
}

export interface FinalizeActionInput {
  status: ActionStatus
  reasonCode?: number
  reasonLabel?: string
  block?: bigint
}

export async function finalizeAction(id: string, input: FinalizeActionInput) {
  const db = getDb()
  await db
    .update(actions)
    .set({
      status: input.status,
      ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
      ...(input.reasonLabel !== undefined ? { reasonLabel: input.reasonLabel } : {}),
      ...(input.block !== undefined ? { block: input.block } : {}),
    })
    .where(eq(actions.id, id))
}

export interface ActionEventInput {
  accountId: string
  txHash: string
  logIndex: number
  block: bigint
  asset?: string
  recipient?: string
  amount?: string
}

/** Idempotently record/enrich an allowed action from an ActionAllowed log. */
export async function upsertActionFromEvent(input: ActionEventInput) {
  const db = getDb()
  const enrich = {
    status: "allowed" as ActionStatus,
    logIndex: input.logIndex,
    block: input.block,
    ...(input.asset !== undefined ? { asset: input.asset } : {}),
    ...(input.recipient !== undefined ? { recipient: input.recipient } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
  }
  await db
    .insert(actions)
    .values({ accountId: input.accountId, kind: "agent", txHash: input.txHash, ...enrich })
    .onConflictDoUpdate({ target: actions.txHash, set: enrich })
}

export async function listActions(accountId: string, limit = 50): Promise<Action[]> {
  return getDb()
    .select()
    .from(actions)
    .where(eq(actions.accountId, accountId))
    .orderBy(desc(actions.createdAt))
    .limit(limit)
}

// ── Audit notes ───────────────────────────────────────────────────────────────

export interface InsertAuditInput {
  accountId: string
  narration: string
  severity: "info" | "warn" | "critical"
  flags: string[]
  recommendSlash: boolean
  actionId?: string
}

export async function insertAuditNote(input: InsertAuditInput) {
  const db = getDb()
  const [row] = await db
    .insert(auditNotes)
    .values({
      accountId: input.accountId,
      narration: input.narration,
      severity: input.severity,
      flags: input.flags,
      recommendSlash: input.recommendSlash,
      ...(input.actionId !== undefined ? { actionId: input.actionId } : {}),
    })
    .returning()
  return row
}

// ── Bonds ─────────────────────────────────────────────────────────────────────

export interface BondEventInput {
  accountId?: string
  agentAddress?: string
  amount?: string
  status: "bonded" | "slashed" | "withdraw_requested" | "withdrawn"
  txHash?: string
  block?: bigint
}

export async function insertBondFromEvent(input: BondEventInput) {
  const db = getDb()
  await db.insert(bonds).values({
    status: input.status,
    ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
    ...(input.agentAddress !== undefined ? { agentAddress: input.agentAddress } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.txHash !== undefined ? { txHash: input.txHash } : {}),
    ...(input.block !== undefined ? { block: input.block } : {}),
  })
}

// ── Indexer cursor ────────────────────────────────────────────────────────────

export async function getCursor(key: string): Promise<bigint | undefined> {
  const db = getDb()
  const [row] = await db.select().from(indexerState).where(eq(indexerState.key, key))
  return row?.lastBlock
}

export async function setCursor(key: string, lastBlock: bigint) {
  const db = getDb()
  await db
    .insert(indexerState)
    .values({ key, lastBlock })
    .onConflictDoUpdate({
      target: indexerState.key,
      set: { lastBlock, updatedAt: sql`now()` },
    })
}
