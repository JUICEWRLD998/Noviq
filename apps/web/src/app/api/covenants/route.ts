import { listAccounts, upsertAccount, upsertUser } from "@noviq/db"
import { HSK_TESTNET } from "@noviq/sdk"
import { NextResponse } from "next/server"
import { isAddress } from "viem"
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

/**
 * Persist a covenant account the owner just deployed from their wallet, so it
 * appears immediately without waiting for the indexer. Idempotent by address —
 * the indexer's later upsert of the same AccountCreated log is a no-op merge.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    address?: string
    ownerAddress?: string
    agentAddress?: string
    deployTx?: string
    deployBlock?: string
  } | null

  if (!body?.address || !isAddress(body.address)) {
    return NextResponse.json({ error: "Body must include a valid { address }" }, { status: 400 })
  }
  if (!body.ownerAddress || !isAddress(body.ownerAddress)) {
    return NextResponse.json(
      { error: "Body must include a valid { ownerAddress }" },
      { status: 400 },
    )
  }
  if (!body.agentAddress || !isAddress(body.agentAddress)) {
    return NextResponse.json(
      { error: "Body must include a valid { agentAddress }" },
      { status: 400 },
    )
  }

  try {
    await upsertUser(body.ownerAddress)
    const account = await upsertAccount({
      address: body.address,
      chainId: HSK_TESTNET.chainId,
      ownerAddress: body.ownerAddress,
      agentAddress: body.agentAddress,
      ...(body.deployTx ? { deployTx: body.deployTx } : {}),
      ...(body.deployBlock ? { deployBlock: BigInt(body.deployBlock) } : {}),
    })
    return NextResponse.json(jsonSafe({ account }))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
