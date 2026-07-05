// viem chain definition + client factories for HSK Chain testnet (chainId 133).
// Single source of chain facts is `@noviq/env`; this wraps it for viem.

import { HSK_TESTNET } from "@noviq/env"
import { type Account, createPublicClient, createWalletClient, defineChain, http } from "viem"

/** HSK Chain testnet as a viem chain (concrete type for downstream inference). */
export const hskTestnet = defineChain({
  id: HSK_TESTNET.chainId,
  name: HSK_TESTNET.name,
  nativeCurrency: { ...HSK_TESTNET.nativeCurrency },
  rpcUrls: {
    default: { http: [HSK_TESTNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "HSK Testnet Explorer", url: HSK_TESTNET.explorerUrl },
  },
  testnet: true,
})

/** Read-only client against HSK testnet. Pass `rpcUrl` to override the default. */
export function createHskPublicClient(rpcUrl?: string) {
  return createPublicClient({ chain: hskTestnet, transport: http(rpcUrl) })
}

/** Signing client for `account` (session key or owner) against HSK testnet. */
export function createHskWalletClient(params: {
  account: Account | `0x${string}`
  rpcUrl?: string
}) {
  return createWalletClient({
    account: params.account,
    chain: hskTestnet,
    transport: http(params.rpcUrl),
  })
}
