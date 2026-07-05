// Deployed Noviq protocol addresses. Mirrors contracts/deployments/hsk-testnet.json.
// The factory + guard + bond are the shared singletons; individual CovenantAccounts
// are deployed per user via the factory and discovered through its events/views.

import { HSK_TESTNET } from "@noviq/env"
import type { Address } from "viem"

export interface ProtocolAddresses {
  policyGuard: Address
  covenantAccountFactory: Address
  agentBond: Address
}

/** chainId → deployed singleton addresses. */
export const NOVIQ_ADDRESSES: Record<number, ProtocolAddresses> = {
  [HSK_TESTNET.chainId]: {
    policyGuard: "0x3334e3Db8577e184889deAc085d4E55923EcA906",
    covenantAccountFactory: "0xBA055ae34805985089fab405E0f12525684DF1D3",
    agentBond: "0x5B38f7f8D7157300A274f591160E3405Ada7fB80",
  },
}

/** Resolve the protocol addresses for a chain (defaults to HSK testnet). */
export function noviqAddresses(chainId: number = HSK_TESTNET.chainId): ProtocolAddresses {
  const addrs = NOVIQ_ADDRESSES[chainId]
  if (!addrs) throw new Error(`No Noviq deployment for chainId ${chainId}`)
  return addrs
}
