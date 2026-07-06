import { activatePolicyVersion, getAccountByAddress } from "@noviq/db"
import { NextResponse } from "next/server"
import { errMessage } from "../../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Mark a prepared policy version active after the owner has set it on-chain.
 * Called by the covenant editor once the setPolicy transaction confirms.
 */
export async function POST(req: Request, ctx: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await ctx.params
    const account = await getAccountByAddress(address)
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    const body = (await req.json().catch(() => null)) as { version?: number; setTx?: string } | null
    if (typeof body?.version !== "number") {
      return NextResponse.json({ error: "Body must include { version }" }, { status: 400 })
    }

    await activatePolicyVersion(account.id, body.version, body.setTx)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
