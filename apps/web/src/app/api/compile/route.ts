import { compileCovenant } from "@noviq/ai"
import { encodePolicy } from "@noviq/sdk"
import { NextResponse } from "next/server"
import { errMessage, jsonSafe } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Compile a plain-English covenant → validated policy + encoded setPolicy args. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { covenant?: string; context?: Record<string, unknown> }
    | null
  if (!body?.covenant || typeof body.covenant !== "string") {
    return NextResponse.json({ error: "Body must include { covenant: string }" }, { status: 400 })
  }
  try {
    const { policy, clarifications } = await compileCovenant(body.covenant, body.context ?? {})
    const encoded = encodePolicy(policy)
    return NextResponse.json(jsonSafe({ policy, clarifications, encoded }))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
