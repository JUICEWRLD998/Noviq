// OpenRouter model routing for the three Noviq AI roles.
// IDs are verified live before wiring (implementation.md §10); Gemini 2.5 Pro for
// the reasoning-heavy Compiler/Auditor, Flash for the fast, cheap Agent loop.

export const MODELS = {
  /** NL covenant → validated policy JSON. Accuracy over latency. */
  compiler: "google/gemini-2.5-pro",
  /** On-chain events → compliance narration + anomaly flags. */
  auditor: "google/gemini-2.5-pro",
  /** Goal-pursuing agent loop. Fast + cheap; intentionally naive. */
  agent: "google/gemini-2.5-flash",
} as const

export type ModelRole = keyof typeof MODELS
