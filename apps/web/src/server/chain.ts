// Server-side chain access for the relayer (worker + attack console).
//
// The backend holds ONLY the scoped agent session key. Owner actions never touch
// this module. All agent-key sends are funneled through a single serialized
// queue so the one EOA never races its own nonce.

import { requireServer, serverEnv } from "@noviq/env"
import {
  NATIVE_ASSET,
  covenantAccountAbi,
  createHskPublicClient,
  createHskWalletClient,
  simulateAction,
} from "@noviq/sdk"
import {
  type Address,
  type Hex,
  encodeAbiParameters,
  formatEther,
  keccak256,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { decodeExecuteRevert } from "./decode"

/** Gas cap used to force a covenant-violating tx to actually mine (as reverted). */
const REVERT_GAS = 300_000n

export const publicClient = createHskPublicClient(serverEnv().HSK_RPC_URL)

let cachedAgent: ReturnType<typeof buildAgent> | undefined
function buildAgent() {
  const { AGENT_PRIVATE_KEY } = requireServer(["AGENT_PRIVATE_KEY"])
  const account = privateKeyToAccount(AGENT_PRIVATE_KEY as Hex)
  const wallet = createHskWalletClient({ account, rpcUrl: serverEnv().HSK_RPC_URL })
  return { account, wallet }
}
/** Lazily construct the agent signer (only when a send is actually needed). */
export function agent() {
  if (!cachedAgent) cachedAgent = buildAgent()
  return cachedAgent
}

// Serialize all agent-key sends: one EOA, one in-flight nonce at a time.
let sendChain: Promise<unknown> = Promise.resolve()
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = sendChain.then(fn, fn)
  sendChain = next.catch(() => undefined)
  return next
}

/** Deterministic action id, identical to CovenantAccount.hashAction on-chain. */
export function hashAction(target: Address, value: bigint, data: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
      [target, value, data],
    ),
  )
}

export interface ExecuteResult {
  status: "allowed" | "blocked"
  reasonCode: number
  reasonLabel: string
  txHash: Hex | undefined
  block: bigint | undefined
}

/**
 * Submit an agent action through the covenant.
 *  - Pre-checks with the guard `simulate` view (deterministic source of truth).
 *  - If allowed: sends normally and waits for the receipt.
 *  - If blocked: records the reason. With `evenIfBlocked`, still sends (gas-capped)
 *    so a real reverted tx lands on-chain as attack-console evidence.
 */
export function submitExecute(
  accountAddress: Address,
  target: Address,
  value: bigint,
  data: Hex,
  opts: { evenIfBlocked?: boolean } = {},
): Promise<ExecuteResult> {
  return serialize(async () => {
    const { wallet } = agent()
    const sim = await simulateAction(publicClient, accountAddress, target, value, data)

    if (!sim.allowed) {
      let txHash: Hex | undefined
      if (opts.evenIfBlocked) {
        try {
          txHash = await wallet.writeContract({
            address: accountAddress,
            abi: covenantAccountAbi,
            functionName: "execute",
            args: [target, value, data],
            gas: REVERT_GAS,
          })
          await publicClient.waitForTransactionReceipt({ hash: txHash }).catch(() => undefined)
        } catch (err) {
          // Rejected pre-mine by the node — the decoded reason still comes from sim.
          const decoded = decodeExecuteRevert(err)
          if (decoded.reasonCode >= 0) {
            return { status: "blocked", ...decoded, txHash, block: undefined }
          }
        }
      }
      return {
        status: "blocked",
        reasonCode: sim.code,
        reasonLabel: sim.label,
        txHash,
        block: undefined,
      }
    }

    const txHash = await wallet.writeContract({
      address: accountAddress,
      abi: covenantAccountAbi,
      functionName: "execute",
      args: [target, value, data],
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    const ok = receipt.status === "success"
    return {
      status: ok ? "allowed" : "blocked",
      reasonCode: ok ? 0 : -1,
      reasonLabel: ok ? "Allowed" : "Reverted on-chain",
      txHash,
      block: receipt.blockNumber,
    }
  })
}

/** Native HSK balance of an address, formatted to whole HSK. */
export async function balanceHsk(address: Address): Promise<string> {
  const wei = await publicClient.getBalance({ address })
  return formatEther(wei)
}

export { NATIVE_ASSET }
