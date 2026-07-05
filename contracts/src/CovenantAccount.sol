// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPolicyGuard} from "./interfaces/IPolicyGuard.sol";
import {AssetLimit, PolicyConfig} from "./libraries/PolicyTypes.sol";

/// @title CovenantAccount
/// @notice A self-contained smart-contract wallet bounded by an on-chain covenant.
///         Two roles: a human `owner` (EOA) and an `agent` (session key). The
///         agent may only move funds through {execute}, which is routed through
///         the {PolicyGuard} and reverts on any covenant violation. The owner can
///         pause, rotate the agent key, co-sign large actions, and override.
/// @dev No dependency on a hosted ERC-4337 bundler; the agent submits directly.
contract CovenantAccount is ReentrancyGuard {
    IPolicyGuard public immutable guard;

    address public owner;
    address public agent;
    bool public paused;

    /// @notice actionHash => timestamp the action was queued (0 = not queued).
    mapping(bytes32 => uint256) public queuedAt;
    /// @notice actionHash => owner co-signed (instant approval).
    mapping(bytes32 => bool) public ownerApproved;

    event Executed(address indexed target, uint256 value, bytes4 indexed selector, bool ownerOverride);
    event AgentRotated(address indexed previousAgent, address indexed newAgent);
    event PausedSet(bool paused);
    event ActionQueued(bytes32 indexed actionHash, uint256 maturesAt);
    event ActionApproved(bytes32 indexed actionHash);
    event PolicyUpdated(address indexed by);
    event Received(address indexed from, uint256 amount);

    error NotOwner();
    error NotAgent();
    error IsPaused();
    error ZeroAddress();
    error CallFailed(bytes returndata);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert IsPaused();
        _;
    }

    constructor(address owner_, address agent_, IPolicyGuard guard_) {
        if (owner_ == address(0) || agent_ == address(0) || address(guard_) == address(0)) {
            revert ZeroAddress();
        }
        owner = owner_;
        agent = agent_;
        guard = guard_;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // ── Agent path (covenant-enforced) ───────────────────────────────────────

    /// @notice Agent-initiated action. Routed through the guard; reverts on any
    ///         covenant violation (this is the on-chain safety net).
    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyAgent
        whenNotPaused
        nonReentrant
        returns (bytes memory)
    {
        bytes32 h = hashAction(target, value, data);
        bool approved = _isApproved(h);

        // Reverts with PolicyViolation(reason) if the covenant is violated.
        guard.checkAndRecord(target, value, data, approved);

        // One-shot: consume any queue entry / co-sign for this action.
        if (queuedAt[h] != 0) delete queuedAt[h];
        if (ownerApproved[h]) delete ownerApproved[h];

        return _call(target, value, data, false);
    }

    /// @notice Queue a (large) action to start its timelock. Owner or agent.
    function queueAction(address target, uint256 value, bytes calldata data) external returns (bytes32 h) {
        if (msg.sender != owner && msg.sender != agent) revert NotAgent();
        h = hashAction(target, value, data);
        queuedAt[h] = block.timestamp;
        emit ActionQueued(h, block.timestamp + guard.timelockDelay(address(this)));
    }

    /// @notice Owner co-signs a specific action, approving it instantly.
    function approveAction(bytes32 actionHash) external onlyOwner {
        ownerApproved[actionHash] = true;
        emit ActionApproved(actionHash);
    }

    // ── Owner path (override + admin) ────────────────────────────────────────

    /// @notice Owner override: execute bypassing the guard. Human ultimate authority.
    function executeAsOwner(address target, uint256 value, bytes calldata data)
        external
        onlyOwner
        nonReentrant
        returns (bytes memory)
    {
        return _call(target, value, data, true);
    }

    /// @notice Compile/replace this account's covenant (forwarded to the guard).
    function setPolicy(
        PolicyConfig calldata config,
        AssetLimit[] calldata limits,
        address[] calldata recipients,
        bytes4[] calldata selectors,
        address[] calldata targets
    ) external onlyOwner {
        guard.setPolicy(config, limits, recipients, selectors, targets);
        emit PolicyUpdated(msg.sender);
    }

    function pause() external onlyOwner {
        paused = true;
        emit PausedSet(true);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit PausedSet(false);
    }

    function rotateAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        emit AgentRotated(agent, newAgent);
        agent = newAgent;
    }

    // ── Views / helpers ──────────────────────────────────────────────────────

    /// @notice Deterministic id for an action intent (no nonce; approvals are one-shot).
    function hashAction(address target, uint256 value, bytes calldata data) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data));
    }

    function _isApproved(bytes32 h) internal view returns (bool) {
        if (ownerApproved[h]) return true;
        uint256 queued = queuedAt[h];
        if (queued == 0) return false;
        return block.timestamp >= queued + guard.timelockDelay(address(this));
    }

    function _call(address target, uint256 value, bytes calldata data, bool ownerOverride)
        internal
        returns (bytes memory)
    {
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        if (!ok) revert CallFailed(ret);
        bytes4 selector = data.length >= 4 ? bytes4(data[:4]) : bytes4(0);
        emit Executed(target, value, selector, ownerOverride);
        return ret;
    }
}
