// Typed viem bindings for the deployed Noviq protocol contracts, plus the two
// read helpers the app leans on before Phase 4 wires the full flow: `simulate`
// (dry-run the guard) and `getConfig` (read a covenant back).

import { HSK_MAINNET } from "@noviq/env"
import {
  type Address,
  type Client,
  type GetContractReturnType,
  type Hex,
  type PublicClient,
  getContract,
} from "viem"
import { agentBondAbi, covenantAccountAbi, covenantAccountFactoryAbi, policyGuardAbi } from "./abis"
import { noviqAddresses } from "./addresses"
import { type ReasonCode, reasonLabel } from "./policy"

/** The shared PolicyGuard singleton, bound to `client`. */
export function getPolicyGuard<C extends Client>(
  client: C,
  chainId = HSK_MAINNET.chainId,
): GetContractReturnType<typeof policyGuardAbi, C, Address> {
  return getContract({ address: noviqAddresses(chainId).policyGuard, abi: policyGuardAbi, client })
}

/** The CovenantAccountFactory singleton, bound to `client`. */
export function getAccountFactory<C extends Client>(
  client: C,
  chainId = HSK_MAINNET.chainId,
): GetContractReturnType<typeof covenantAccountFactoryAbi, C, Address> {
  return getContract({
    address: noviqAddresses(chainId).covenantAccountFactory,
    abi: covenantAccountFactoryAbi,
    client,
  })
}

/** The AgentBond singleton, bound to `client`. */
export function getAgentBond<C extends Client>(
  client: C,
  chainId = HSK_MAINNET.chainId,
): GetContractReturnType<typeof agentBondAbi, C, Address> {
  return getContract({ address: noviqAddresses(chainId).agentBond, abi: agentBondAbi, client })
}

/** A specific per-user CovenantAccount at `address`, bound to `client`. */
export function getCovenantAccount<C extends Client>(
  address: Address,
  client: C,
): GetContractReturnType<typeof covenantAccountAbi, C, Address> {
  return getContract({ address, abi: covenantAccountAbi, client })
}

/** Outcome of a guard dry-run: allowed flag plus the decoded reason. */
export interface SimulationResult {
  allowed: boolean
  code: ReasonCode
  label: string
}

/**
 * Dry-run an agent action against a covenant without sending a transaction.
 * Mirrors `execute(target, value, data)` and returns the guard's verdict.
 */
export async function simulateAction(
  client: PublicClient,
  account: Address,
  target: Address,
  value: bigint,
  data: Hex,
): Promise<SimulationResult> {
  const [allowed, code] = await client.readContract({
    address: noviqAddresses(client.chain?.id).policyGuard,
    abi: policyGuardAbi,
    functionName: "simulate",
    args: [account, target, value, data],
  })
  return { allowed, code: code as ReasonCode, label: reasonLabel(code) }
}

/** Read the stored `PolicyConfig` for a covenant account. */
export function readPolicyConfig(client: PublicClient, account: Address) {
  return client.readContract({
    address: noviqAddresses(client.chain?.id).policyGuard,
    abi: policyGuardAbi,
    functionName: "getConfig",
    args: [account],
  })
}
