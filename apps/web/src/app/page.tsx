import { Landing } from "@/components/marketing/Landing"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Noviq — Don't trust the agent. Trust the covenant.",
  description:
    "Programmable trust for autonomous AI money. Noviq compiles plain-English rules into an on-chain covenant that physically bounds an AI agent's wallet — every action checked, every violation reverted.",
}

export default function Home() {
  return <Landing />
}
