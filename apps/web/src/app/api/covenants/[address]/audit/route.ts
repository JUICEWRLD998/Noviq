import { type AuditEvent, auditActions } from "@noviq/ai"
import { type Action, getAccountByAddress, insertAuditNote, listActions } from "@noviq/db"
import { errMessage } from "../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toEvent(a: Action): AuditEvent {
  return {
    at: a.createdAt.toISOString(),
    allowed: a.status === "allowed",
    ...(a.reasonLabel ? { reason: a.reasonLabel } : {}),
    ...(a.recipient ? { recipient: a.recipient } : {}),
    ...(a.amount ? { amount: `${a.amount} wei` } : {}),
    ...(a.reasoning ? { note: a.reasoning } : {}),
  }
}

/** Stream an auditor compliance report over recent actions (SSE). */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params
  const account = await getAccountByAddress(address)
  if (!account) return new Response("Account not found", { status: 404 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      const keepalive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keepalive\n\n"))
      }, 15_000)
      const finish = () => {
        if (closed) return
        closed = true
        clearInterval(keepalive)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      req.signal.addEventListener("abort", finish)

      try {
        send("status", { state: "generating" })
        const actions = await listActions(account.id, 25)
        if (actions.length === 0) {
          send("report", {
            narration: "No agent activity yet.",
            severity: "info",
            flags: [],
            recommendSlash: false,
          })
        } else {
          const report = await auditActions([...actions].reverse().map(toEvent))
          await insertAuditNote({
            accountId: account.id,
            narration: report.narration,
            severity: report.severity,
            flags: report.flags,
            recommendSlash: report.recommendSlash,
          })
          send("report", report)
        }
        send("done", { ok: true })
      } catch (err) {
        send("error", { error: errMessage(err) })
      } finally {
        finish()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
