import type { CSSProperties } from "react"
import styles from "./Skeleton.module.css"

interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
}

/** Shimmer placeholder for loading states (respects reduced-motion). */
export function Skeleton({ width, height = "1rem", radius, className }: SkeletonProps) {
  const style: CSSProperties = {
    width: width ?? "100%",
    height,
    ...(radius ? { borderRadius: radius } : {}),
  }
  return <span className={[styles.skeleton, className].filter(Boolean).join(" ")} style={style} />
}
