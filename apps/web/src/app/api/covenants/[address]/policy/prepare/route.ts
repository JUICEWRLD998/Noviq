import { compileCovenant } from "@noviq/ai"
import { getAccountByAddress, insertPolicyVersion } from "@noviq/db"
import { type PolicyInput, covenantAccountAbi, encodePolicy } from "@noviq/sdk"
import { encodeFunctionData } from "viem"
import { NextResponse } from "next/server"
import { errMessage, jsonSafe } from "../../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Prepare a covenant update for the OWNER wallet to sign (relayer model — the
 * backend never holds the owner key). Compiles NL if given, encodes the
 * `setPolicy` calldata, and persists the policy as an inactive draft.
 */
export async function POST(req: Request, ctx: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await ctx.params
    const account = await getAccountByAddress(address)
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    const body = (await req.json().catch(() => null)) as
      | { covenant?: string; policy?: PolicyInput }
      | null

    let policy: PolicyInput
    let clarifications: string[] = []
    let sourceText: string | undefined
    if (body?.covenant) {
      const compiled = await compileCovenant(body.covenant)
      policy = compiled.policy
      clarifications = compiled.clarifications
      sourceText = body.covenant
    } else if (body?.policy) {
      policy = body.policy
    } else {
      return NextResponse.json({ error: "Body must include { covenant } or { policy }" }, { status: 400 })
    }

    const encoded = encodePolicy(policy)
    const calldata = encodeFunctionData({
      abi: covenantAccountAbi,
      functionName: "setPolicy",
      args: [encoded.config, encoded.limits, encoded.recipients, encoded.selectors, encoded.targets],
    })

    await insertPolicyVersion({
      accountId: account.id,
      policyJson: policy as unknown as Record<string, unknown>,
      active: false,
      ...(sourceText !== undefined ? { sourceText } : {}),
    })

    return NextResponse.json(jsonSafe({ policy, clarifications, to: address, calldata, encoded }))
  } catch (err) {
    return NextResponse.json({ error: errMessage(err) }, { status: 500 })
  }
}
