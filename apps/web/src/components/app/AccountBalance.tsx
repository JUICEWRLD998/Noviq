"use client"

import { BalancePill } from "@/components/chain"
import { hskTestnet } from "@noviq/sdk"
import { useBalance } from "wagmi"

/** Live native-HSK balance for an account address (refreshes periodically). */
export function AccountBalance({ address }: { address: `0x${string}` }) {
  const { data } = useBalance({
    address,
    chainId: hskTestnet.id,
    query: { refetchInterval: 10_000 },
  })
  return <BalancePill wei={data?.value ?? 0n} />
}
