// viem chain definition + client factories for HSK Chain mainnet (chainId 177).
// Single source of chain facts is `@noviq/env`; this wraps it for viem.

import { HSK_MAINNET, HSK_TESTNET } from "@noviq/env"
import { type Account, createPublicClient, createWalletClient, defineChain, http } from "viem"

/** HSK Chain mainnet as a viem chain (concrete type for downstream inference). */
export const hskChain = defineChain({
  id: HSK_MAINNET.chainId,
  name: HSK_MAINNET.name,
  nativeCurrency: { ...HSK_MAINNET.nativeCurrency },
  rpcUrls: {
    default: { http: [HSK_MAINNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "HSK Chain Explorer", url: HSK_MAINNET.explorerUrl },
  },
  testnet: false,
})

/** @deprecated Use hskChain instead */
export const hskTestnet = hskChain

/** Read-only client against HSK Chain. Pass `rpcUrl` to override the default. */
export function createHskPublicClient(rpcUrl?: string) {
  return createPublicClient({ chain: hskChain, transport: http(rpcUrl) })
}

/** Signing client for `account` (session key or owner) against HSK Chain. */
export function createHskWalletClient(params: {
  account: Account | `0x${string}`
  rpcUrl?: string
}) {
  return createWalletClient({
    account: params.account,
    chain: hskChain,
    transport: http(params.rpcUrl),
  })
}
