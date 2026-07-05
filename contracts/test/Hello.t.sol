// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Hello} from "../src/Hello.sol";

contract HelloTest is Test {
    Hello internal hello;

    event GreetingSet(address indexed by, string greeting);

    function setUp() public {
        hello = new Hello("gm, Noviq");
    }

    function test_InitialGreeting() public view {
        assertEq(hello.greeting(), "gm, Noviq");
        assertEq(hello.deployer(), address(this));
    }

    function test_SetGreeting() public {
        hello.setGreeting("covenant online");
        assertEq(hello.greeting(), "covenant online");
    }

    function test_SetGreeting_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit GreetingSet(address(this), "hello hsk");
        hello.setGreeting("hello hsk");
    }

    function testFuzz_SetGreeting(string calldata g) public {
        hello.setGreeting(g);
        assertEq(hello.greeting(), g);
    }
}
