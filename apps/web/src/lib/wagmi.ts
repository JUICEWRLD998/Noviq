// wagmi config — owner wallet connection for HSK Chain mainnet (chainId 177).
//
// Injected connector only (MetaMask / browser wallet); no WalletConnect, so no
// project ID is required. The backend relays the *agent* session key; owner
// actions (deploy account, setPolicy) are signed here in the browser.

import { hskChain } from "@noviq/sdk"
import { http, createConfig } from "wagmi"
import { injected } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [hskChain],
  connectors: [injected()],
  transports: {
    [hskChain.id]: http(process.env.NEXT_PUBLIC_HSK_RPC_URL),
  },
  ssr: true,
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
