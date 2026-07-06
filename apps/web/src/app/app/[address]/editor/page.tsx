"use client"

import { PolicySummary } from "@/components/app/PolicySummary"
import { ConnectButton, TxLink } from "@/components/chain"
import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import { CodeBlock } from "@/components/ui/CodeBlock"
import { Textarea } from "@/components/ui/Field"
import { useToast } from "@/components/ui/Toast"
import { hskTestnet } from "@noviq/sdk"
import { useRouter } from "next/navigation"
import { use, useState } from "react"
import type { Address, Hex } from "viem"
import { useAccount, usePublicClient, useSendTransaction } from "wagmi"
import styles from "./editor.module.css"

interface Prepared {
  policy: Record<string, unknown>
  clarifications: string[]
  calldata: Hex
  to: Address
  version: number
}

type Phase = "idle" | "compiling" | "prepared" | "setting" | "done"

const PLACEHOLDER =
  "e.g. Pay up to 1 HSK per transfer and 5 HSK per day, only to 0x3333333333333333333333333333333333333333. Block everything else."

export default function EditorPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params)
  const { isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { sendTransactionAsync } = useSendTransaction()
  const toast = useToast()
  const router = useRouter()

  const [covenant, setCovenant] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [setTx, setSetTx] = useState<Hex | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wrongChain = isConnected && chainId !== hskTestnet.id

  async function compile() {
    setError(null)
    setPhase("compiling")
    setPrepared(null)
    setSetTx(null)
    try {
      const res = await fetch(`/api/covenants/${address}/policy/prepare`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ covenant }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Compilation failed")
      setPrepared(data as Prepared)
      setPhase("prepared")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed")
      setPhase("idle")
    }
  }

  async function approve() {
    if (!prepared || !publicClient) return
    setError(null)
    setPhase("setting")
    try {
      const hash = await sendTransactionAsync({ to: prepared.to, data: prepared.calldata })
      setSetTx(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      await fetch(`/api/covenants/${address}/policy/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: prepared.version, setTx: hash }),
      })
      setPhase("done")
      toast({ title: "Covenant set on-chain", tone: "success" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set policy")
      setPhase("prepared")
    }
  }

  return (
    <>
      <PageHeader
        kicker="Covenant editor"
        title="Compile a covenant"
        description="Describe the rules in plain English. Gemini compiles them into a verifiable on-chain policy. Review it, then set it from your owner wallet."
      />

      <div className={styles.grid}>
        {/* Input */}
        <div className={styles.col}>
          <label className={styles.label} htmlFor="covenant">
            Plain-English covenant
          </label>
          <Textarea
            id="covenant"
            value={covenant}
            onChange={(e) => setCovenant(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={7}
          />
          <Button onClick={compile} loading={phase === "compiling"} disabled={!covenant.trim()}>
            Compile covenant
          </Button>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Output */}
        <div className={styles.col}>
          {!prepared ? (
            <div className={styles.emptyPreview}>
              <p>The compiled policy preview appears here.</p>
            </div>
          ) : (
            <div className={styles.preview}>
              {prepared.clarifications.length > 0 && (
                <div className={styles.clarify}>
                  <span className={styles.clarifyTag}>Needs your confirmation</span>
                  <ul>
                    {prepared.clarifications.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <PolicySummary policy={prepared.policy} version={prepared.version} />

              <CodeBlock
                label="Compiled policy (JSON)"
                code={JSON.stringify(prepared.policy, null, 2)}
                scroll
              />

              {phase === "done" ? (
                <div className={styles.done}>
                  <p className={styles.doneText}>Covenant is live on-chain.</p>
                  {setTx && <TxLink hash={setTx} />}
                  <Button onClick={() => router.push(`/app/${address}`)}>Go to dashboard</Button>
                </div>
              ) : !isConnected || wrongChain ? (
                <div className={styles.gate}>
                  <p>
                    {wrongChain
                      ? "Switch to HSK Chain testnet to set this covenant."
                      : "Connect your owner wallet to set this covenant on-chain."}
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <Button onClick={approve} loading={phase === "setting"}>
                  Approve &amp; set on-chain
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
