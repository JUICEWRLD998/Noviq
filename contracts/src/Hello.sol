// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title Hello
/// @notice Minimal Phase-0 bring-up contract. Its only purpose is to prove the
///         full toolchain end-to-end: compile -> deploy to HSK testnet (chainId
///         133) -> confirm + verify on explorer.hsk.xyz. Not part of the
///         production protocol.
contract Hello {
    /// @notice Emitted whenever the greeting changes.
    event GreetingSet(address indexed by, string greeting);

    /// @notice The current greeting.
    string public greeting;

    /// @notice The account that deployed this contract.
    address public immutable deployer;

    constructor(string memory initialGreeting) {
        deployer = msg.sender;
        greeting = initialGreeting;
        emit GreetingSet(msg.sender, initialGreeting);
    }

    /// @notice Update the greeting.
    function setGreeting(string calldata newGreeting) external {
        greeting = newGreeting;
        emit GreetingSet(msg.sender, newGreeting);
    }
}
