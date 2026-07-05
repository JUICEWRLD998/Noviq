"use client"

// Lightweight WebGL hero backdrop: soft violet light-fields drifting over a
// near-black tinted base. A fullscreen-triangle fragment shader — cheap, no
// geometry, no textures. Lazy-loaded (ssr:false) and only mounted when motion
// is allowed; the CSS `.mesh` pattern is the always-present fallback beneath it.

import { ScreenQuad } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import type { ShaderMaterial } from "three"

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uBg;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;

  // Soft radial glow around a moving point.
  float blob(vec2 uv, vec2 c, float r) {
    float d = length(uv - c);
    return smoothstep(r, 0.0, d);
  }

  void main() {
    vec2 uv = vUv;
    uv.x *= uAspect;
    float t = uTime * 0.06;

    vec2 p1 = vec2(0.28 * uAspect + sin(t * 1.1) * 0.10, 0.30 + cos(t * 0.9) * 0.08);
    vec2 p2 = vec2(0.78 * uAspect + cos(t * 0.7) * 0.09, 0.24 + sin(t * 1.3) * 0.07);
    vec2 p3 = vec2(0.55 * uAspect + sin(t * 0.5) * 0.12, 0.82 + cos(t * 0.6) * 0.09);

    vec3 col = uBg;
    col += uA * blob(uv, p1, 0.55) * 0.55;
    col += uB * blob(uv, p2, 0.48) * 0.42;
    col += uC * blob(uv, p3, 0.60) * 0.38;

    // Gentle vignette so edges settle into the base.
    float vig = smoothstep(1.15, 0.25, length(vUv - 0.5));
    col *= mix(0.82, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`

function Plasma() {
  const ref = useRef<ShaderMaterial>(null)
  const { viewport } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      // Tinted near-black base + three violet/indigo fields (linearised OKLCH-ish).
      uBg: { value: [0.05, 0.045, 0.075] },
      uA: { value: [0.42, 0.24, 0.85] },
      uB: { value: [0.3, 0.2, 0.7] },
      uC: { value: [0.24, 0.22, 0.6] },
    }),
    [],
  )

  useFrame((state) => {
    const mat = ref.current
    if (!mat) return
    const uTime = mat.uniforms.uTime
    const uAspect = mat.uniforms.uAspect
    if (uTime) uTime.value = state.clock.elapsedTime
    if (uAspect) uAspect.value = viewport.width / viewport.height
  })

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={ref}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  )
}

export default function WebGLBackdrop() {
  return (
    <Canvas
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Plasma />
    </Canvas>
  )
}
