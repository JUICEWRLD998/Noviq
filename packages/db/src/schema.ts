// Drizzle schema for Noviq (Phase 4).
//
// Conventions:
//  - uint256 token amounts (wei) are stored as `text`; never a JS number/pg
//    numeric — 18-decimal values overflow. Format to human units at the edges.
//  - block numbers are `bigint` (mode "bigint") to avoid 2^53 precision loss.
//  - one row per on-chain action, keyed for idempotent upserts by `tx_hash`.

import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

/** Human owners, keyed by EOA address. */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  address: text("address").notNull().unique(),
  createdAt,
})

/** Deployed CovenantAccounts (one smart wallet per owner-agent pair). */
export const covenantAccounts = pgTable("covenant_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  address: text("address").notNull().unique(),
  chainId: integer("chain_id").notNull(),
  ownerAddress: text("owner_address").notNull(),
  agentAddress: text("agent_address").notNull(),
  deployTx: text("deploy_tx"),
  deployBlock: bigint("deploy_block", { mode: "bigint" }),
  createdAt,
})

/** Versioned compiled covenants for an account; at most one `active` per account. */
export const policies = pgTable(
  "policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => covenantAccounts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    sourceText: text("source_text"),
    policyJson: jsonb("policy_json").$type<Record<string, unknown>>().notNull(),
    setTx: text("set_tx"),
    active: boolean("active").default(false).notNull(),
    createdAt,
  },
  (t) => [uniqueIndex("policies_account_version_key").on(t.accountId, t.version)],
)

/** Agent goals/config for an account. */
export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => covenantAccounts.id, { onDelete: "cascade" }),
  label: text("label"),
  goal: text("goal").notNull(),
  status: text("status").$type<"idle" | "running" | "paused">().default("idle").notNull(),
  createdAt,
})

export type ActionKind = "agent" | "attack" | "owner"
export type ActionStatus = "proposed" | "allowed" | "blocked"

/** Every proposed/allowed/blocked action, whether autonomous or attack-console. */
export const actions = pgTable(
  "actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => covenantAccounts.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ActionKind>().default("agent").notNull(),
    status: text("status").$type<ActionStatus>().notNull(),
    reasoning: text("reasoning"),
    target: text("target"),
    value: text("value"),
    data: text("data"),
    asset: text("asset"),
    recipient: text("recipient"),
    amount: text("amount"),
    reasonCode: integer("reason_code"),
    reasonLabel: text("reason_label"),
    actionHash: text("action_hash"),
    txHash: text("tx_hash"),
    logIndex: integer("log_index"),
    block: bigint("block", { mode: "bigint" }),
    createdAt,
  },
  (t) => [
    index("actions_account_idx").on(t.accountId),
    // One row per on-chain tx: the idempotent upsert target shared by the worker
    // (writes tx_hash post-send) and the indexer (enriches from ActionAllowed).
    uniqueIndex("actions_tx_hash_key")
      .on(t.txHash)
      .where(sql`${t.txHash} is not null`),
  ],
)

/** Auditor narration + anomaly flags over a window of actions. */
export const auditNotes = pgTable("audit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => covenantAccounts.id, { onDelete: "cascade" }),
  actionId: uuid("action_id").references(() => actions.id, { onDelete: "set null" }),
  narration: text("narration").notNull(),
  severity: text("severity").$type<"info" | "warn" | "critical">().notNull(),
  flags: jsonb("flags").$type<string[]>().default([]).notNull(),
  recommendSlash: boolean("recommend_slash").default(false).notNull(),
  createdAt,
})

/** AgentBond lifecycle, indexed from AgentBond events. */
export const bonds = pgTable("bonds", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").references(() => covenantAccounts.id, { onDelete: "set null" }),
  agentAddress: text("agent_address"),
  amount: text("amount"),
  status: text("status")
    .$type<"bonded" | "slashed" | "withdraw_requested" | "withdrawn">()
    .notNull(),
  txHash: text("tx_hash"),
  block: bigint("block", { mode: "bigint" }),
  createdAt,
})

/** Resumable indexer cursor(s): key → last fully-processed block. */
export const indexerState = pgTable("indexer_state", {
  key: text("key").primaryKey(),
  lastBlock: bigint("last_block", { mode: "bigint" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type CovenantAccount = typeof covenantAccounts.$inferSelect
export type Policy = typeof policies.$inferSelect
export type Agent = typeof agents.$inferSelect
export type Action = typeof actions.$inferSelect
export type AuditNote = typeof auditNotes.$inferSelect
export type Bond = typeof bonds.$inferSelect
