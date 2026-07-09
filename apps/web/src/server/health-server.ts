// Simple HTTP health check server for Render free tier keep-alive.
// Runs on PORT (provided by Render) and responds to ping requests.
// This prevents the service from sleeping after 15 minutes of inactivity.

import { createServer } from "node:http"

const PORT = process.env.PORT || 10000

let workerAlive = false
let indexerAlive = false

// Track that workers are running
export function markWorkerAlive() {
  workerAlive = true
}

export function markIndexerAlive() {
  indexerAlive = true
}

// Create HTTP server
const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`)

  // Health check endpoint
  if (url.pathname === "/health" || url.pathname === "/") {
    const status = {
      status: "ok",
      timestamp: new Date().toISOString(),
      workers: {
        indexer: indexerAlive ? "running" : "starting",
        worker: workerAlive ? "running" : "starting",
      },
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(status, null, 2))
    return
  }

  // Not found
  res.writeHead(404)
  res.end("Not Found")
})

// Start server
export function startHealthServer() {
  server.listen(PORT, () => {
    console.log(`[health-server] Listening on port ${PORT}`)
    console.log(`[health-server] Health check: http://localhost:${PORT}/health`)
  })
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[health-server] Shutting down...")
  server.close(() => {
    console.log("[health-server] Server closed")
    process.exit(0)
  })
})
