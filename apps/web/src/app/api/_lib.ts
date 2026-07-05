// Shared helpers for API route handlers. (Underscore folder → not routable.)

/** Deep-convert bigints to strings so a value is safe for JSON responses. */
export function jsonSafe<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val)),
  )
}

export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
