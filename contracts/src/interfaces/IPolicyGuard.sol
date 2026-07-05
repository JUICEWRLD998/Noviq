// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ActionInfo, AssetLimit, PolicyConfig, ReasonCode, SpendWindow} from "../libraries/PolicyTypes.sol";

/// @title IPolicyGuard
/// @notice On-chain covenant registry + enforcer. A {CovenantAccount} routes
///         every agent action through {checkAndRecord}, which reverts on any
///         violation. Policies are keyed by the calling account (msg.sender).
interface IPolicyGuard {
    /// @notice Emitted when an account (re)compiles its covenant on-chain.
    event PolicySet(address indexed account, uint256 assetCount, uint256 recipientCount);

    /// @notice Emitted for every allowed action (the on-chain audit trail).
    event ActionAllowed(address indexed account, address indexed asset, address indexed recipient, uint256 amount);

    /// @notice Compile/replace the covenant for `msg.sender` (a CovenantAccount).
    function setPolicy(
        PolicyConfig calldata config,
        AssetLimit[] calldata limits,
        address[] calldata recipients,
        bytes4[] calldata selectors,
        address[] calldata targets
    ) external;

    /// @notice Enforce the covenant for `msg.sender` and record spend on success.
    /// @param approved Whether a large action has satisfied timelock/co-sign
    ///        (the calling account is trusted for its own approval state).
    /// @dev Reverts with {PolicyViolation} carrying the failing {ReasonCode}.
    function checkAndRecord(address target, uint256 value, bytes calldata data, bool approved) external;

    /// @notice Dry-run the covenant for `account` without mutating state.
    function simulate(address account, address target, uint256 value, bytes calldata data)
        external
        view
        returns (bool allowed, ReasonCode code);

    /// @notice Decode an action's financial semantics (asset/amount/recipient/selector).
    function decodeAction(address target, uint256 value, bytes calldata data) external pure returns (ActionInfo memory);

    // ── Views for the account + UI ─────────────────────────────────────────
    function isActive(address account) external view returns (bool);
    function timelockDelay(address account) external view returns (uint64);
    function largeActionThreshold(address account) external view returns (uint256);
    function getConfig(address account) external view returns (PolicyConfig memory);
    function getAssetLimit(address account, address asset)
        external
        view
        returns (bool allowed, uint256 perTxCap, uint256 dailyCap);
    function getSpendWindow(address account, address asset) external view returns (SpendWindow memory);
    function isRecipientAllowed(address account, address recipient) external view returns (bool);
}
