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

const privateKey = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex key")

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HSK_RPC_URL: z.string().url(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
  // Direct (non-pooled) Neon endpoint for drizzle-kit DDL.
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  // Scoped agent session key held by the relayer (worker + attack console).
  AGENT_PRIVATE_KEY: privateKey.optional(),
  AGENT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
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

/**
 * Assert that the given optional server-env keys are actually set, returning a
 * narrowed record with those keys required. Use in the worker/indexer/scripts,
 * which need secrets the lazy schema treats as optional for the web app.
 */
export function requireServer<K extends keyof ServerEnv>(
  keys: readonly K[],
): { [P in K]-?: NonNullable<ServerEnv[P]> } {
  const env = serverEnv()
  const missing = keys.filter((k) => env[k] === undefined || env[k] === "")
  if (missing.length > 0) {
    throw new Error(`Missing required environment: ${missing.join(", ")}`)
  }
  return env as unknown as { [P in K]-?: NonNullable<ServerEnv[P]> }
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
