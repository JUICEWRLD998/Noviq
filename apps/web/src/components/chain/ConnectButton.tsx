"use client"

import { Button } from "@/components/ui/Button"
import { shorten } from "@/lib/format"
import { hskTestnet } from "@noviq/sdk"
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import styles from "./connect.module.css"

/**
 * Owner wallet connect (injected). Three states: disconnected → connect,
 * wrong network → switch, connected → address + disconnect.
 */
export function ConnectButton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()

  const injected = connectors[0]

  if (!isConnected) {
    return (
      <Button
        size={size}
        loading={isPending}
        onClick={() => injected && connect({ connector: injected })}
      >
        Connect wallet
      </Button>
    )
  }

  if (chainId !== hskTestnet.id) {
    return (
      <Button
        size={size}
        variant="danger"
        loading={switching}
        onClick={() => switchChain({ chainId: hskTestnet.id })}
      >
        Switch to HSK Testnet
      </Button>
    )
  }

  return (
    <span className={styles.connected}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.addr} title={address}>
        {address ? shorten(address) : ""}
      </span>
      <button type="button" className={styles.disconnect} onClick={() => disconnect()}>
        Disconnect
      </button>
    </span>
  )
}
