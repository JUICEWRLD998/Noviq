"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface AuditReport {
  narration: string
  severity: "info" | "warn" | "critical"
  flags: string[]
  recommendSlash: boolean
}

interface AuditState {
  status: "idle" | "generating" | "done" | "error"
  report: AuditReport | null
  error: string | null
}

/**
 * Drive the auditor SSE endpoint. `run()` opens an EventSource, streams the
 * `status` / `report` / `done` / `error` events into state, and closes on
 * completion (so the browser does not auto-reconnect).
 */
export function useAuditStream(address: string) {
  const [state, setState] = useState<AuditState>({ status: "idle", report: null, error: null })
  const esRef = useRef<EventSource | null>(null)

  const run = useCallback(() => {
    esRef.current?.close()
    setState({ status: "generating", report: null, error: null })
    const es = new EventSource(`/api/covenants/${address}/audit`)
    esRef.current = es

    es.addEventListener("report", (e) => {
      try {
        const report = JSON.parse((e as MessageEvent).data) as AuditReport
        setState((s) => ({ ...s, report }))
      } catch {
        /* ignore malformed frame */
      }
    })
    es.addEventListener("done", () => {
      setState((s) => ({ ...s, status: "done" }))
      es.close()
    })
    es.addEventListener("error", (e) => {
      const data = (e as MessageEvent).data
      setState((s) =>
        s.status === "done"
          ? s
          : { ...s, status: "error", error: data ? String(data) : "Audit stream failed" },
      )
      es.close()
    })
  }, [address])

  useEffect(() => () => esRef.current?.close(), [])

  return { ...state, run }
}
