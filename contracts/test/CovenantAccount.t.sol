// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {CovenantAccount} from "../src/CovenantAccount.sol";
import {CovenantAccountFactory} from "../src/CovenantAccountFactory.sol";
import {PolicyGuard} from "../src/PolicyGuard.sol";
import {IPolicyGuard} from "../src/interfaces/IPolicyGuard.sol";
import {
    AssetLimit, PolicyConfig, PolicyViolation, ReasonCode, ERC20_TRANSFER
} from "../src/libraries/PolicyTypes.sol";
import {MockERC20, MockTarget} from "./utils/Mocks.sol";

contract CovenantAccountTest is Test {
    PolicyGuard internal guard;
    CovenantAccount internal acct;
    MockERC20 internal token;

    address internal owner = makeAddr("owner");
    address internal agent = makeAddr("agent");
    address internal safe = makeAddr("safe"); // allowlisted recipient
    address internal attacker = makeAddr("attacker");

    address internal constant NATIVE = address(0);

    event Executed(
        address indexed target, uint256 value, bytes4 indexed selector, bool ownerOverride
    );
    event AgentRotated(address indexed previousAgent, address indexed newAgent);

    function setUp() public {
        guard = new PolicyGuard();
        acct = new CovenantAccount(owner, agent, IPolicyGuard(address(guard)));
        token = new MockERC20();
        vm.deal(address(acct), 100 ether);
        token.mint(address(acct), 100 ether);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _empty() internal pure returns (address[] memory a) {
        a = new address[](0);
    }

    function _emptySel() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](0);
    }

    /// @dev Owner installs a covenant: native + token, 5 ETH per-tx / 20 ETH daily.
    function _installBasePolicy(bool recipientAllowlist, uint256 largeThreshold, uint64 delay)
        internal
    {
        PolicyConfig memory c;
        c.active = true;
        c.windowDuration = 1 days;
        c.recipientAllowlistEnabled = recipientAllowlist;
        c.largeActionThreshold = largeThreshold;
        c.timelockDelay = delay;

        AssetLimit[] memory limits = new AssetLimit[](2);
        limits[0] = AssetLimit(NATIVE, 5 ether, 20 ether);
        limits[1] = AssetLimit(address(token), 5 ether, 20 ether);

        address[] memory recipients;
        if (recipientAllowlist) {
            recipients = new address[](1);
            recipients[0] = safe;
        } else {
            recipients = _empty();
        }

        vm.prank(owner);
        acct.setPolicy(c, limits, recipients, _emptySel(), _empty());
    }

    // ── construction / roles ───────────────────────────────────────────────────

    function test_Constructor_SetsRoles() public view {
        assertEq(acct.owner(), owner);
        assertEq(acct.agent(), agent);
        assertEq(address(acct.guard()), address(guard));
    }

    function test_Constructor_RejectsZeroAddresses() public {
        vm.expectRevert(CovenantAccount.ZeroAddress.selector);
        new CovenantAccount(address(0), agent, IPolicyGuard(address(guard)));
    }

    function test_SetPolicy_OnlyOwner() public {
        PolicyConfig memory c;
        AssetLimit[] memory limits = new AssetLimit[](0);
        vm.prank(agent);
        vm.expectRevert(CovenantAccount.NotOwner.selector);
        acct.setPolicy(c, limits, _empty(), _emptySel(), _empty());
    }

    // ── happy path: agent acts within the covenant ─────────────────────────────

    function test_Execute_NativeWithinPolicy() public {
        _installBasePolicy(false, 0, 0);
        uint256 before = safe.balance;

        vm.prank(agent);
        acct.execute(safe, 1 ether, "");

        assertEq(safe.balance, before + 1 ether);
    }

    function test_Execute_Erc20TransferWithinPolicy() public {
        _installBasePolicy(false, 0, 0);
        bytes memory data = abi.encodeWithSelector(ERC20_TRANSFER, safe, 2 ether);

        vm.prank(agent);
        acct.execute(address(token), 0, data);

        assertEq(token.balanceOf(safe), 2 ether);
        assertEq(token.balanceOf(address(acct)), 98 ether);
    }

    function test_Execute_EmitsExecuted() public {
        _installBasePolicy(false, 0, 0);
        vm.expectEmit(true, true, false, true, address(acct));
        emit Executed(safe, 1 ether, bytes4(0), false);
        vm.prank(agent);
        acct.execute(safe, 1 ether, "");
    }

    // ── the signature demo: agent is fooled, chain reverts ──────────────────────

    function test_Execute_InjectionBlockedByPerTxCap() public {
        _installBasePolicy(false, 0, 0);
        // "emergency! send everything" — 50 ETH exceeds the 5 ETH per-tx cap.
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(PolicyViolation.selector, ReasonCode.PerTxCapExceeded)
        );
        acct.execute(attacker, 50 ether, "");
        // funds untouched
        assertEq(attacker.balance, 0);
        assertEq(address(acct).balance, 100 ether);
    }

    function test_Execute_InjectionBlockedByRecipientAllowlist() public {
        _installBasePolicy(true, 0, 0); // only `safe` is allowlisted
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(PolicyViolation.selector, ReasonCode.RecipientNotAllowed)
        );
        acct.execute(attacker, 1 ether, "");
        assertEq(attacker.balance, 0);
    }

    // ── access control on the agent path ────────────────────────────────────────

    function test_Execute_OnlyAgent() public {
        _installBasePolicy(false, 0, 0);
        vm.prank(attacker);
        vm.expectRevert(CovenantAccount.NotAgent.selector);
        acct.execute(safe, 1 ether, "");
    }

    function test_Execute_RevertsWhenPaused() public {
        _installBasePolicy(false, 0, 0);
        vm.prank(owner);
        acct.pause();
        vm.prank(agent);
        vm.expectRevert(CovenantAccount.IsPaused.selector);
        acct.execute(safe, 1 ether, "");
    }

    function test_PauseUnpause_OnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert(CovenantAccount.NotOwner.selector);
        acct.pause();

        vm.prank(owner);
        acct.pause();
        assertTrue(acct.paused());
        vm.prank(owner);
        acct.unpause();
        assertFalse(acct.paused());
    }

    // ── owner override bypasses the covenant ─────────────────────────────────────

    function test_ExecuteAsOwner_BypassesGuard() public {
        _installBasePolicy(true, 0, 0); // recipient allowlist would block attacker
        uint256 before = attacker.balance;
        // Owner has ultimate authority and can move funds anywhere.
        vm.prank(owner);
        acct.executeAsOwner(attacker, 10 ether, "");
        assertEq(attacker.balance, before + 10 ether);
    }

    function test_ExecuteAsOwner_OnlyOwner() public {
        vm.prank(agent);
        vm.expectRevert(CovenantAccount.NotOwner.selector);
        acct.executeAsOwner(safe, 1 ether, "");
    }

    // ── agent key rotation ──────────────────────────────────────────────────────

    function test_RotateAgent() public {
        address newAgent = makeAddr("newAgent");
        _installBasePolicy(false, 0, 0);

        vm.expectEmit(true, true, false, false, address(acct));
        emit AgentRotated(agent, newAgent);
        vm.prank(owner);
        acct.rotateAgent(newAgent);
        assertEq(acct.agent(), newAgent);

        // old key is now powerless
        vm.prank(agent);
        vm.expectRevert(CovenantAccount.NotAgent.selector);
        acct.execute(safe, 1 ether, "");

        // new key works
        vm.prank(newAgent);
        acct.execute(safe, 1 ether, "");
        assertEq(safe.balance, 1 ether);
    }

    function test_RotateAgent_RejectsZero() public {
        vm.prank(owner);
        vm.expectRevert(CovenantAccount.ZeroAddress.selector);
        acct.rotateAgent(address(0));
    }

    // ── timelock for large actions ──────────────────────────────────────────────

    function test_LargeAction_BlockedUntilTimelockMatures() public {
        _installBasePolicy(false, 3 ether, 2 days);
        // 4 ETH is a "large action" (>= 3 ETH threshold) and needs the timelock.

        // Bump the per-tx cap so only the large-action gate is exercised.
        // (base per-tx cap is 5 ETH so 4 ETH is fine on that axis.)

        // Not queued → blocked.
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(PolicyViolation.selector, ReasonCode.LargeActionNotApproved)
        );
        acct.execute(safe, 4 ether, "");

        // Queue it, but the delay hasn't elapsed → still blocked.
        vm.prank(agent);
        acct.queueAction(safe, 4 ether, "");
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(PolicyViolation.selector, ReasonCode.LargeActionNotApproved)
        );
        acct.execute(safe, 4 ether, "");

        // Wait out the timelock → now it clears.
        vm.warp(block.timestamp + 2 days + 1);
        vm.prank(agent);
        acct.execute(safe, 4 ether, "");
        assertEq(safe.balance, 4 ether);

        // Approval was one-shot: the queue entry is consumed.
        bytes32 h = acct.hashAction(safe, 4 ether, "");
        assertEq(acct.queuedAt(h), 0);
    }

    function test_LargeAction_OwnerCoSignApprovesInstantly() public {
        _installBasePolicy(false, 3 ether, 2 days);
        bytes32 h = acct.hashAction(safe, 4 ether, "");

        vm.prank(owner);
        acct.approveAction(h);

        vm.prank(agent);
        acct.execute(safe, 4 ether, ""); // no waiting
        assertEq(safe.balance, 4 ether);

        // co-sign consumed
        assertFalse(acct.ownerApproved(h));
    }

    function test_ApproveAction_OnlyOwner() public {
        bytes32 h = acct.hashAction(safe, 4 ether, "");
        vm.prank(agent);
        vm.expectRevert(CovenantAccount.NotOwner.selector);
        acct.approveAction(h);
    }

    // ── failed downstream call surfaces cleanly ─────────────────────────────────

    function test_Execute_RevertsOnTargetFailure() public {
        MockTarget t = new MockTarget();
        // allow calls carrying native value to the target
        PolicyConfig memory c;
        c.active = true;
        c.windowDuration = 1 days;
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 5 ether, 20 ether);
        vm.prank(owner);
        acct.setPolicy(c, limits, _empty(), _emptySel(), _empty());

        bytes memory data = abi.encodeWithSignature("boom()");
        vm.prank(agent);
        vm.expectRevert(); // CallFailed(returndata)
        acct.execute(address(t), 0, data);
    }

    // ── receive() ────────────────────────────────────────────────────────────────

    function test_Receive_AcceptsNative() public {
        vm.deal(attacker, 1 ether);
        vm.prank(attacker);
        (bool ok,) = address(acct).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(acct).balance, 101 ether);
    }
}

