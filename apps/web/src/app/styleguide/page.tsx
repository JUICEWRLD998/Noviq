import patterns from "@noviq/design-tokens/patterns.module.css"
import type { Metadata } from "next"
import type { CSSProperties } from "react"
import { ComponentsShowcase } from "./ComponentsShowcase"
import { ThemeToggle } from "./ThemeToggle"
import styles from "./styleguide.module.css"

export const metadata: Metadata = {
  title: "Noviq — Styleguide",
  description: "Design-token + pattern reference.",
}

/** A CSS custom property reference used inline to render token swatches. */
type Var = `var(${string})`
const v = (name: string): Var => `var(${name})` as Var

const NEUTRALS = [
  "--neutral-990",
  "--neutral-950",
  "--neutral-900",
  "--neutral-850",
  "--neutral-800",
  "--neutral-700",
  "--neutral-600",
  "--neutral-500",
  "--neutral-400",
  "--neutral-300",
  "--neutral-200",
  "--neutral-100",
  "--neutral-50",
]
const VIOLETS = [
  "--violet-200",
  "--violet-300",
  "--violet-400",
  "--violet-500",
  "--violet-600",
  "--violet-700",
]
const REDS = ["--red-300", "--red-400", "--red-500", "--red-600"]
const GREENS = ["--green-300", "--green-400", "--green-500", "--green-600"]
const AMBERS = ["--amber-400", "--amber-500"]

const SURFACES = ["--surface-0", "--surface-1", "--surface-2", "--surface-3", "--surface-inset"]
const TEXTS = ["--text-primary", "--text-secondary", "--text-muted", "--text-faint"]

const TYPE_STEPS = [
  { token: "--fs-step-6", label: "Step 6 — display hero" },
  { token: "--fs-step-5", label: "Step 5" },
  { token: "--fs-step-4", label: "Step 4" },
  { token: "--fs-step-3", label: "Step 3" },
  { token: "--fs-step-2", label: "Step 2" },
  { token: "--fs-step-1", label: "Step 1" },
  { token: "--fs-step-0", label: "Step 0 — body" },
  { token: "--fs-step--1", label: "Step -1 — caption" },
]

const SPACES = [
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--space-7",
  "--space-8",
]
const RADII = [
  "--radius-xs",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
  "--radius-2xl",
]
const SHADOWS = ["--shadow-1", "--shadow-2", "--shadow-3", "--shadow-4"]

