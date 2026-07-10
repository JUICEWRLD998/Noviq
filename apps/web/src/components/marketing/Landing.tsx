"use client"

import { buttonClassName } from "@/components/ui/Button"
import { shorten } from "@/lib/format"
import { HSK_MAINNET, noviqAddresses } from "@noviq/sdk"
import Link from "next/link"
import { AttackBeat } from "./AttackBeat"
import { HeroBackdrop } from "./HeroBackdrop"
import { Reveal, RevealGroup, RevealItem } from "./Reveal"
import styles from "./landing.module.css"

const addrs = noviqAddresses(HSK_MAINNET.chainId)

const STEPS = [
  {
    n: "01",
    title: "Write the covenant",
    body: "Describe the rules in plain English — caps per transfer, daily limits, who can be paid, what can be called.",
  },
  {
    n: "02",
    title: "Compile to on-chain policy",
    body: "Gemini translates it into a verifiable policy contract. You review the compiled rules, then set them on-chain.",
  },
  {
    n: "03",
    title: "Every action is checked",
    body: "The agent transacts through its covenant. Anything outside the rules reverts on-chain — before value ever moves.",
  },
]

const FEATURES = [
  {
    title: "Deterministic enforcement",
    body: "Safety can’t live in a model — a model can always be fooled. Noviq enforces limits in the contract, so the outcome is the same no matter what the agent believes.",
  },
  {
    title: "Compliance-grade audit trail",
    body: "A second AI narrates every move into an attributable, timestamped log. Export it as CSV or JSON for review.",
  },
  {
    title: "Allowlisted recipients",
    body: "ERC-3643-style KYC whitelisting: funds can only reach counterparties you’ve approved. Everything else reverts.",
  },
  {
    title: "Agent bonds & slashing",
    body: "Agents stake a bond. Off-mandate patterns are flagged and slashable, withdrawable only after a good-behaviour window.",
  },
]

const CONTRACTS = [
  { label: "PolicyGuard", address: addrs.policyGuard },
  { label: "CovenantAccountFactory", address: addrs.covenantAccountFactory },
  { label: "AgentBond", address: addrs.agentBond },
]

const EXPLORER = process.env.NEXT_PUBLIC_HSK_EXPLORER_URL ?? "https://explorer.hsk.xyz"

export function Landing() {
  return (
    <div className={styles.page}>
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          Noviq
        </Link>
        <div className={styles.navLinks}>
          <a href="#how" className={styles.navLink}>
            How it works
          </a>
          <Link href="/app" className={buttonClassName("accent", "sm")}>
            Launch app
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <HeroBackdrop />
        <div className={styles.heroInner}>
          <Reveal>
            <span className={styles.kicker}>Programmable trust for autonomous AI money</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className={styles.heroTitle}>
              Don’t trust the agent.
              <br />
              <span className={styles.heroAccent}>Trust the covenant.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className={styles.heroLede}>
              Give an AI a wallet and a single sentence can drain it. Noviq compiles your
              plain-English rules into an on-chain covenant that physically bounds what the agent
              can do — every action checked, every violation reverted.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className={styles.heroActions}>
              <Link href="/app" className={buttonClassName("accent", "lg")}>
                Launch app
              </Link>
              <a href="#beat" className={buttonClassName("outline", "lg")}>
                See it get blocked
              </a>
            </div>
          </Reveal>
        </div>
        <div className={styles.scrollCue} aria-hidden="true">
          <span>Scroll</span>
          <span className={styles.scrollCueLine} />
        </div>
      </header>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section className={styles.problem}>
        <Reveal>
          <p className={styles.problemStatement}>
            The AI agent economy is arriving fast. But an autonomous wallet is a{" "}
            <span className={styles.problemHi}>prompt injection away</span> from catastrophe —
            hallucinated transfers, rogue instructions, drained treasuries.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className={styles.problemSub}>
            The fix isn’t a smarter model. It’s enforcement that lives where value does: on-chain.
          </p>
        </Reveal>
      </section>

      {/* ── The attack beat (pinned showpiece) ───────────────────────────── */}
      <div id="beat">
        <AttackBeat />
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className={styles.how} id="how">
        <Reveal>
          <span className={styles.sectionKicker}>How it works</span>
          <h2 className={styles.sectionTitle}>Three steps from intent to enforcement.</h2>
        </Reveal>
        <RevealGroup className={styles.steps}>
          {STEPS.map((s) => (
            <RevealItem key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── Trust rail / features ────────────────────────────────────────── */}
      <section className={styles.features}>
        <Reveal>
          <span className={styles.sectionKicker}>The trust rail for agentic finance</span>
          <h2 className={styles.sectionTitle}>Stripe-grade rails, compliance-native.</h2>
        </Reveal>
        <RevealGroup className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <RevealItem key={f.title} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureBody}>{f.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── CTA + footer ─────────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <Reveal>
          <h2 className={styles.ctaTitle}>Give your agent a wallet it can’t misuse.</h2>
          <div className={styles.ctaActions}>
            <Link href="/app" className={buttonClassName("accent", "lg")}>
              Launch app
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.wordmark}>Noviq</span>
          <p className={styles.footerTag}>Don’t trust the agent. Trust the covenant.</p>
        </div>
        <div className={styles.footerContracts}>
          <span className={styles.footerContractsLabel}>Deployed on HSK Chain Mainnet</span>
          {CONTRACTS.map((c) => (
            <a
              key={c.label}
              className={styles.footerContract}
              href={`${EXPLORER}/address/${c.address}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>{c.label}</span>
              <span className={styles.footerMono}>{shorten(c.address, 8, 6)}</span>
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
