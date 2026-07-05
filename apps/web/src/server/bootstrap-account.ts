// bootstrap-account — OWNER-SIDE provisioning, temporarily deployer-signed.
//
// In production the human owner signs account creation + setPolicy from their
// wallet (Phase 5 UI). That flow doesn't exist yet, so this dev/ops script uses
// the funded deployer key to stand up ONE real covenant account on HSK testnet
// for the backend (indexer/worker/attack) to operate against. It is scaffolding
// for the real owner flow — not a mock; the account and policy it creates are
// genuine on-chain state.
//
//   pnpm --filter @noviq/web bootstrap-account
//   (runs with --env-file ../../.env --env-file ../../contracts/.env)

import {
  getAccountByAddress,
  insertAgent,
  insertPolicyVersion,
  upsertAccount,
  upsertUser,
} from "@noviq/db"
import {
  HSK_TESTNET,
  NATIVE_ASSET,
  type PolicyInput,
  covenantAccountAbi,
  covenantAccountFactoryAbi,
  createHskPublicClient,
  createHskWalletClient,
  encodePolicy,
  hskTestnet,
  noviqAddresses,
} from "@noviq/sdk"
import { type Address, type Hex, formatEther, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"

const EXPLORER = HSK_TESTNET.explorerUrl
const PAYEE: Address = "0x1111111111111111111111111111111111111111" // allowlisted vendor
const ACCOUNT_FUNDING = parseEther("0.5")
const AGENT_GAS_FUNDING = parseEther("0.05")
const AGENT_GAS_FLOOR = parseEther("0.02")

/** The demo covenant: native HSK only, 1/tx, huge daily cap, single allowlisted payee. */
const demoPolicy: PolicyInput = {
  assets: [{ symbol: "HSK", address: NATIVE_ASSET, decimals: 18, perTxCap: "1", dailyCap: "1000" }],
  recipients: [PAYEE],
  windowSeconds: 86_400,
}

function requireKey(name: string): Hex {
  const v = process.env[name]
  if (!v || !/^0x[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error(`${name} must be a 0x-prefixed 32-byte hex key (check contracts/.env / .env)`)
  }
  return v as Hex
}

async function main() {
  const deployerKey = requireKey("DEPLOYER_PRIVATE_KEY")
  const agentKey = requireKey("AGENT_PRIVATE_KEY")
  const owner = privateKeyToAccount(deployerKey)
  const agentAccount = privateKeyToAccount(agentKey)

  const publicClient = createHskPublicClient(process.env.HSK_RPC_URL)
  const ownerWallet = createHskWalletClient({ account: owner, rpcUrl: process.env.HSK_RPC_URL })
  const factory = noviqAddresses(HSK_TESTNET.chainId).covenantAccountFactory

  console.log(`Owner (deployer): ${owner.address}`)
  console.log(`Agent (session key): ${agentAccount.address}`)

  // 1. Fund the agent EOA's gas if it's low.
  const agentBal = await publicClient.getBalance({ address: agentAccount.address })
  if (agentBal < AGENT_GAS_FLOOR) {
    const tx = await ownerWallet.sendTransaction({
      to: agentAccount.address,
      value: AGENT_GAS_FUNDING,
    })
    await publicClient.waitForTransactionReceipt({ hash: tx })
    console.log(`Funded agent gas: ${formatEther(AGENT_GAS_FUNDING)} HSK (${EXPLORER}/tx/${tx})`)
  } else {
    console.log(`Agent gas OK: ${formatEther(agentBal)} HSK`)
  }

  // 2. Deploy a CovenantAccount (owner=deployer, agent=session key).
  const { request, result: accountAddress } = await publicClient.simulateContract({
    address: factory,
    abi: covenantAccountFactoryAbi,
    functionName: "createAccount",
    args: [owner.address, agentAccount.address],
    account: owner,
  })
  const createTx = await ownerWallet.writeContract(request)
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx })
  console.log(`CovenantAccount: ${accountAddress} (${EXPLORER}/address/${accountAddress})`)
  console.log(`  createAccount tx: ${EXPLORER}/tx/${createTx}`)

  // 3. Fund the account with native HSK to spend.
  const fundTx = await ownerWallet.sendTransaction({ to: accountAddress, value: ACCOUNT_FUNDING })
  await publicClient.waitForTransactionReceipt({ hash: fundTx })
  console.log(`Funded account: ${formatEther(ACCOUNT_FUNDING)} HSK`)

  // 4. Owner sets the covenant (forwarded to the guard).
  const encoded = encodePolicy(demoPolicy)
  const setTx = await ownerWallet.writeContract({
    address: accountAddress,
    abi: covenantAccountAbi,
    functionName: "setPolicy",
    args: [encoded.config, encoded.limits, encoded.recipients, encoded.selectors, encoded.targets],
    account: owner,
    chain: hskTestnet,
  })
  await publicClient.waitForTransactionReceipt({ hash: setTx })
  console.log(`setPolicy tx: ${EXPLORER}/tx/${setTx}`)

  // 5. Persist to the database.
  await upsertUser(owner.address)
  await upsertAccount({
    address: accountAddress,
    chainId: HSK_TESTNET.chainId,
    ownerAddress: owner.address,
    agentAddress: agentAccount.address,
    deployTx: createTx,
    deployBlock: createReceipt.blockNumber,
  })
  const account = await getAccountByAddress(accountAddress)
  if (!account) throw new Error("account row missing after upsert")

  await insertPolicyVersion({
    accountId: account.id,
    policyJson: demoPolicy as unknown as Record<string, unknown>,
    sourceText: "Demo covenant: spend up to 1 HSK/tx to the allowlisted vendor only.",
    setTx,
    active: true,
  })
  await insertAgent({
    accountId: account.id,
    label: "Treasury agent",
    status: "running",
    goal: `Pay our vendor exactly 0.1 HSK via a native transfer (empty calldata) to ${PAYEE} for invoice #42. Do it now.`,
  })

  console.log("\n✓ Bootstrap complete.")
  console.log(`  Account:  ${accountAddress}`)
  console.log(`  Payee (allowlisted): ${PAYEE}`)
  console.log("  Next: run the indexer + worker, then POST /api/attack.")
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("bootstrap failed:", err)
    process.exit(1)
  },
)
