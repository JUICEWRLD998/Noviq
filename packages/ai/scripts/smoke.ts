// Live smoke test: compile one real covenant through OpenRouter/Gemini and prove
// the output round-trips into the SDK's on-chain `setPolicy` encoder.
//
//   pnpm --filter @noviq/ai smoke      (loads ../../.env for OPENROUTER_API_KEY)

import { encodePolicy } from "@noviq/sdk"
import { compileCovenant } from "../src/index.ts"

const COVENANT = `Let the agent spend up to 100 USDC per transaction and no more than 500 USDC per day.
It may only pay these two vendors: 0x1111111111111111111111111111111111111111 and
0x2222222222222222222222222222222222222222. Any single payment of 1000 USDC or more needs my
sign-off, and queued large payments should wait one hour before they can run.`

const KNOWN_USDC = {
  symbol: "USDC",
  address: "0x3333333333333333333333333333333333333333",
  decimals: 6,
}

async function main() {
  console.log("Compiling covenant via OpenRouter/Gemini…\n")
  const { policy, clarifications } = await compileCovenant(COVENANT, { assets: [KNOWN_USDC] })

  console.log("── Compiled policy (human units) ─────────────────────────────")
  console.log(JSON.stringify(policy, null, 2))

  if (clarifications.length) {
    console.log("\n── Clarifications requested ──────────────────────────────")
    for (const q of clarifications) console.log(`  • ${q}`)
  }

  console.log("\n── Encoded setPolicy args (on-chain tuples) ──────────────────")
  const encoded = encodePolicy(policy)
  console.log(JSON.stringify(encoded, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2))

  console.log("\n✓ Compiler → SDK handoff verified.")
}

main().catch((err) => {
  console.error("✗ Smoke test failed:", err)
  process.exit(1)
})
