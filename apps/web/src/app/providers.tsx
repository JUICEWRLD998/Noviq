"use client"

// Client provider stack: wagmi (wallet) → React Query (data) → Radix Toast.
// Mounted once in the root layout so every route can read wallet state, run
// queries, and raise toasts.

import { makeQueryClient } from "@/lib/query"
import { wagmiConfig } from "@/lib/wagmi"
import * as Toast from "@radix-ui/react-toast"
import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { WagmiProvider } from "wagmi"

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (stable across re-renders).
  const [queryClient] = useState(makeQueryClient)

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Toast.Provider swipeDirection="right">
          {children}
          <Toast.Viewport className="toastViewport" />
        </Toast.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
