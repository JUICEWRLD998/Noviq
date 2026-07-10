// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PolicyGuard} from "../src/PolicyGuard.sol";
import {CovenantAccountFactory} from "../src/CovenantAccountFactory.sol";
import {AgentBond} from "../src/AgentBond.sol";
import {IPolicyGuard} from "../src/interfaces/IPolicyGuard.sol";

/// @notice Deploys Noviq protocol contracts to HSK Chain Mainnet
/// Usage:
///   forge script script/DeployMainnet.s.sol:DeployMainnet \
///     --rpc-url hsk_mainnet --broadcast --verify
contract DeployMainnet is Script {
    function run() external {
        vm.startBroadcast();

        console.log("Deploying to HSK Chain Mainnet (chainId 177)");
        console.log("Deployer address:", msg.sender);

        // 1. Deploy PolicyGuard
        PolicyGuard guard = new PolicyGuard();
        console.log("\n1. PolicyGuard deployed at:", address(guard));

        // 2. Deploy CovenantAccountFactory with the guard (needs IPolicyGuard interface)
        CovenantAccountFactory factory = new CovenantAccountFactory(IPolicyGuard(address(guard)));
        console.log("2. CovenantAccountFactory deployed at:", address(factory));

        // 3. Deploy AgentBond (needs withdrawDelay parameter - 7 days)
        uint64 withdrawDelay = 7 days;
        AgentBond bond = new AgentBond(withdrawDelay);
        console.log("3. AgentBond deployed at:", address(bond));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Copy these addresses to packages/sdk/src/addresses.ts:");
        console.log("");
        console.log("export const NOVIQ_ADDRESSES: Record<number, ProtocolAddresses> = {");
        console.log("  [HSK_MAINNET.chainId]: {");
        console.log('    policyGuard: "%s",', address(guard));
        console.log('    covenantAccountFactory: "%s",', address(factory));
        console.log('    agentBond: "%s",', address(bond));
        console.log("  },");
        console.log("};");
    }
}
