// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Minimal ERC-20 for exercising the guard's transfer/approve decoding and
///      real value movement through a CovenantAccount. Not production code.
contract MockERC20 {
    string public name = "Mock";
    string public symbol = "MCK";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @dev A generic call target for arbitrary-call and failure paths.
contract MockTarget {
    uint256 public pings;

    event Pinged(uint256 value);

    function ping() external payable {
        pings++;
        emit Pinged(msg.value);
    }

    function boom() external pure {
        revert("boom");
    }

    receive() external payable {}
}

/// @dev Satisfies ICovenantRoles for AgentBond tests without a full account+guard.
contract MockRoles {
    address public owner;
    address public agent;

    constructor(address owner_, address agent_) {
        owner = owner_;
        agent = agent_;
    }

    function setAgent(address agent_) external {
        agent = agent_;
    }
}
