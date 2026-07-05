import { HSK_TESTNET, noviqAddresses } from "@noviq/sdk"
import { NextResponse } from "next/server"
import { privateKeyToAccount } from "viem/accounts"
import { errMessage } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Public onboarding config: the backend agent (session-key) address the owner
 * must bind when deploying a CovenantAccount, plus chain + factory. Reads the
 * agent address directly (or derives it from the key) to avoid pulling in the
 * full server-env validation at build time.
 */
export async function GET() {
  try {
    let agentAddress = process.env.AGENT_ADDRESS
    if (!agentAddress) {
      const key = process.env.AGENT_PRIVATE_KEY
      if (key && /^0x[0-9a-fA-F]{64}$/.test(key)) {
        agentAddress = privateKeyToAccount(key as `0x${string}`).address
      }
    }
    if (!agentAddress) {
      return NextResponse.json({ error: "Agent key not configured on the server" }, { status: 500 })
    }
    return NextResponse.json({
      agentAddress,
      chainId: HSK_TESTNET.chainId,
      factory: noviqAddresses(HSK_TESTNET.chainId).covenantAccountFactory,
    })
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
