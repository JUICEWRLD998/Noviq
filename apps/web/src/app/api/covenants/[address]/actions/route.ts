import { getAccountByAddress, listActions } from "@noviq/db"
import { NextResponse } from "next/server"
import { errMessage, jsonSafe } from "../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Recent actions (proposed/allowed/blocked) for an account. */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await ctx.params
    const account = await getAccountByAddress(address)
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? "50")
    const actions = await listActions(account.id, Number.isFinite(limit) ? limit : 50)
    return NextResponse.json(jsonSafe({ actions }))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
