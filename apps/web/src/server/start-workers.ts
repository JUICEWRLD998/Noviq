// Wrapper script to run both indexer and worker with health check server.
// This is used by Render to keep the service alive on free tier.
//
//   pnpm --filter @noviq/web start-workers

import { startHealthServer } from "./health-server"

// Start health check server first
startHealthServer()

// Import and start workers (they will run their main loops)
Promise.all([
  import("./indexer.ts").then((m) => {
    console.log("[start-workers] Indexer starting...")
  }),
  import("./worker.ts").then((m) => {
    console.log("[start-workers] Worker starting...")
  }),
]).catch((err) => {
  console.error("[start-workers] Failed to start workers:", err)
  process.exit(1)
})

console.log("[start-workers] All services started")
