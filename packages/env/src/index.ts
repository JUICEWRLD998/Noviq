import { z } from "zod"

/**
 * Validated environment for Noviq.
 *
 * - `serverEnv()` reads secrets + server-only config (throws if invalid/missing).
 * - `clientEnv()` reads only `NEXT_PUBLIC_*` values safe to ship to the browser.
 *
 * Both are lazy so importing this package never eagerly throws in contexts
 * (tests, tooling) that don't need every variable.
 */

const chainId = z.coerce.number().int().positive()

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HSK_RPC_URL: z.string().url(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
})

const clientSchema = z.object({
  NEXT_PUBLIC_HSK_RPC_URL: z.string().url(),
  NEXT_PUBLIC_HSK_EXPLORER_URL: z.string().url(),
  NEXT_PUBLIC_HSK_CHAIN_ID: chainId,
})

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>

let cachedServer: ServerEnv | undefined
let cachedClient: ClientEnv | undefined

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")
}

export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid server environment:\n${format(parsed.error)}`)
  }
  cachedServer = parsed.data
  return cachedServer
}

export function clientEnv(): ClientEnv {
  if (cachedClient) return cachedClient
  // NEXT_PUBLIC_* vars are inlined by Next at build time, so reference them
  // explicitly rather than spreading process.env.
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_HSK_RPC_URL: process.env.NEXT_PUBLIC_HSK_RPC_URL,
    NEXT_PUBLIC_HSK_EXPLORER_URL: process.env.NEXT_PUBLIC_HSK_EXPLORER_URL,
    NEXT_PUBLIC_HSK_CHAIN_ID: process.env.NEXT_PUBLIC_HSK_CHAIN_ID,
  })
  if (!parsed.success) {
    throw new Error(`Invalid client environment:\n${format(parsed.error)}`)
  }
  cachedClient = parsed.data
  return cachedClient
}

/** Static HSK Chain testnet facts (chainId 133). */
export const HSK_TESTNET = {
  chainId: 133,
  name: "HSK Chain Testnet",
  rpcUrl: "https://testnet.hsk.xyz",
  // NOTE: explorer.hsk.xyz is MAINNET; the testnet Blockscout is testnet-explorer.hsk.xyz.
  explorerUrl: "https://testnet-explorer.hsk.xyz",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
} as const
