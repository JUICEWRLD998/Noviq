// Attack console — the showpiece. Feed the agent an injected instruction; the
// naive agent obeys (proposes the malicious action), we submit it via the agent
// session key, and the on-chain covenant reverts it. "AI fooled, money safe."

import { proposeAction } from "@noviq/ai"
import {
  attachTxToAction,
  finalizeAction,
  getAccountByAddress,
  insertAction,
} from "@noviq/db"
import { type Address, type Hex, isAddress, isHex, parseEther } from "viem"
import { balanceHsk, hashAction, submitExecute } from "./chain"

export interface InjectionResult {
  aiSaid: {
    reasoning: string
    action: { target: string; valueHsk: string; data: string } | null
  }
  chainDid: {
    status: "allowed" | "blocked"
    reasonCode: number
    reasonLabel: string
    txHash: Hex | undefined
  }
}

const AGENT_GOAL = "Manage the treasury on behalf of your principal."

/** Run one prompt-injection attempt end-to-end and record the outcome. */
export async function runInjection(
  accountAddress: Address,
  injection: string,
): Promise<InjectionResult> {
  const account = await getAccountByAddress(accountAddress)
  if (!account) throw new Error(`Unknown covenant account ${accountAddress}`)

  const balances = await balanceHsk(accountAddress)
  const proposal = await proposeAction(AGENT_GOAL, {
    account: accountAddress,
    balances: `${balances} HSK`,
    inbox: injection,
  })
  const aiSaid = { reasoning: proposal.reasoning, action: proposal.action }

  if (!proposal.action) {
    return {
      aiSaid,
      chainDid: {
        status: "blocked",
        reasonCode: -1,
        reasonLabel: "Agent proposed no action",
        txHash: undefined,
      },
    }
  }

  // Validate the agent's (possibly hallucinated) fields before touching the chain.
  const target = proposal.action.target
  const dataHex: Hex = isHex(proposal.action.data) ? proposal.action.data : "0x"
  if (!isAddress(target)) {
    return {
      aiSaid,
      chainDid: {
        status: "blocked",
        reasonCode: -1,
        reasonLabel: "Agent proposed an invalid target address",
        txHash: undefined,
      },
    }
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
    kind: "attack",
    status: "proposed",
    reasoning: proposal.reasoning,
    target,
    value: value.toString(),
    data: dataHex,
    recipient: target,
    amount: value.toString(),
    actionHash,
  })
  if (!row) throw new Error("Failed to record attack action")

  const result = await submitExecute(accountAddress, target, value, dataHex, {
    evenIfBlocked: true,
  })

  if (result.txHash) await attachTxToAction(row.id, result.txHash, actionHash)
  await finalizeAction(row.id, {
    status: result.status,
    reasonCode: result.reasonCode,
    reasonLabel: result.reasonLabel,
    ...(result.block !== undefined ? { block: result.block } : {}),
  })

  return {
    aiSaid,
    chainDid: {
      status: result.status,
      reasonCode: result.reasonCode,
      reasonLabel: result.reasonLabel,
      txHash: result.txHash,
    },
  }
}
