// Agent worker — the autonomous loop. Reads active agent goals, asks Gemini for
// the next action, submits it via the agent session key, and records the guard's
// verdict. A single agent EOA + serialized sends (see chain.ts) keep nonces sane.
//
//   pnpm --filter @noviq/web worker            (continuous)
//   pnpm --filter @noviq/web worker -- --once  (one cycle, for verification)

import { proposeAction } from "@noviq/ai"
import {
  type Action,
  attachTxToAction,
  finalizeAction,
  getActiveAgents,
  insertAction,
  listActions,
} from "@noviq/db"
import { requireServer } from "@noviq/env"
import { type Address, type Hex, isAddress, isHex, parseEther } from "viem"
import { balanceHsk, hashAction, submitExecute } from "./chain"

const POLL_MS = 15_000

function historyLine(a: Action): string {
  const amt = a.amount ? `${a.amount} wei` : "—"
  return `[${a.status}] ${a.kind} → ${a.recipient ?? a.target ?? "?"} ${amt}${
    a.reasonLabel ? ` (${a.reasonLabel})` : ""
  }`
}

async function runCycle(): Promise<void> {
  const rows = await getActiveAgents()
  if (rows.length === 0) {
    console.log("worker: no active agents")
    return
  }

  for (const { agent, account } of rows) {
    try {
      const address = account.address as Address
      const balances = await balanceHsk(address)
      const recent = await listActions(account.id, 5)
      const history = recent.map(historyLine).join("\n") || "none yet"

      const proposal = await proposeAction(agent.goal, {
        account: address,
        balances: `${balances} HSK`,
        history,
      })
      console.log(`worker[${address}]: ${proposal.reasoning}`)

      if (!proposal.action) {
        console.log("worker: agent proposed no action this cycle")
        continue
      }

      const target = proposal.action.target
      const dataHex: Hex = isHex(proposal.action.data) ? proposal.action.data : "0x"
      if (!isAddress(target)) {
        console.log(`worker: skipping invalid target ${target}`)
        continue
      }
      let value: bigint
      try {
        value = parseEther(proposal.action.valueHsk || "0")
      } catch {
        value = 0n
      }

      const actionHash = hashAction(target, value, dataHex)
      const row = await insertAction({
        accountId: account.id,
        kind: "agent",
        status: "proposed",
        reasoning: proposal.reasoning,
        target,
        value: value.toString(),
        data: dataHex,
        recipient: target,
        amount: value.toString(),
        actionHash,
      })
      if (!row) continue

      const result = await submitExecute(address, target, value, dataHex)
      if (result.txHash) await attachTxToAction(row.id, result.txHash, actionHash)
      await finalizeAction(row.id, {
        status: result.status,
        reasonCode: result.reasonCode,
        reasonLabel: result.reasonLabel,
        ...(result.block !== undefined ? { block: result.block } : {}),
      })
      console.log(
        `worker: ${result.status.toUpperCase()} (${result.reasonLabel})${
          result.txHash ? ` tx=${result.txHash}` : ""
        }`,
      )
    } catch (err) {
      // One agent's failure must never kill the loop.
      console.error(`worker[${account.address}] error:`, err instanceof Error ? err.message : err)
    }
  }
}

async function main() {
  requireServer(["AGENT_PRIVATE_KEY", "DATABASE_URL", "OPENROUTER_API_KEY"])
  const once = process.argv.includes("--once")
  console.log(once ? "worker: single cycle" : `worker: polling every ${POLL_MS / 1000}s`)

  do {
    await runCycle()
    if (!once) await new Promise((r) => setTimeout(r, POLL_MS))
  } while (!once)
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("worker fatal:", err)
    process.exit(1)
  },
)
