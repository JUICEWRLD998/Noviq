"use client"

import { useEffect, useState } from "react"
import styles from "./styleguide.module.css"

type Theme = "dark" | "light"

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) ?? "dark"
    setTheme(current)
  }, [])

  function apply(next: Theme) {
    setTheme(next)
    if (next === "dark") {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = next
    }
  }

  return (
    <fieldset className={styles.toggle}>
      <legend className={styles.srOnly}>Theme</legend>
      <button
        type="button"
        className={styles.toggleBtn}
        data-active={theme === "dark"}
        onClick={() => apply("dark")}
      >
        Dark
      </button>
      <button
        type="button"
        className={styles.toggleBtn}
        data-active={theme === "light"}
        onClick={() => apply("light")}
      >
        Light
      </button>
    </fieldset>
  )
}
