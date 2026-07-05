// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title PolicyTypes
/// @notice Shared types, reason codes, and errors for the Noviq covenant layer.
/// @dev A covenant is a compiled policy that physically bounds an agent's wallet.
///      Every guard decision resolves to a {ReasonCode}; `OK` means allowed and
///      any other value is surfaced via {PolicyViolation} on revert.

/// @notice Reason code for a single guard decision.
enum ReasonCode {
    OK, //                    0 allowed
    PolicyInactive, //        1 no active covenant for the account
    AssetNotAllowed, //       2 asset is not on the allowlist
    PerTxCapExceeded, //      3 amount exceeds the per-transaction cap
    DailyCapExceeded, //      4 amount would exceed the rolling window cap
    RecipientNotAllowed, //   5 recipient not on the KYC/allowlist
    SelectorNotAllowed, //    6 function selector not allowed
    TargetNotAllowed, //      7 call target not allowed
    LargeActionNotApproved // 8 amount >= threshold without timelock/co-sign
}

/// @notice Decoded financial semantics of an `execute(target,value,data)` call.
struct ActionInfo {
    address asset; // address(0) == native HSK
    uint256 amount; // in the asset's smallest unit
    address recipient; // effective recipient of value
    bytes4 selector; // 0x00000000 for a pure native transfer
}

/// @notice Scalar covenant parameters (arrays for allowlists are passed separately).
struct PolicyConfig {
    bool active;
    uint64 windowDuration; // rolling cap window, seconds (e.g. 1 days)
    uint256 largeActionThreshold; // amount (native-equiv units) requiring approval
    uint64 timelockDelay; // seconds a queued large action must mature
    bool recipientAllowlistEnabled;
    bool selectorAllowlistEnabled;
    bool targetAllowlistEnabled;
}

/// @notice Per-asset spending limits. `asset` == address(0) is native HSK.
struct AssetLimit {
    address asset;
    uint256 perTxCap;
    uint256 dailyCap;
}

/// @notice Rolling-window spend accounting for one (account, asset) pair.
struct SpendWindow {
    uint64 windowStart;
    uint256 spent;
}

/// @dev ERC-20 selectors the guard understands for recipient/amount extraction.
bytes4 constant ERC20_TRANSFER = 0xa9059cbb; // transfer(address,uint256)
bytes4 constant ERC20_APPROVE = 0x095ea7b3; // approve(address,uint256)
bytes4 constant ERC20_TRANSFER_FROM = 0x23b872dd; // transferFrom(address,address,uint256)

/// @notice Thrown by the guard when an action violates the covenant.
error PolicyViolation(ReasonCode code);
