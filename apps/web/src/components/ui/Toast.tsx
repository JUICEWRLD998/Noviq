"use client"

// Toast system: a context + `useToast()` hook over Radix Toast primitives.
// Mounted once via <ToastProvider> in the app providers.

import * as ToastPrimitive from "@radix-ui/react-toast"
import { type ReactNode, createContext, useCallback, useContext, useRef, useState } from "react"
import styles from "./Toast.module.css"

type ToastTone = "neutral" | "success" | "danger"

interface ToastItem {
  id: number
  title: string
  description?: ReactNode
  tone: ToastTone
}

interface ToastInput {
  title: string
  description?: ReactNode
  tone?: ToastTone
}

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const toast = useCallback((t: ToastInput) => {
    counter.current += 1
    const id = counter.current
    setItems((prev) => [...prev, { id, tone: "neutral", ...t }])
  }, [])

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={`${styles.toast} ${styles[t.tone]}`}
            onOpenChange={(open) => {
              if (!open) remove(t.id)
            }}
          >
            <ToastPrimitive.Title className={styles.title}>{t.title}</ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className={styles.desc}>
                {t.description}
              </ToastPrimitive.Description>
            )}
            <ToastPrimitive.Close className={styles.close} aria-label="Dismiss">
              ✕
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className={styles.viewport} />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx.toast
}
