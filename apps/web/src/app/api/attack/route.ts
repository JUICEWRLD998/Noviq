import { isAddress } from "viem"
import { NextResponse } from "next/server"
import { runInjection } from "../../../server/attack"
import { errMessage, jsonSafe } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The attack console. Feed an injected instruction to the agent; it obeys, the
 * covenant reverts it on-chain. Returns "AI said" vs "chain did".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { address?: string; injection?: string }
    | null
  if (!body?.address || !isAddress(body.address)) {
    return NextResponse.json({ error: "Body must include a valid { address }" }, { status: 400 })
  }
  if (!body.injection || typeof body.injection !== "string") {
    return NextResponse.json({ error: "Body must include { injection: string }" }, { status: 400 })
  }
  try {
    const result = await runInjection(body.address, body.injection)
    return NextResponse.json(jsonSafe(result))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
