"use client"

import { fadeUp, inView, staggerParent } from "@/lib/motion"
import { motion } from "framer-motion"
import type { ReactNode } from "react"

/** Fade-and-rise a block into view once, on scroll. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

/** Stagger a group of `RevealItem` children into view. */
export function RevealGroup({
  children,
  className,
  stagger = 0.1,
}: {
  children: ReactNode
  className?: string
  stagger?: number
}) {
  return (
    <motion.div
      className={className}
      variants={staggerParent(stagger)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  )
}
