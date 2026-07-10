// Deployed Noviq protocol addresses. Mirrors contracts/deployments/hsk-mainnet.json.
// The factory + guard + bond are the shared singletons; individual CovenantAccounts
// are deployed per user via the factory and discovered through its events/views.

import { HSK_MAINNET } from "@noviq/env"
import type { Address } from "viem"

export interface ProtocolAddresses {
  policyGuard: Address
  covenantAccountFactory: Address
  agentBond: Address
}

/** chainId → deployed singleton addresses. */
export const NOVIQ_ADDRESSES: Record<number, ProtocolAddresses> = {
  [HSK_MAINNET.chainId]: {
    policyGuard: "0x6c4ed8f7571af72b76ebac1d33e855b6e85ce151" as Address,
    covenantAccountFactory: "0x54f10c245ee7ebd881ca79940e472c9b912ebbc8" as Address,
    agentBond: "0xf58c9c49688c52336748521b04199f1d141773e1" as Address,
  },
}

/** Resolve the protocol addresses for a chain (defaults to HSK mainnet). */
export function noviqAddresses(chainId: number = HSK_MAINNET.chainId): ProtocolAddresses {
  const addrs = NOVIQ_ADDRESSES[chainId]
  if (!addrs) throw new Error(`No Noviq deployment for chainId ${chainId}`)
  return addrs
}
