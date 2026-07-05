import { listAccounts } from "@noviq/db"
import { NextResponse } from "next/server"
import { errMessage, jsonSafe } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** List all known covenant accounts. */
export async function GET() {
  try {
    const accounts = await listAccounts()
    return NextResponse.json(jsonSafe({ accounts }))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
