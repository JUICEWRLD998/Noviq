import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// Load secrets from the repo-root .env (drizzle-kit runs with cwd = packages/db).
config({ path: "../../.env" })

// DDL must run against the DIRECT (non-pooled) Neon endpoint — the PgBouncer
// pooler rejects the prepared statements drizzle-kit uses. Fall back to the
// pooled URL only if the unpooled one isn't configured.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL) to run drizzle-kit")

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
})
