// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PolicyGuard} from "../src/PolicyGuard.sol";
import {
    ActionInfo,
    AssetLimit,
    ERC20_APPROVE,
    ERC20_TRANSFER,
    ERC20_TRANSFER_FROM,
    PolicyConfig,
    PolicyViolation,
    ReasonCode,
    SpendWindow
} from "../src/libraries/PolicyTypes.sol";

/// @dev The test contract itself plays the role of a CovenantAccount: it calls
///      setPolicy / checkAndRecord directly, so the guard keys everything on
///      address(this). This isolates the pure covenant logic from the wallet.
contract PolicyGuardTest is Test {
    PolicyGuard internal guard;

    address internal constant NATIVE = address(0);
    address internal token;
    address internal alice = address(0xA11CE);
    address internal mallory = address(0xBAD);

    event PolicySet(address indexed account, uint256 assetCount, uint256 recipientCount);
    event ActionAllowed(
        address indexed account, address indexed asset, address indexed recipient, uint256 amount
    );

    function setUp() public {
        guard = new PolicyGuard();
        token = address(0x7000);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _cfg() internal pure returns (PolicyConfig memory c) {
        c.active = true;
        c.windowDuration = 1 days;
    }

    function _emptyAddrs() internal pure returns (address[] memory a) {
        a = new address[](0);
    }

    function _emptySelectors() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](0);
    }

    /// @dev Baseline: native + token allowed, generous caps, no allowlists.
    function _setBasePolicy() internal {
        AssetLimit[] memory limits = new AssetLimit[](2);
        limits[0] = AssetLimit(NATIVE, 100 ether, 1000 ether);
        limits[1] = AssetLimit(token, 100 ether, 1000 ether);
        guard.setPolicy(_cfg(), limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());
    }

    // ── setPolicy / registry ───────────────────────────────────────────────────

    function test_SetPolicy_EmitsAndStores() public {
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 5 ether, 10 ether);
        address[] memory recipients = new address[](1);
        recipients[0] = alice;

        vm.expectEmit(true, false, false, true);
        emit PolicySet(address(this), 1, 1);
        guard.setPolicy(_cfg(), limits, recipients, _emptySelectors(), _emptyAddrs());

        assertTrue(guard.isActive(address(this)));
        (bool allowed, uint256 perTx, uint256 daily) = guard.getAssetLimit(address(this), NATIVE);
        assertTrue(allowed);
        assertEq(perTx, 5 ether);
        assertEq(daily, 10 ether);
        assertTrue(guard.isRecipientAllowed(address(this), alice));
    }

    function test_SetPolicy_ReplaceClearsPreviousVersion() public {
        // v1 allows the token.
        AssetLimit[] memory v1 = new AssetLimit[](1);
        v1[0] = AssetLimit(token, 1 ether, 1 ether);
        guard.setPolicy(_cfg(), v1, _emptyAddrs(), _emptySelectors(), _emptyAddrs());
        (bool allowed1,,) = guard.getAssetLimit(address(this), token);
        assertTrue(allowed1);

        // v2 only allows native — the token must be cleared.
        AssetLimit[] memory v2 = new AssetLimit[](1);
        v2[0] = AssetLimit(NATIVE, 1 ether, 1 ether);
        guard.setPolicy(_cfg(), v2, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        (bool allowed2,,) = guard.getAssetLimit(address(this), token);
        assertFalse(allowed2, "stale asset survived re-set");
        (bool nativeAllowed,,) = guard.getAssetLimit(address(this), NATIVE);
        assertTrue(nativeAllowed);
    }

    function test_SetPolicy_DoesNotResetSpendWindow() public {
        _setBasePolicy();
        // spend 40 native
        guard.checkAndRecord(alice, 40 ether, "", false);
        SpendWindow memory before = guard.getSpendWindow(address(this), NATIVE);
        assertEq(before.spent, 40 ether);

        // re-set policy; in-flight window must survive so it can't be bypassed.
        _setBasePolicy();
        SpendWindow memory afterReset = guard.getSpendWindow(address(this), NATIVE);
        assertEq(afterReset.spent, 40 ether, "re-set wiped the rolling window");
    }

    // ── enforcement: reason codes ──────────────────────────────────────────────

    function test_Allow_NativeInBounds_RecordsAndEmits() public {
        _setBasePolicy();
        vm.expectEmit(true, true, true, true);
        emit ActionAllowed(address(this), NATIVE, alice, 1 ether);
        guard.checkAndRecord(alice, 1 ether, "", false);

        SpendWindow memory w = guard.getSpendWindow(address(this), NATIVE);
        assertEq(w.spent, 1 ether);
    }

    function test_Revert_PolicyInactive() public {
        // no policy set at all
        _expect(ReasonCode.PolicyInactive);
        guard.checkAndRecord(alice, 1 ether, "", false);
    }

    function test_Revert_PolicyInactive_WhenFlagFalse() public {
        PolicyConfig memory c = _cfg();
        c.active = false;
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 100 ether, 100 ether);
        guard.setPolicy(c, limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        _expect(ReasonCode.PolicyInactive);
        guard.checkAndRecord(alice, 1 ether, "", false);
    }

    function test_Revert_AssetNotAllowed() public {
        // only native allowed; a token transfer targets an unlisted asset.
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 100 ether, 100 ether);
        guard.setPolicy(_cfg(), limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        bytes memory data = abi.encodeWithSelector(ERC20_TRANSFER, alice, 1 ether);
        _expect(ReasonCode.AssetNotAllowed);
        guard.checkAndRecord(token, 0, data, false);
    }

    function test_Revert_PerTxCapExceeded() public {
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 5 ether, 1000 ether);
        guard.setPolicy(_cfg(), limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        _expect(ReasonCode.PerTxCapExceeded);
        guard.checkAndRecord(alice, 5 ether + 1, "", false);
    }

    function test_Revert_DailyCapExceeded_ThenResetsAfterWindow() public {
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 100 ether, 150 ether);
        guard.setPolicy(_cfg(), limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        guard.checkAndRecord(alice, 100 ether, "", false); // spent = 100
        _expect(ReasonCode.DailyCapExceeded);
        guard.checkAndRecord(alice, 100 ether, "", false); // 100 + 100 > 150

        // advance past the rolling window → spend budget refreshes.
        vm.warp(block.timestamp + 1 days + 1);
        guard.checkAndRecord(alice, 100 ether, "", false); // allowed again
        SpendWindow memory w = guard.getSpendWindow(address(this), NATIVE);
        assertEq(w.spent, 100 ether, "window did not reset");
    }

    function test_Revert_RecipientNotAllowed() public {
        PolicyConfig memory c = _cfg();
        c.recipientAllowlistEnabled = true;
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 100 ether, 100 ether);
        address[] memory recipients = new address[](1);
        recipients[0] = alice;
        guard.setPolicy(c, limits, recipients, _emptySelectors(), _emptyAddrs());

        guard.checkAndRecord(alice, 1 ether, "", false); // allowlisted → ok
        _expect(ReasonCode.RecipientNotAllowed);
        guard.checkAndRecord(mallory, 1 ether, "", false); // the attacker
    }

    function test_Revert_SelectorNotAllowed_ButNativeTransferPasses() public {
        PolicyConfig memory c = _cfg();
        c.selectorAllowlistEnabled = true;
        AssetLimit[] memory limits = new AssetLimit[](2);
        limits[0] = AssetLimit(NATIVE, 100 ether, 100 ether);
        limits[1] = AssetLimit(token, 100 ether, 100 ether);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = ERC20_TRANSFER;
        guard.setPolicy(c, limits, _emptyAddrs(), selectors, _emptyAddrs());

        // approve() is not on the selector allowlist.
        bytes memory badData = abi.encodeWithSelector(ERC20_APPROVE, alice, 1 ether);
        _expect(ReasonCode.SelectorNotAllowed);
        guard.checkAndRecord(token, 0, badData, false);

        // transfer() is allowlisted → ok.
        bytes memory okData = abi.encodeWithSelector(ERC20_TRANSFER, alice, 1 ether);
        guard.checkAndRecord(token, 0, okData, false);

        // a pure native transfer (selector 0) is exempt from the selector gate.
        guard.checkAndRecord(alice, 1 ether, "", false);
    }

    function test_Revert_TargetNotAllowed() public {
        PolicyConfig memory c = _cfg();
        c.targetAllowlistEnabled = true;
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 100 ether, 100 ether);
        address[] memory targets = new address[](1);
        targets[0] = alice;
        guard.setPolicy(c, limits, _emptyAddrs(), _emptySelectors(), targets);

        guard.checkAndRecord(alice, 1 ether, "", false); // allowlisted target
        _expect(ReasonCode.TargetNotAllowed);
        guard.checkAndRecord(mallory, 1 ether, "", false);
    }

    function test_Revert_LargeActionNotApproved_PassesWhenApproved() public {
        PolicyConfig memory c = _cfg();
        c.largeActionThreshold = 50 ether;
        c.timelockDelay = 1 days;
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, 100 ether, 1000 ether);
        guard.setPolicy(c, limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        // below threshold: fine without approval
        guard.checkAndRecord(alice, 49 ether, "", false);

        // at/above threshold without approval: blocked
        _expect(ReasonCode.LargeActionNotApproved);
        guard.checkAndRecord(alice, 50 ether, "", false);

        // with approval flag: allowed
        guard.checkAndRecord(alice, 50 ether, "", true);
    }

    // ── simulate (view, no state change) ────────────────────────────────────────

    function test_Simulate_MatchesEvaluation_NoStateChange() public {
        _setBasePolicy();
        (bool okAllowed, ReasonCode okCode) =
            guard.simulate(address(this), alice, 1 ether, "");
        assertTrue(okAllowed);
        assertEq(uint256(okCode), uint256(ReasonCode.OK));

        (bool badAllowed, ReasonCode badCode) =
            guard.simulate(address(this), alice, 101 ether, "");
        assertFalse(badAllowed);
        assertEq(uint256(badCode), uint256(ReasonCode.PerTxCapExceeded));

        // simulate must not have recorded any spend.
        SpendWindow memory w = guard.getSpendWindow(address(this), NATIVE);
        assertEq(w.spent, 0);
    }

    // ── decodeAction ───────────────────────────────────────────────────────────

    function test_Decode_NativeTransfer() public view {
        ActionInfo memory info = guard.decodeAction(alice, 3 ether, "");
        assertEq(info.asset, NATIVE);
        assertEq(info.amount, 3 ether);
        assertEq(info.recipient, alice);
        assertEq(info.selector, bytes4(0));
    }

    function test_Decode_Erc20Transfer() public view {
        bytes memory data = abi.encodeWithSelector(ERC20_TRANSFER, alice, 7 ether);
        ActionInfo memory info = guard.decodeAction(token, 0, data);
        assertEq(info.asset, token);
        assertEq(info.amount, 7 ether);
        assertEq(info.recipient, alice);
        assertEq(info.selector, ERC20_TRANSFER);
    }

    function test_Decode_Erc20Approve() public view {
        bytes memory data = abi.encodeWithSelector(ERC20_APPROVE, mallory, 9 ether);
        ActionInfo memory info = guard.decodeAction(token, 0, data);
        assertEq(info.asset, token);
        assertEq(info.amount, 9 ether);
        assertEq(info.recipient, mallory); // spender is the effective recipient
        assertEq(info.selector, ERC20_APPROVE);
    }

    function test_Decode_Erc20TransferFrom() public view {
        bytes memory data = abi.encodeWithSelector(ERC20_TRANSFER_FROM, alice, mallory, 4 ether);
        ActionInfo memory info = guard.decodeAction(token, 0, data);
        assertEq(info.asset, token);
        assertEq(info.amount, 4 ether);
        assertEq(info.recipient, mallory); // the `to` param
        assertEq(info.selector, ERC20_TRANSFER_FROM);
    }

    function test_Decode_ArbitraryCall() public view {
        bytes memory data = abi.encodeWithSignature("ping()");
        ActionInfo memory info = guard.decodeAction(alice, 2 ether, data);
        assertEq(info.asset, NATIVE); // native value spend
        assertEq(info.amount, 2 ether);
        assertEq(info.recipient, alice); // the contract being called
        assertEq(info.selector, bytes4(keccak256("ping()")));
    }

    // ── fuzz: per-tx cap boundary is exact ──────────────────────────────────────

    function testFuzz_PerTxCapBoundary(uint256 cap, uint256 amount) public {
        cap = bound(cap, 1, 1e30);
        amount = bound(amount, 1, 1e30);
        AssetLimit[] memory limits = new AssetLimit[](1);
        limits[0] = AssetLimit(NATIVE, cap, type(uint256).max);
        guard.setPolicy(_cfg(), limits, _emptyAddrs(), _emptySelectors(), _emptyAddrs());

        (bool allowed, ReasonCode code) = guard.simulate(address(this), alice, amount, "");
        if (amount <= cap) {
            assertTrue(allowed);
        } else {
            assertFalse(allowed);
            assertEq(uint256(code), uint256(ReasonCode.PerTxCapExceeded));
        }
    }

    // ── util ────────────────────────────────────────────────────────────────────

    function _expect(ReasonCode code) internal {
        vm.expectRevert(abi.encodeWithSelector(PolicyViolation.selector, code));
    }
}
