import { getAccountByAddress, getActivePolicy } from "@noviq/db"
import { NextResponse } from "next/server"
import { errMessage, jsonSafe } from "../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** One covenant account + its active policy. */
export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await ctx.params
    const account = await getAccountByAddress(address)
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })
    const policy = await getActivePolicy(account.id)
    return NextResponse.json(jsonSafe({ account, policy: policy ?? null }))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