const EASINGS = [
  { token: "--ease-out-expo", label: "out-expo" },
  { token: "--ease-out-quart", label: "out-quart" },
  { token: "--ease-in-out", label: "in-out" },
  { token: "--ease-spring", label: "spring" },
]
const DURATIONS = ["--dur-1", "--dur-2", "--dur-3", "--dur-4", "--dur-5"]

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <p className={styles.sectionNote}>{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Ramp({ tokens }: { tokens: string[] }) {
  return (
    <div className={styles.ramp}>
      {tokens.map((t) => (
        <div key={t} className={styles.swatch}>
          <div className={styles.swatchChip} style={{ background: v(t) }} />
          <code className={styles.swatchLabel}>{t}</code>
        </div>
      ))}
    </div>
  )
}

export default function Styleguide() {
  return (
    <div className={styles.page}>
      <div className={`${patterns.mesh} ${patterns.filmGrain}`} aria-hidden="true" />

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Noviq · Design System</p>
          <h1 className={styles.h1}>Styleguide</h1>
          <p className={styles.lede}>
            Every token and surface pattern, dark-first and OKLCH. Toggle the theme to verify the
            semantic layer.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <Section
          id="primitives-color"
          title="Color — primitives"
          note="Tier 1. Never consumed by components directly."
        >
          <h3 className={styles.h3}>Neutrals (hue 265 — tinted, no pure black/white)</h3>
          <Ramp tokens={NEUTRALS} />
          <h3 className={styles.h3}>Accent — electric violet (hue 285)</h3>
          <Ramp tokens={VIOLETS} />
          <h3 className={styles.h3}>Danger / Success / Warning</h3>
          <Ramp tokens={[...REDS, ...GREENS, ...AMBERS]} />
        </Section>

        <Section
          id="semantic-color"
          title="Color — semantic roles"
          note="Tier 2. Dark-first; overridden under [data-theme=light]."
        >
          <h3 className={styles.h3}>Surfaces</h3>
          <Ramp tokens={SURFACES} />
          <h3 className={styles.h3}>Text on surface</h3>
          <div className={styles.textStack}>
            {TEXTS.map((t) => (
              <p key={t} style={{ color: v(t) }} className={styles.textSample}>
                <code>{t}</code> — The malicious transfer reverts on-chain.
              </p>
            ))}
          </div>
        </Section>

        <Section
          id="type"
          title="Typography"
          note="Three roles + fluid clamp() scale. Resize the window to see it fluidly respond."
        >
          <div className={styles.fontRoles}>
            <div>
              <span className={styles.fontTag}>display</span>
              <p className={styles.fontDisplay}>Noviq 0123456789</p>
            </div>
            <div>
              <span className={styles.fontTag}>sans</span>
              <p className={styles.fontSans}>The quick brown fox jumps.</p>
            </div>
            <div>
              <span className={styles.fontTag}>mono</span>
              <p className={styles.fontMono}>0x84848A21…4fAE · 1,250.00 HSK</p>
            </div>
          </div>
          <div className={styles.typeScale}>
            {TYPE_STEPS.map((s) => (
              <div key={s.token} className={styles.typeRow}>
                <span style={{ fontSize: v(s.token) }} className={styles.typeSample}>
                  Trust the covenant
                </span>
                <code className={styles.typeMeta}>{s.label}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section id="spacing" title="Spacing" note="4px base, 8px rhythm.">
          <div className={styles.spaceStack}>
            {SPACES.map((s) => (
              <div key={s} className={styles.spaceRow}>
                <div className={styles.spaceBar} style={{ inlineSize: v(s) }} />
                <code>{s}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section id="radii" title="Radii">
          <div className={styles.tileRow}>
            {RADII.map((r) => (
              <div key={r} className={styles.radiusTile} style={{ borderRadius: v(r) }}>
                <code>{r}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section id="shadows" title="Elevation / shadows">
          <div className={styles.tileRow}>
            {SHADOWS.map((s) => (
              <div key={s} className={styles.shadowTile} style={{ boxShadow: v(s) }}>
                <code>{s}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="motion"
          title="Motion"
          note="Easings + durations shared by CSS, Framer & GSAP. Hover a tile."
        >
          <h3 className={styles.h3}>Easings</h3>
          <div className={styles.tileRow}>
            {EASINGS.map((e) => (
              <div
                key={e.token}
                className={styles.easeTile}
                style={{ "--demo-ease": v(e.token) } as CSSProperties}
              >
                <span className={styles.easeDot} />
                <code>{e.label}</code>
              </div>
            ))}
          </div>
          <h3 className={styles.h3}>Durations</h3>
          <div className={styles.tileRow}>
            {DURATIONS.map((d) => (
              <div
                key={d}
                className={styles.durTile}
                style={{ "--demo-dur": v(d) } as CSSProperties}
              >
                <span className={styles.durBar} />
                <code>{d}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="patterns"
          title="Surface patterns"
          note="Glass, edge-light ring, film grain, animated mesh (this page's background)."
        >
          <div className={styles.patternRow}>
            <div className={`${styles.patternCard} ${patterns.glassCard} ${patterns.edgeLight}`}>
              <h3 className={styles.h3}>Glass card + edge-light</h3>
              <p className={styles.muted}>
                Backdrop blur, translucent tinted fill, and a 1px gradient stroke.
              </p>
            </div>
            <div className={`${styles.patternCard} ${patterns.filmGrain}`}>
              <h3 className={styles.h3}>Film grain</h3>
              <p className={styles.muted}>Low-opacity SVG noise overlay, on this tile.</p>
            </div>
          </div>
        </Section>

        <Section
          id="components"
          title="Component tokens"
          note="Tier 3. Buttons, input, code block, badges."
        >
          <div className={styles.componentRow}>
            <button type="button" className={styles.btnAccent}>
              Approve covenant
            </button>
            <button type="button" className={styles.btnGhost}>
              Cancel
            </button>
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>Allowed</span>
            <span className={`${styles.badge} ${styles.badgeDanger}`}>Blocked</span>
          </div>
          <input className={styles.input} placeholder="Send at most 100 USDC per day…" />
          <pre className={styles.code}>
            <code>{`{
  "perTxCap": "100 USDC",
  "dailyCap": "500 USDC",
  "allowlist": ["0x84848…4fAE"]
}`}</code>
          </pre>
        </Section>

        <Section
          id="component-library"
          title="Component library"
          note="The reusable kit consumed by every screen — live, not token swatches."
        >
          <ComponentsShowcase />
        </Section>
      </main>
    </div>
  )
}
