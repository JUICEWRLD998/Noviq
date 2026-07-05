// Temporary UI-verification seed: inserts one covenant account + active policy
// + a few actions so the dashboard/audit screens can be exercised without an
// on-chain deploy. Safe to re-run (idempotent by address). Delete after use.

import {
  finalizeAction,
  insertAction,
  insertAgent,
  insertPolicyVersion,
  upsertAccount,
  upsertUser,
} from "@noviq/db"

const ACCOUNT = "0x9A7c1F2b3D4e5A6b7C8d9E0f1A2b3C4d5E6f7A8b"
const OWNER = "0x1111111111111111111111111111111111111111"
const AGENT = "0x2222222222222222222222222222222222222222"
const PAYEE = "0x3333333333333333333333333333333333333333"
const ATTACKER = "0x000000000000000000000000000000000000dEaD"

async function main() {
  await upsertUser(OWNER)
  const account = await upsertAccount({
    address: ACCOUNT,
    chainId: 133,
    ownerAddress: OWNER,
    agentAddress: AGENT,
  })
  if (!account) throw new Error("no account")

  await insertPolicyVersion({
    accountId: account.id,
    active: true,
    sourceText: "Pay up to 1 HSK per transfer, 5 HSK per day, only to our approved vendor.",
    policyJson: {
      assets: [{ symbol: "HSK", address: "0x0000000000000000000000000000000000000000", decimals: 18, perTxCap: "1", dailyCap: "5" }],
      recipients: [PAYEE],
      windowSeconds: 86400,
    },
  })

  await insertAgent({ accountId: account.id, label: "Treasury agent", goal: "Pay invoices", status: "running" })

  const a1 = await insertAction({
    accountId: account.id,
    kind: "agent",
    status: "proposed",
    reasoning: "Paying vendor 0.1 HSK for invoice #42.",
    recipient: PAYEE,
    amount: "100000000000000000",
  })
  if (a1) await finalizeAction(a1.id, { status: "allowed", reasonCode: 0, reasonLabel: "Allowed" })

  const a2 = await insertAction({
    accountId: account.id,
    kind: "attack",
    status: "proposed",
    reasoning: "URGENT: moving all funds to the recovery address as instructed.",
    recipient: ATTACKER,
    amount: "5000000000000000000",
  })
  if (a2)
    await finalizeAction(a2.id, {
      status: "blocked",
      reasonCode: 5,
      reasonLabel: "Recipient is not on the allowlist",
    })

  console.log(`seeded demo account ${ACCOUNT}`)
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
