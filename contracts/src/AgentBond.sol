// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Minimal view of a CovenantAccount used for authorization.
interface ICovenantRoles {
    function owner() external view returns (address);
    function agent() external view returns (address);
}

/// @title AgentBond
/// @notice An agent stakes a native-HSK bond against a covenant account. The
///         account owner (or auditor role) can slash it for off-mandate behavior;
///         the agent can withdraw after a good-behavior window. Aligns incentives
///         so a rogue/compromised agent has skin in the game.
contract AgentBond is ReentrancyGuard {
    struct Bond {
        address agent;
        uint256 amount;
        uint64 unlockAt;
        bool withdrawRequested;
    }

    /// @notice Good-behavior delay between a withdraw request and release.
    uint64 public immutable withdrawDelay;

    /// @notice account => bond position.
    mapping(address => Bond) public bonds;

    event Bonded(address indexed account, address indexed agent, uint256 amount, uint256 total);
    event Slashed(address indexed account, address indexed by, uint256 amount, string reason);
    event WithdrawRequested(address indexed account, uint64 unlockAt);
    event Withdrawn(address indexed account, address indexed to, uint256 amount);

    error NotAccountOwner();
    error NotBondedAgent();
    error AmountExceedsBond();
    error NothingBonded();
    error WithdrawNotRequested();
    error StillLocked();
    error TransferFailed();
    error ZeroAmount();

    constructor(uint64 withdrawDelay_) {
        withdrawDelay = withdrawDelay_;
    }

    /// @notice Stake (or top up) the bond for `account`. Caller must be its agent.
    function bond(address account) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (msg.sender != ICovenantRoles(account).agent()) revert NotBondedAgent();

        Bond storage b = bonds[account];
        b.agent = msg.sender;
        b.amount += msg.value;
        // Any top-up cancels a pending withdrawal (fresh good-behavior period).
        b.withdrawRequested = false;
        b.unlockAt = 0;

        emit Bonded(account, msg.sender, msg.value, b.amount);
    }

    /// @notice Slash part/all of the bond. Only the account owner may call.
    function slash(address account, uint256 amount, string calldata reason) external nonReentrant {
        if (msg.sender != ICovenantRoles(account).owner()) revert NotAccountOwner();
        Bond storage b = bonds[account];
        if (amount == 0) revert ZeroAmount();
        if (amount > b.amount) revert AmountExceedsBond();

        b.amount -= amount;
        emit Slashed(account, msg.sender, amount, reason);

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Begin the good-behavior window before withdrawal. Agent only.
    function requestWithdraw(address account) external {
        Bond storage b = bonds[account];
        if (msg.sender != b.agent) revert NotBondedAgent();
        if (b.amount == 0) revert NothingBonded();
        b.withdrawRequested = true;
        b.unlockAt = uint64(block.timestamp) + withdrawDelay;
        emit WithdrawRequested(account, b.unlockAt);
    }

    /// @notice Withdraw the bond after the good-behavior window elapses. Agent only.
    function withdraw(address account) external nonReentrant {
        Bond storage b = bonds[account];
        if (msg.sender != b.agent) revert NotBondedAgent();
        if (!b.withdrawRequested) revert WithdrawNotRequested();
        if (block.timestamp < b.unlockAt) revert StillLocked();
        uint256 amount = b.amount;
        if (amount == 0) revert NothingBonded();

        b.amount = 0;
        b.withdrawRequested = false;
        b.unlockAt = 0;
        emit Withdrawn(account, msg.sender, amount);

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
