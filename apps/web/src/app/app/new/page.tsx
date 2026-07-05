"use client"

import { ConnectButton, TxLink } from "@/components/chain"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import { Input, LabeledField } from "@/components/ui/Field"
import { useToast } from "@/components/ui/Toast"
import { shorten } from "@/lib/format"
import { covenantAccountFactoryAbi, hskTestnet, noviqAddresses } from "@noviq/sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { type Address, type Hex, parseEther } from "viem"
import { useAccount, usePublicClient, useSendTransaction, useWriteContract } from "wagmi"
import styles from "./new.module.css"

const factory = noviqAddresses(hskTestnet.id).covenantAccountFactory

type Phase = "connect" | "ready" | "deploying" | "deployed" | "funding" | "funded"

export default function NewCovenantPage() {
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const toast = useToast()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>("ready")
  const [account, setAccount] = useState<Address | null>(null)
  const [deployTx, setDeployTx] = useState<Hex | null>(null)
  const [fundTx, setFundTx] = useState<Hex | null>(null)
  const [amount, setAmount] = useState("0.5")
  const [error, setError] = useState<string | null>(null)

  const wrongChain = isConnected && chainId !== hskTestnet.id
  const gated = !isConnected || wrongChain

  async function deploy() {
    if (!address || !publicClient) return
    setError(null)
    setPhase("deploying")
    try {
      const cfg = await fetch("/api/config").then((r) => r.json())
      if (!cfg.agentAddress) throw new Error(cfg.error ?? "Agent key not configured on the server")
      const agent = cfg.agentAddress as Address

      // Predict the deterministic account address, then deploy.
      const sim = await publicClient.simulateContract({
        address: factory,
        abi: covenantAccountFactoryAbi,
        functionName: "createAccount",
        args: [address, agent],
        account: address,
      })
      const predicted = sim.result as Address

      const hash = await writeContractAsync({
        address: factory,
        abi: covenantAccountFactoryAbi,
        functionName: "createAccount",
        args: [address, agent],
      })
      setDeployTx(hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      await fetch("/api/covenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: predicted,
          ownerAddress: address,
          agentAddress: agent,
          deployTx: hash,
          deployBlock: receipt.blockNumber.toString(),
        }),
      })

      setAccount(predicted)
      setPhase("deployed")
      toast({ title: "Covenant account deployed", tone: "success" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deployment failed")
      setPhase("ready")
    }
  }

  async function fund() {
    if (!account || !publicClient) return
    setError(null)
    setPhase("funding")
    try {
      const value = parseEther(amount || "0")
      const hash = await sendTransactionAsync({ to: account, value })
      setFundTx(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      setPhase("funded")
      toast({ title: `Funded ${amount} HSK`, tone: "success" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Funding failed")
      setPhase("deployed")
    }
  }

  return (
    <>
      <PageHeader
        kicker="New covenant"
        title="Deploy a covenant account"
        description="Deploy a smart-contract wallet bound to the Noviq guard, fund it, then compile its first policy. You sign each step from your own wallet."
      />

      <div className={styles.flow}>
        {gated && (
          <div className={styles.gate}>
            <p className={styles.gateText}>
              {wrongChain
                ? "Switch your wallet to HSK Chain testnet to continue."
                : "Connect your wallet to deploy a covenant account."}
            </p>
            <ConnectButton />
          </div>
        )}

        {!gated && (
          <ol className={styles.steps}>
            {/* Step 1 — deploy */}
            <li className={styles.step} data-done={account ? true : undefined}>
              <span className={styles.stepNum}>1</span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>Deploy the account</h3>
                <p className={styles.stepText}>
                  Creates a CovenantAccount owned by <code>{shorten(address ?? "")}</code> and
                  operated by the Noviq agent session key.
                </p>
                {account ? (
                  <p className={styles.result}>
                    Deployed <code>{shorten(account, 8, 6)}</code>
                    {deployTx && (
                      <>
                        {" · "}
                        <TxLink hash={deployTx} />
                      </>
                    )}
                  </p>
                ) : (
                  <Button onClick={deploy} loading={phase === "deploying"}>
                    Deploy covenant account
                  </Button>
                )}
              </div>
            </li>

            {/* Step 2 — fund */}
            <li
              className={styles.step}
              data-active={account && phase !== "funded" ? true : undefined}
              data-done={phase === "funded" ? true : undefined}
            >
              <span className={styles.stepNum}>2</span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>Fund it with HSK</h3>
                <p className={styles.stepText}>
                  Give the account native HSK for the agent to transact within its covenant.
                </p>
                {phase === "funded" ? (
                  <p className={styles.result}>
                    Funded {amount} HSK
                    {fundTx && (
                      <>
                        {" · "}
                        <TxLink hash={fundTx} />
                      </>
                    )}
                  </p>
                ) : (
                  <div className={styles.fundRow}>
                    <LabeledField label="Amount (HSK)">
                      <Input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        disabled={!account}
                      />
                    </LabeledField>
                    <Button onClick={fund} loading={phase === "funding"} disabled={!account}>
                      Fund account
                    </Button>
                  </div>
                )}
              </div>
            </li>

            {/* Step 3 — continue */}
            <li className={styles.step} data-active={phase === "funded" ? true : undefined}>
              <span className={styles.stepNum}>3</span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>Compile the covenant</h3>
                <p className={styles.stepText}>
                  Write your rules in plain English and set them on-chain.
                </p>
                <div className={styles.actions}>
                  <Button
                    disabled={!account}
                    onClick={() => account && router.push(`/app/${account}/editor`)}
                  >
                    Open the covenant editor
                  </Button>
                  {account && (
                    <Link href={`/app/${account}`} className={styles.secondaryLink}>
                      Skip to dashboard →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          </ol>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  )
}
