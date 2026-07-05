// Postgres client + Drizzle instance, cached on globalThis.
//
// Next dev (HMR) and long-running tsx workers both re-evaluate modules; without
// a global cache each reload opens a new pool and exhausts Neon's connection
// limit. `prepare: false` is REQUIRED for the Neon pooled endpoint (PgBouncer
// transaction mode does not support prepared statements).

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

type Sql = ReturnType<typeof postgres>
type Db = ReturnType<typeof drizzle<typeof schema>>

const globalForDb = globalThis as unknown as { _noviqSql?: Sql; _noviqDb?: Db }

function sql(): Sql {
  if (!globalForDb._noviqSql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not set")
    globalForDb._noviqSql = postgres(url, { max: 1, prepare: false })
  }
  return globalForDb._noviqSql
}

/** The shared Drizzle database handle. Lazily connects on first use. */
export function getDb(): Db {
  if (!globalForDb._noviqDb) {
    globalForDb._noviqDb = drizzle(sql(), { schema })
  }
  return globalForDb._noviqDb
}
