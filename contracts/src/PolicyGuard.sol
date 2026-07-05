// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPolicyGuard} from "./interfaces/IPolicyGuard.sol";
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
} from "./libraries/PolicyTypes.sol";

/// @title PolicyGuard
/// @notice On-chain covenant registry + enforcer for Noviq. Each CovenantAccount
///         stores its compiled covenant here (keyed by its own address) and
///         routes every agent action through {checkAndRecord}, which reverts on
///         any violation. Safety is deterministic and independent of the LLM.
/// @dev Permissionless: an account can only read/write its OWN policy because all
///      writes key on `msg.sender`. No admin, no upgradeability.
contract PolicyGuard is IPolicyGuard {
    struct StoredAsset {
        bool allowed;
        uint256 perTxCap;
        uint256 dailyCap;
    }

    // account => config
    mapping(address => PolicyConfig) private _config;
    // account => asset => limits
    mapping(address => mapping(address => StoredAsset)) private _assets;
    // account => asset => rolling spend
    mapping(address => mapping(address => SpendWindow)) private _spend;
    // account => recipient => allowed
    mapping(address => mapping(address => bool)) private _recipient;
    // account => selector => allowed
    mapping(address => mapping(bytes4 => bool)) private _selector;
    // account => target => allowed
    mapping(address => mapping(address => bool)) private _target;

    // key sets so a policy re-set can clear the previous version cleanly
    mapping(address => address[]) private _assetKeys;
    mapping(address => address[]) private _recipientKeys;
    mapping(address => bytes4[]) private _selectorKeys;
    mapping(address => address[]) private _targetKeys;

    // ── Registry ───────────────────────────────────────────────────────────

    /// @inheritdoc IPolicyGuard
    function setPolicy(
        PolicyConfig calldata config,
        AssetLimit[] calldata limits,
        address[] calldata recipients,
        bytes4[] calldata selectors,
        address[] calldata targets
    ) external {
        address account = msg.sender;
        _clear(account);

        _config[account] = config;

        for (uint256 i; i < limits.length; ++i) {
            AssetLimit calldata l = limits[i];
            _assets[account][l.asset] = StoredAsset(true, l.perTxCap, l.dailyCap);
            _assetKeys[account].push(l.asset);
        }
        for (uint256 i; i < recipients.length; ++i) {
            _recipient[account][recipients[i]] = true;
            _recipientKeys[account].push(recipients[i]);
        }
        for (uint256 i; i < selectors.length; ++i) {
            _selector[account][selectors[i]] = true;
            _selectorKeys[account].push(selectors[i]);
        }
        for (uint256 i; i < targets.length; ++i) {
            _target[account][targets[i]] = true;
            _targetKeys[account].push(targets[i]);
        }

        emit PolicySet(account, limits.length, recipients.length);
    }

    /// @dev Wipe the previous covenant version's mappings + key sets for `account`.
    function _clear(address account) private {
        address[] storage aKeys = _assetKeys[account];
        for (uint256 i; i < aKeys.length; ++i) {
            delete _assets[account][aKeys[i]];
        }
        delete _assetKeys[account];

        address[] storage rKeys = _recipientKeys[account];
        for (uint256 i; i < rKeys.length; ++i) {
            delete _recipient[account][rKeys[i]];
        }
        delete _recipientKeys[account];

        bytes4[] storage sKeys = _selectorKeys[account];
        for (uint256 i; i < sKeys.length; ++i) {
            delete _selector[account][sKeys[i]];
        }
        delete _selectorKeys[account];

        address[] storage tKeys = _targetKeys[account];
        for (uint256 i; i < tKeys.length; ++i) {
            delete _target[account][tKeys[i]];
        }
        delete _targetKeys[account];

        delete _config[account];
        // Note: spend windows are intentionally NOT reset on re-set, so a policy
        // change cannot be used to bypass an in-flight rolling cap.
    }

    // ── Enforcement ──────────────────────────────────────────────────────────

    /// @inheritdoc IPolicyGuard
    function checkAndRecord(address target, uint256 value, bytes calldata data, bool approved) external {
        address account = msg.sender;
        ActionInfo memory action = _decode(target, value, data);
        ReasonCode code = _evaluate(account, target, action, approved);
        if (code != ReasonCode.OK) revert PolicyViolation(code);

        // Record spend against the rolling window (reset if elapsed).
        PolicyConfig storage c = _config[account];
        SpendWindow storage w = _spend[account][action.asset];
        if (block.timestamp >= uint256(w.windowStart) + c.windowDuration) {
            w.windowStart = uint64(block.timestamp);
            w.spent = action.amount;
        } else {
            w.spent += action.amount;
        }

        emit ActionAllowed(account, action.asset, action.recipient, action.amount);
    }

    /// @inheritdoc IPolicyGuard
    function simulate(address account, address target, uint256 value, bytes calldata data)
        external
        view
        returns (bool allowed, ReasonCode code)
    {
        ActionInfo memory action = _decode(target, value, data);
        code = _evaluate(account, target, action, false);
        allowed = code == ReasonCode.OK;
    }

    /// @dev Pure covenant evaluation. Returns the first failing {ReasonCode}, or OK.
    function _evaluate(address account, address target, ActionInfo memory action, bool approved)
        private
        view
        returns (ReasonCode)
    {
        PolicyConfig storage c = _config[account];
        if (!c.active) return ReasonCode.PolicyInactive;

        StoredAsset storage a = _assets[account][action.asset];
        if (!a.allowed) return ReasonCode.AssetNotAllowed;
        if (action.amount > a.perTxCap) return ReasonCode.PerTxCapExceeded;

        (uint256 spent,) = _currentWindow(account, action.asset, c.windowDuration);
        if (spent + action.amount > a.dailyCap) return ReasonCode.DailyCapExceeded;

        if (c.recipientAllowlistEnabled && !_recipient[account][action.recipient]) {
            return ReasonCode.RecipientNotAllowed;
        }
        if (c.selectorAllowlistEnabled && action.selector != bytes4(0)) {
            if (!_selector[account][action.selector]) return ReasonCode.SelectorNotAllowed;
        }
        if (c.targetAllowlistEnabled && !_target[account][target]) {
            return ReasonCode.TargetNotAllowed;
        }
        if (c.largeActionThreshold != 0 && action.amount >= c.largeActionThreshold && !approved) {
            return ReasonCode.LargeActionNotApproved;
        }
        return ReasonCode.OK;
    }

    /// @dev Current rolling-window spend for (account, asset); resets if elapsed.
    function _currentWindow(address account, address asset, uint64 windowDuration)
        private
        view
        returns (uint256 spent, uint64 windowStart)
    {
        SpendWindow storage w = _spend[account][asset];
        if (block.timestamp >= uint256(w.windowStart) + windowDuration) {
            return (0, uint64(block.timestamp));
        }
        return (w.spent, w.windowStart);
    }

    // ── Action decoding ──────────────────────────────────────────────────────

    /// @inheritdoc IPolicyGuard
    function decodeAction(address target, uint256 value, bytes calldata data)
        external
        pure
        returns (ActionInfo memory)
    {
        return _decode(target, value, data);
    }

    /// @dev Extract (asset, amount, recipient, selector) from a raw call.
    function _decode(address target, uint256 value, bytes calldata data) private pure returns (ActionInfo memory info) {
        if (data.length < 4) {
            // Pure native transfer (or empty call): value goes to `target`.
            info.asset = address(0);
            info.amount = value;
            info.recipient = target;
            info.selector = bytes4(0);
            return info;
        }

        bytes4 sel = bytes4(data[:4]);
        info.selector = sel;

        if (sel == ERC20_TRANSFER && data.length >= 68) {
            (address to, uint256 amt) = abi.decode(data[4:], (address, uint256));
            info.asset = target;
            info.amount = amt;
            info.recipient = to;
            return info;
        }
        if (sel == ERC20_APPROVE && data.length >= 68) {
            (address spender, uint256 amt) = abi.decode(data[4:], (address, uint256));
            info.asset = target;
            info.amount = amt;
            info.recipient = spender;
            return info;
        }
        if (sel == ERC20_TRANSFER_FROM && data.length >= 100) {
            (, address to, uint256 amt) = abi.decode(data[4:], (address, address, uint256));
            info.asset = target;
            info.amount = amt;
            info.recipient = to;
            return info;
        }

        // Arbitrary contract call: gate by target/selector, treat native value as spend.
        info.asset = address(0);
        info.amount = value;
        info.recipient = target;
        return info;
    }

    // ── Views ────────────────────────────────────────────────────────────────

    /// @inheritdoc IPolicyGuard
    function isActive(address account) external view returns (bool) {
        return _config[account].active;
    }

    /// @inheritdoc IPolicyGuard
    function timelockDelay(address account) external view returns (uint64) {
        return _config[account].timelockDelay;
    }

    /// @inheritdoc IPolicyGuard
    function largeActionThreshold(address account) external view returns (uint256) {
        return _config[account].largeActionThreshold;
    }

    /// @inheritdoc IPolicyGuard
    function getConfig(address account) external view returns (PolicyConfig memory) {
        return _config[account];
    }

    /// @inheritdoc IPolicyGuard
    function getAssetLimit(address account, address asset)
        external
        view
        returns (bool allowed, uint256 perTxCap, uint256 dailyCap)
    {
        StoredAsset storage a = _assets[account][asset];
        return (a.allowed, a.perTxCap, a.dailyCap);
    }

    /// @inheritdoc IPolicyGuard
    function getSpendWindow(address account, address asset) external view returns (SpendWindow memory) {
        return _spend[account][asset];
    }

    /// @inheritdoc IPolicyGuard
    function isRecipientAllowed(address account, address recipient) external view returns (bool) {
        return _recipient[account][recipient];
    }
}
