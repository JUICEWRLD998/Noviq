/**
 * Motion tokens — JS/TS mirror of motion.css.
 *
 * Keep these values byte-for-byte identical to `motion.css` so CSS transitions,
 * Framer Motion, and GSAP animate with the same feel. This is the single source
 * consumed by JS animation libraries.
 */

/** Cubic-bezier control points as [x1, y1, x2, y2] — Framer Motion `ease`. */
export const easings = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuart: [0.25, 1, 0.5, 1],
  inOut: [0.65, 0, 0.35, 1],
  inQuart: [0.5, 0, 0.75, 0],
  spring: [0.34, 1.56, 0.64, 1],
} as const

export type EasingName = keyof typeof easings

/** Same easings as CSS `cubic-bezier(...)` strings — GSAP / raw CSS. */
export const cssEasings: Record<EasingName, string> = {
  outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  outQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  inQuart: "cubic-bezier(0.5, 0, 0.75, 0)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
}

/** Durations in milliseconds (Framer/GSAP want seconds — see `durationsSec`). */
export const durationsMs = {
  1: 120,
  2: 200,
  3: 320,
  4: 500,
  5: 800,
} as const

export type DurationStep = keyof typeof durationsMs

/** Durations in seconds — GSAP/Framer use seconds. */
export const durationsSec: Record<DurationStep, number> = {
  1: 0.12,
  2: 0.2,
  3: 0.32,
  4: 0.5,
  5: 0.8,
}

/** True when the user has requested reduced motion (browser only). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** A Framer Motion transition preset. Collapses to instant under reduced motion. */
export function transition(
  step: DurationStep = 3,
  ease: EasingName = "outExpo",
): { duration: number; ease: readonly number[] } {
  return {
    duration: prefersReducedMotion() ? 0 : durationsSec[step],
    ease: easings[ease],
  }
}
