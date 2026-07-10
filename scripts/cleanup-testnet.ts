#!/usr/bin/env tsx
/**
 * Clean up testnet data from database
 * Removes all covenant accounts with chainId 133 (testnet) and related data
 * 
 * Usage:
 *   pnpm tsx scripts/cleanup-testnet.ts
 */

import { db } from "@noviq/db"
import { covenantAccounts } from "@noviq/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  console.log("🧹 Cleaning up testnet data (chainId 133)...\n")

  try {
    // Get count of testnet covenants before deletion
    const testnetAccounts = await db
      .select()
      .from(covenantAccounts)
      .where(eq(covenantAccounts.chainId, 133))

    if (testnetAccounts.length === 0) {
      console.log("✅ No testnet covenants found. Database is clean!")
      return
    }

    console.log(`Found ${testnetAccounts.length} testnet covenant(s):`)
    testnetAccounts.forEach((acc) => {
      console.log(`  - ${acc.address} (owner: ${acc.ownerAddress})`)
    })

    console.log("\n⚠️  Deleting testnet covenants and all related data...")
    console.log("   (policies, agents, actions, audit notes, bonds will be cascade deleted)")

    // Delete testnet covenant accounts
    // CASCADE delete will automatically remove:
    // - policies
    // - agents  
    // - actions
    // - audit_notes
    // - bonds (if they reference the account)
    const result = await db
      .delete(covenantAccounts)
      .where(eq(covenantAccounts.chainId, 133))

    console.log(`\n✅ Deleted ${testnetAccounts.length} testnet covenant account(s)`)
    console.log("✅ All related data (policies, agents, actions, etc.) cascade deleted")
    console.log("\n🎉 Database cleaned! Only mainnet (chainId 177) covenants remain.\n")

  } catch (error) {
    console.error("\n❌ Error cleaning database:", error)
    process.exit(1)
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Cleanup failed:", err)
    process.exit(1)
  }
)
