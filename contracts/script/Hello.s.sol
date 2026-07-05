// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Hello} from "../src/Hello.sol";

/// @notice Deploys the Phase-0 Hello contract to verify RPC + explorer.
/// Usage:
///   forge script script/Hello.s.sol:DeployHello \
///     --rpc-url hsk_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract DeployHello is Script {
    function run() external returns (Hello hello) {
        vm.startBroadcast();
        hello = new Hello("gm from Noviq on HSK");
        vm.stopBroadcast();

        console.log("Hello deployed at:", address(hello));
        console.log("Greeting:", hello.greeting());
    }
}
