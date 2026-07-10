#!/usr/bin/env node
/**
 * Direct deployment script for HSK Chain Mainnet (chainId 177)
 * Bypasses Foundry's chain validation by using viem directly
 * 
 * Usage:
 *   node deploy-mainnet.mjs
 * 
 * Requires:
 *   - .env file with HSK_RPC_URL and DEPLOYER_PRIVATE_KEY
 *   - Compiled contract artifacts in out/ directory (run: forge build)
 */

import { createWalletClient, createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from current directory
config({ path: join(__dirname, '.env') });

// HSK Chain Mainnet
const hskMainnet = {
  id: 177,
  name: 'HSK Chain Mainnet',
  nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.HSK_RPC_URL || 'https://mainnet.hsk.xyz'] },
  },
  blockExplorers: {
    default: { name: 'HSK Explorer', url: 'https://explorer.hsk.xyz' },
  },
};

// Load contract artifacts
function loadArtifact(contractName) {
  const path = join(__dirname, 'out', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(readFileSync(path, 'utf-8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
  };
}

// Setup clients
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

// Ensure private key has 0x prefix
const formattedPrivateKey = privateKey?.startsWith('0x') ? privateKey : `0x${privateKey}`;

if (!formattedPrivateKey || formattedPrivateKey === '0x' || formattedPrivateKey.length !== 66) {
  console.error('❌ Error: DEPLOYER_PRIVATE_KEY is missing or invalid in .env file');
  console.error('   Expected: 64 hex characters (with or without 0x prefix)');
  console.error('   Got:', privateKey || 'undefined');
  process.exit(1);
}

const account = privateKeyToAccount(formattedPrivateKey);
const publicClient = createPublicClient({
  chain: hskMainnet,
  transport: http(),
});
const walletClient = createWalletClient({
  account,
  chain: hskMainnet,
  transport: http(),
});

console.log('🚀 Deploying Noviq Protocol to HSK Chain Mainnet (chainId 177)\n');
console.log('Deployer address:', account.address);

// Check balance
const balance = await publicClient.getBalance({ address: account.address });
console.log('Deployer balance:', formatEther(balance), 'HSK\n');

if (balance === 0n) {
  console.error('❌ Error: Deployer has 0 HSK balance. Please fund the address first.');
  process.exit(1);
}

// Deploy PolicyGuard
console.log('1️⃣  Deploying PolicyGuard...');
const policyGuardArtifact = loadArtifact('PolicyGuard');
const policyGuardHash = await walletClient.deployContract({
  abi: policyGuardArtifact.abi,
  bytecode: policyGuardArtifact.bytecode,
});
console.log('   Transaction hash:', policyGuardHash);
const policyGuardReceipt = await publicClient.waitForTransactionReceipt({ hash: policyGuardHash });
const policyGuardAddress = policyGuardReceipt.contractAddress;
console.log('   ✅ PolicyGuard deployed at:', policyGuardAddress);
console.log('   Gas used:', policyGuardReceipt.gasUsed.toString(), '\n');

// Deploy CovenantAccountFactory (needs PolicyGuard address as constructor arg)
console.log('2️⃣  Deploying CovenantAccountFactory...');
const factoryArtifact = loadArtifact('CovenantAccountFactory');
const factoryHash = await walletClient.deployContract({
  abi: factoryArtifact.abi,
  bytecode: factoryArtifact.bytecode,
  args: [policyGuardAddress], // IPolicyGuard address
});
console.log('   Transaction hash:', factoryHash);
const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
const factoryAddress = factoryReceipt.contractAddress;
console.log('   ✅ CovenantAccountFactory deployed at:', factoryAddress);
console.log('   Gas used:', factoryReceipt.gasUsed.toString(), '\n');

// Deploy AgentBond (needs withdrawDelay parameter - 7 days in seconds)
console.log('3️⃣  Deploying AgentBond...');
const bondArtifact = loadArtifact('AgentBond');
const withdrawDelay = 7n * 24n * 60n * 60n; // 7 days in seconds
const bondHash = await walletClient.deployContract({
  abi: bondArtifact.abi,
  bytecode: bondArtifact.bytecode,
  args: [withdrawDelay],
});
console.log('   Transaction hash:', bondHash);
const bondReceipt = await publicClient.waitForTransactionReceipt({ hash: bondHash });
const bondAddress = bondReceipt.contractAddress;
console.log('   ✅ AgentBond deployed at:', bondAddress);
console.log('   Gas used:', bondReceipt.gasUsed.toString(), '\n');

// Summary
console.log('═══════════════════════════════════════════════════════════');
console.log('🎉 Deployment Complete!\n');
console.log('Contract Addresses:');
console.log('-----------------------------------------------------------');
console.log('PolicyGuard:              ', policyGuardAddress);
console.log('CovenantAccountFactory:   ', factoryAddress);
console.log('AgentBond:                ', bondAddress);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Next Steps:\n');
console.log('1. Update packages/sdk/src/addresses.ts with these addresses:');
console.log(`
export const NOVIQ_ADDRESSES: Record<number, ProtocolAddresses> = {
  [HSK_MAINNET.chainId]: {
    policyGuard: "${policyGuardAddress}",
    covenantAccountFactory: "${factoryAddress}",
    agentBond: "${bondAddress}",
  },
};
`);

console.log('\n2. Verify contracts on HSK Explorer:');
console.log(`   https://explorer.hsk.xyz/address/${policyGuardAddress}`);
console.log(`   https://explorer.hsk.xyz/address/${factoryAddress}`);
console.log(`   https://explorer.hsk.xyz/address/${bondAddress}`);

console.log('\n3. Create deployment record:');
console.log(`
{
  "chainId": 177,
  "chain": "hsk-mainnet",
  "deployedAt": "${new Date().toISOString()}",
  "deployer": "${account.address}",
  "contracts": {
    "PolicyGuard": "${policyGuardAddress}",
    "CovenantAccountFactory": "${factoryAddress}",
    "AgentBond": "${bondAddress}"
  },
  "transactions": {
    "PolicyGuard": "${policyGuardHash}",
    "CovenantAccountFactory": "${factoryHash}",
    "AgentBond": "${bondHash}"
  }
}
`);

console.log('\n✅ All done! Your contracts are live on HSK Chain Mainnet.\n');
