// Framer Motion presets built from the shared design-token motion values, so
// component animation matches CSS transitions and GSAP tweens exactly.
//
// Import token values (byte-identical to motion.css) rather than hardcoding.

import { durationsSec, easings } from "@noviq/design-tokens/motion"
import type { Transition, Variants } from "framer-motion"

/** Cubic-bezier tuple as Framer Motion expects it. */
type Bezier = [number, number, number, number]

export const easeOut: Bezier = easings.outExpo as unknown as Bezier
export const easeSpring: Bezier = easings.spring as unknown as Bezier

export const tBase: Transition = { duration: durationsSec[3], ease: easeOut }
export const tSlow: Transition = { duration: durationsSec[4], ease: easeOut }

/** Fade + rise in. Pair with `whileInView` for scroll reveals. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: tBase },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tBase },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: tBase },
}

/** Parent that staggers children using the `fadeUp`/`fadeIn` item variants. */
export const staggerParent = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

/** Springy press feedback for interactive controls. */
export const springTap = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 22 } as Transition,
}

/** Standard in-view trigger config: play once, when 30% visible. */
export const inView = { once: true, amount: 0.3 } as const
