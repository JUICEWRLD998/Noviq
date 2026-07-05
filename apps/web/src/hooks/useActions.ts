"use client"

import { useQuery } from "@tanstack/react-query"

/** Action row as returned by the API (bigints serialised to strings). */
export interface ActionRow {
  id: string
  kind: "agent" | "attack" | "owner"
  status: "proposed" | "allowed" | "blocked"
  reasoning: string | null
  target: string | null
  value: string | null
  data: string | null
  asset: string | null
  recipient: string | null
  amount: string | null
  reasonCode: number | null
  reasonLabel: string | null
  actionHash: string | null
  txHash: string | null
  block: string | null
  createdAt: string
}

async function fetchActions(address: string, limit: number): Promise<ActionRow[]> {
  const res = await fetch(`/api/covenants/${address}/actions?limit=${limit}`)
  if (!res.ok) throw new Error(`Failed to load actions (${res.status})`)
  const data = (await res.json()) as { actions: ActionRow[] }
  return data.actions
}

/** Poll the account's recent actions for the live activity feed. */
export function useActions(address: string, limit = 50, pollMs = 5000) {
  return useQuery({
    queryKey: ["actions", address, limit],
    queryFn: () => fetchActions(address, limit),
    refetchInterval: pollMs,
  })
}
