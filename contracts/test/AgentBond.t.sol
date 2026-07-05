// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentBond} from "../src/AgentBond.sol";
import {MockRoles} from "./utils/Mocks.sol";

contract AgentBondTest is Test {
    AgentBond internal bondContract;
    MockRoles internal account;

    uint64 internal constant WITHDRAW_DELAY = 7 days;

    address internal owner = makeAddr("owner");
    address internal agent = makeAddr("agent");
    address internal stranger = makeAddr("stranger");

    event Bonded(address indexed account, address indexed agent, uint256 amount, uint256 total);
    event Slashed(address indexed account, address indexed by, uint256 amount, string reason);
    event WithdrawRequested(address indexed account, uint64 unlockAt);
    event Withdrawn(address indexed account, address indexed to, uint256 amount);

    function setUp() public {
        bondContract = new AgentBond(WITHDRAW_DELAY);
        account = new MockRoles(owner, agent);
        vm.deal(agent, 100 ether);
    }

    function _acct() internal view returns (address) {
        return address(account);
    }

    // ── bonding ────────────────────────────────────────────────────────────────

    function test_Bond_ByAgentAccumulates() public {
        vm.expectEmit(true, true, false, true);
        emit Bonded(_acct(), agent, 5 ether, 5 ether);
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());

        vm.prank(agent);
        bondContract.bond{value: 3 ether}(_acct());

        (, uint256 amount,,) = bondContract.bonds(_acct());
        assertEq(amount, 8 ether);
        assertEq(address(bondContract).balance, 8 ether);
    }

    function test_Bond_RejectsNonAgent() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(AgentBond.NotBondedAgent.selector);
        bondContract.bond{value: 1 ether}(_acct());
    }

    function test_Bond_RejectsZeroValue() public {
        vm.prank(agent);
        vm.expectRevert(AgentBond.ZeroAmount.selector);
        bondContract.bond{value: 0}(_acct());
    }

    // ── slashing ────────────────────────────────────────────────────────────────

    function test_Slash_ByOwnerTransfersToOwner() public {
        vm.prank(agent);
        bondContract.bond{value: 10 ether}(_acct());

        uint256 ownerBefore = owner.balance;
        vm.expectEmit(true, true, false, true);
        emit Slashed(_acct(), owner, 4 ether, "off-mandate transfer");
        vm.prank(owner);
        bondContract.slash(_acct(), 4 ether, "off-mandate transfer");

        (, uint256 amount,,) = bondContract.bonds(_acct());
        assertEq(amount, 6 ether);
        assertEq(owner.balance, ownerBefore + 4 ether);
    }

    function test_Slash_OnlyOwner() public {
        vm.prank(agent);
        bondContract.bond{value: 10 ether}(_acct());
        vm.prank(stranger);
        vm.expectRevert(AgentBond.NotAccountOwner.selector);
        bondContract.slash(_acct(), 1 ether, "nope");
    }

    function test_Slash_RejectsAmountAboveBond() public {
        vm.prank(agent);
        bondContract.bond{value: 2 ether}(_acct());
        vm.prank(owner);
        vm.expectRevert(AgentBond.AmountExceedsBond.selector);
        bondContract.slash(_acct(), 3 ether, "too much");
    }

    function test_Slash_RejectsZero() public {
        vm.prank(agent);
        bondContract.bond{value: 2 ether}(_acct());
        vm.prank(owner);
        vm.expectRevert(AgentBond.ZeroAmount.selector);
        bondContract.slash(_acct(), 0, "zero");
    }

    // ── withdrawal lifecycle ─────────────────────────────────────────────────────

    function test_Withdraw_RequiresRequest() public {
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());
        vm.prank(agent);
        vm.expectRevert(AgentBond.WithdrawNotRequested.selector);
        bondContract.withdraw(_acct());
    }

    function test_Withdraw_BlockedWhileLocked() public {
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());

        vm.expectEmit(true, false, false, true);
        emit WithdrawRequested(_acct(), uint64(block.timestamp) + WITHDRAW_DELAY);
        vm.prank(agent);
        bondContract.requestWithdraw(_acct());

        vm.prank(agent);
        vm.expectRevert(AgentBond.StillLocked.selector);
        bondContract.withdraw(_acct());
    }

    function test_Withdraw_SucceedsAfterDelay() public {
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());
        vm.prank(agent);
        bondContract.requestWithdraw(_acct());

        vm.warp(block.timestamp + WITHDRAW_DELAY + 1);
        uint256 agentBefore = agent.balance;

        vm.expectEmit(true, true, false, true);
        emit Withdrawn(_acct(), agent, 5 ether);
        vm.prank(agent);
        bondContract.withdraw(_acct());

        assertEq(agent.balance, agentBefore + 5 ether);
        (, uint256 amount,,) = bondContract.bonds(_acct());
        assertEq(amount, 0);
    }

    function test_Withdraw_OnlyAgent() public {
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());
        vm.prank(agent);
        bondContract.requestWithdraw(_acct());
        vm.warp(block.timestamp + WITHDRAW_DELAY + 1);

        vm.prank(stranger);
        vm.expectRevert(AgentBond.NotBondedAgent.selector);
        bondContract.withdraw(_acct());
    }

    function test_RequestWithdraw_OnlyAgent() public {
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());
        vm.prank(stranger);
        vm.expectRevert(AgentBond.NotBondedAgent.selector);
        bondContract.requestWithdraw(_acct());
    }

    function test_TopUpCancelsPendingWithdrawal() public {
        vm.prank(agent);
        bondContract.bond{value: 5 ether}(_acct());
        vm.prank(agent);
        bondContract.requestWithdraw(_acct());

        // top-up resets the good-behavior clock
        vm.prank(agent);
        bondContract.bond{value: 1 ether}(_acct());

        (,, uint64 unlockAt, bool requested) = bondContract.bonds(_acct());
        assertEq(unlockAt, 0);
        assertFalse(requested);

        // withdrawing now must fail — the request was cancelled
        vm.warp(block.timestamp + WITHDRAW_DELAY + 1);
        vm.prank(agent);
        vm.expectRevert(AgentBond.WithdrawNotRequested.selector);
        bondContract.withdraw(_acct());
    }

    function testFuzz_SlashNeverExceedsBond(uint256 bonded, uint256 slashAmount) public {
        bonded = bound(bonded, 1, 100 ether);
        vm.deal(agent, bonded);
        vm.prank(agent);
        bondContract.bond{value: bonded}(_acct());

        slashAmount = bound(slashAmount, 1, bonded);
        vm.prank(owner);
        bondContract.slash(_acct(), slashAmount, "fuzz");
        (, uint256 remaining,,) = bondContract.bonds(_acct());
        assertEq(remaining, bonded - slashAmount);
    }
}
