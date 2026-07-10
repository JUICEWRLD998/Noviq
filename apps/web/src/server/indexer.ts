// Chain indexer — polls guard/factory/bond logs into Postgres.
//
// Blocked actions REVERT and emit no log, so they are recorded by the worker /
// attack path, not here. This indexer captures the positive on-chain trail:
// account creation, allowed actions, and bond lifecycle. It is idempotent
// (re-scanning a range never double-inserts) and resumable (a persisted cursor).
//
//   pnpm --filter @noviq/web indexer            (continuous)
//   pnpm --filter @noviq/web indexer -- --once  (one catch-up pass)

import {
  getAccountByAddress,
  getCursor,
  insertBondFromEvent,
  setCursor,
  upsertAccount,
  upsertActionFromEvent,
} from "@noviq/db"
import { requireServer } from "@noviq/env"
import {
  HSK_TESTNET,
  agentBondAbi,
  covenantAccountFactoryAbi,
  noviqAddresses,
  policyGuardAbi,
} from "@noviq/sdk"
import type { Abi, Address, Hex } from "viem"
import { publicClient } from "./chain"

/** Minimal decoded-log shape we read off getContractEvents results. */
type RawEventLog<A> = {
  args: A
  transactionHash: Hex | null
  blockNumber: bigint | null
  logIndex: number | null
}

const CURSOR_KEY = "hsk-testnet"
const CONFIRMATIONS = 3n
const CHUNK = 2_000n
const SEED_LOOKBACK = 10_000n
const GUARD_DEPLOY_BLOCK = 30_037_652n
const POLL_MS = 5_000

const addrs = noviqAddresses(HSK_MAINNET.chainId)

/** getContractEvents with adaptive range-halving on RPC "too many results". */
async function getEventsSafe(
  params: { address: Address; abi: Abi; eventName: string },
  fromBlock: bigint,
  toBlock: bigint,
): Promise<readonly unknown[]> {
  try {
    return await publicClient.getContractEvents({
      address: params.address,
      abi: params.abi,
      eventName: params.eventName,
      fromBlock,
      toBlock,
    })
  } catch (err) {
    if (toBlock <= fromBlock) throw err
    const mid = fromBlock + (toBlock - fromBlock) / 2n
    const left = await getEventsSafe(params, fromBlock, mid)
    const right = await getEventsSafe(params, mid + 1n, toBlock)
    return [...left, ...right]
  }
}

async function ingestRange(fromBlock: bigint, toBlock: bigint): Promise<void> {
  // 1. Account creation.
  const created = await getEventsSafe(
    { address: addrs.covenantAccountFactory, abi: covenantAccountFactoryAbi, eventName: "AccountCreated" },
    fromBlock,
    toBlock,
  )
  for (const raw of created) {
    const log = raw as RawEventLog<{ account?: Address; owner?: Address; agent?: Address }>
    const args = log.args
    if (!args.account || !args.owner || !args.agent) continue
    await upsertAccount({
      address: args.account,
      chainId: HSK_TESTNET.chainId,
      ownerAddress: args.owner,
      agentAddress: args.agent,
      ...(log.transactionHash ? { deployTx: log.transactionHash } : {}),
      ...(log.blockNumber != null ? { deployBlock: log.blockNumber } : {}),
    })
    console.log(`indexer: AccountCreated ${args.account}`)
  }

  // 2. Allowed actions.
  const allowed = await getEventsSafe(
    { address: addrs.policyGuard, abi: policyGuardAbi, eventName: "ActionAllowed" },
    fromBlock,
    toBlock,
  )
  for (const raw of allowed) {
    const log = raw as RawEventLog<{
      account?: Address
      asset?: Address
      recipient?: Address
      amount?: bigint
    }>
    const args = log.args
    if (!args.account || !log.transactionHash || log.blockNumber == null) continue
    const account = await getAccountByAddress(args.account)
    if (!account) continue
    await upsertActionFromEvent({
      accountId: account.id,
      txHash: log.transactionHash,
      logIndex: log.logIndex ?? 0,
      block: log.blockNumber,
      ...(args.asset ? { asset: args.asset } : {}),
      ...(args.recipient ? { recipient: args.recipient } : {}),
      ...(args.amount != null ? { amount: args.amount.toString() } : {}),
    })
    console.log(`indexer: ActionAllowed ${args.account} tx=${log.transactionHash}`)
  }

  // 3. Bond lifecycle.
  const bondEvents: Array<{ name: string; status: "bonded" | "slashed" | "withdraw_requested" | "withdrawn" }> = [
    { name: "Bonded", status: "bonded" },
    { name: "Slashed", status: "slashed" },
    { name: "WithdrawRequested", status: "withdraw_requested" },
    { name: "Withdrawn", status: "withdrawn" },
  ]
  for (const be of bondEvents) {
    const logs = await getEventsSafe(
      { address: addrs.agentBond, abi: agentBondAbi, eventName: be.name },
      fromBlock,
      toBlock,
    )
    for (const raw of logs) {
      const log = raw as RawEventLog<{ account?: Address; agent?: Address; amount?: bigint }>
      const args = log.args
      const account = args.account ? await getAccountByAddress(args.account) : undefined
      await insertBondFromEvent({
        status: be.status,
        ...(account ? { accountId: account.id } : {}),
        ...(args.agent ? { agentAddress: args.agent } : {}),
        ...(args.amount != null ? { amount: args.amount.toString() } : {}),
        ...(log.transactionHash ? { txHash: log.transactionHash } : {}),
        ...(log.blockNumber != null ? { block: log.blockNumber } : {}),
      })
      console.log(`indexer: Bond ${be.name}`)
    }
  }
}

async function runOnce(): Promise<void> {
  const latest = await publicClient.getBlockNumber()
  const safeHead = latest - CONFIRMATIONS
  let cursor = await getCursor(CURSOR_KEY)
  if (cursor === undefined) {
    const seed = latest > SEED_LOOKBACK ? latest - SEED_LOOKBACK : GUARD_DEPLOY_BLOCK
    cursor = seed < GUARD_DEPLOY_BLOCK ? GUARD_DEPLOY_BLOCK : seed
  }

  if (cursor > safeHead) {
    console.log(`indexer: caught up at block ${cursor} (head ${safeHead})`)
    return
  }

  let from = cursor
  while (from <= safeHead) {
    const to = from + CHUNK - 1n > safeHead ? safeHead : from + CHUNK - 1n
    await ingestRange(from, to)
    await setCursor(CURSOR_KEY, to)
    from = to + 1n
  }
  console.log(`indexer: processed up to block ${safeHead}`)
}

async function main() {
  requireServer(["DATABASE_URL"])
  const once = process.argv.includes("--once")
  console.log(once ? "indexer: single pass" : `indexer: polling every ${POLL_MS / 1000}s`)

  do {
    await runOnce()
    if (!once) await new Promise((r) => setTimeout(r, POLL_MS))
  } while (!once)
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("indexer fatal:", err)
    process.exit(1)
  },
)