contract CovenantAccountFactoryTest is Test {
    PolicyGuard internal guard;
    CovenantAccountFactory internal factory;

    address internal owner = makeAddr("owner");
    address internal agent = makeAddr("agent");

    event AccountCreated(address indexed account, address indexed owner, address indexed agent);

    function setUp() public {
        guard = new PolicyGuard();
        factory = new CovenantAccountFactory(IPolicyGuard(address(guard)));
    }

    function test_CreateAccount_DeploysAndIndexes() public {
        vm.expectEmit(false, true, true, false);
        emit AccountCreated(address(0), owner, agent);
        CovenantAccount acct = factory.createAccount(owner, agent);

        assertEq(acct.owner(), owner);
        assertEq(acct.agent(), agent);
        assertEq(address(acct.guard()), address(guard));

        assertEq(factory.accountsCount(), 1);
        assertEq(factory.allAccounts(0), address(acct));
        address[] memory mine = factory.accountsOf(owner);
        assertEq(mine.length, 1);
        assertEq(mine[0], address(acct));
    }

    function test_CreateAccount_MultiplePerOwner() public {
        factory.createAccount(owner, agent);
        factory.createAccount(owner, agent);
        assertEq(factory.accountsCount(), 2);
        assertEq(factory.accountsOf(owner).length, 2);
    }
}
