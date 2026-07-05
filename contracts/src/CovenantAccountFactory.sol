// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CovenantAccount} from "./CovenantAccount.sol";
import {IPolicyGuard} from "./interfaces/IPolicyGuard.sol";

/// @title CovenantAccountFactory
/// @notice Deploys {CovenantAccount}s wired to a shared {PolicyGuard} and indexes
///         them by owner. Used by onboarding to spin up a covenant wallet.
contract CovenantAccountFactory {
    IPolicyGuard public immutable guard;

    address[] public allAccounts;
    mapping(address => address[]) private _accountsOf;

    event AccountCreated(address indexed account, address indexed owner, address indexed agent);

    constructor(IPolicyGuard guard_) {
        guard = guard_;
    }

    /// @notice Deploy a new covenant wallet owned by `owner_` with session key `agent_`.
    function createAccount(address owner_, address agent_) external returns (CovenantAccount acct) {
        acct = new CovenantAccount(owner_, agent_, guard);
        allAccounts.push(address(acct));
        _accountsOf[owner_].push(address(acct));
        emit AccountCreated(address(acct), owner_, agent_);
    }

    function accountsCount() external view returns (uint256) {
        return allAccounts.length;
    }

    function accountsOf(address owner_) external view returns (address[] memory) {
        return _accountsOf[owner_];
    }
}
