"use client"

// Client provider stack: wagmi (wallet) → React Query (data) → Radix Toast.
// Mounted once in the root layout so every route can read wallet state, run
// queries, and raise toasts.

import { ToastProvider } from "@/components/ui/Toast"
import { makeQueryClient } from "@/lib/query"
import { wagmiConfig } from "@/lib/wagmi"
import { QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "framer-motion"
import { useState } from "react"
import { WagmiProvider } from "wagmi"

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (stable across re-renders).
  const [queryClient] = useState(makeQueryClient)

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* `reducedMotion="user"` makes every Framer `motion.*` honor the OS
            prefers-reduced-motion setting — transforms are dropped, opacity
            kept — mirroring the CSS reset in design-tokens/motion.css. */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
