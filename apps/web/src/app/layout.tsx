import "@noviq/design-tokens/globals.css"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { Providers } from "./providers"

// Runs before first paint: applies a persisted light theme so there is no
// dark→light flash. Dark is the default (no data-theme attribute).
const themeInit = `(function(){try{if(localStorage.getItem("noviq-theme")==="light"){document.documentElement.dataset.theme="light"}}catch(e){}})()`

// Three font roles, exposed as the CSS vars tokens.css expects.
const display = Space_Grotesk({
  variable: "--font-display-src",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

const sans = Geist({
  variable: "--font-sans-src",
  subsets: ["latin"],
  display: "swap",
})

const mono = Geist_Mono({
  variable: "--font-mono-src",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Noviq — programmable trust for autonomous AI money",
  description: "Don't trust the agent. Trust the covenant.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: inline no-FOUC theme init */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
