// @noviq/sdk — viem bindings, policy schema, shared types.
// Re-export chain facts for early consumers.
export { HSK_TESTNET } from "@noviq/env"

// Phase-2 contract layer: typed ABIs + deployed addresses (consumed in Phase 3).
export * from "./abis"
export { NOVIQ_ADDRESSES, noviqAddresses, type ProtocolAddresses } from "./addresses"

// Phase-3: covenant policy schema/encoder, viem chain + contract bindings.
export * from "./policy"
export * from "./chain"
export * from "./contracts"
