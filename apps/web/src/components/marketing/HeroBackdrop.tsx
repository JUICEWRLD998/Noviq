"use client"

// Progressive-enhancement backdrop: the CSS `.mesh` + film grain always render;
// the WebGL plasma layers on top only when the client is mounted, WebGL is
// available, and the user has not requested reduced motion. Any WebGL error
// silently falls back to the CSS layer.

import { prefersReducedMotion } from "@noviq/design-tokens/motion"
import patterns from "@noviq/design-tokens/patterns.module.css"
import dynamic from "next/dynamic"
import { Component, type ReactNode, useEffect, useState } from "react"
import styles from "./landing.module.css"

const WebGLBackdrop = dynamic(() => import("./WebGLBackdrop"), { ssr: false })

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

export function HeroBackdrop() {
  const [enhance, setEnhance] = useState(false)

  useEffect(() => {
    if (!prefersReducedMotion() && webglAvailable()) setEnhance(true)
  }, [])

  return (
    <div className={`${styles.backdrop} ${patterns.mesh} ${patterns.filmGrain}`} aria-hidden="true">
      {enhance && (
        <div className={styles.webgl}>
          <WebGLBoundary>
            <WebGLBackdrop />
          </WebGLBoundary>
        </div>
      )}
    </div>
  )
}
