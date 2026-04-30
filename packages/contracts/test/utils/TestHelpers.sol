// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

/**
 * @title TestHelpers
 * @notice Common test utilities for Foro contracts
 */
library TestHelpers {
    function computeCommitHash(
        string memory testCasesJSON,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(testCasesJSON, salt));
    }
    
    function computeContractHash(string memory agentContractJSON) internal pure returns (bytes32) {
        return keccak256(bytes(agentContractJSON));
    }
    
    function randomBytes32(uint256 seed) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(seed, blockhash(block.number - 1)));
    }
    
    function randomAddress(uint256 seed) internal view returns (address) {
        return address(uint160(uint256(randomBytes32(seed))));
    }
}

/**
 * @title BaseTest
 * @notice Base test contract with common setup and utilities
 */
abstract contract BaseTest is Test {
    address internal constant ALICE = address(0x1);
    address internal constant BOB = address(0x2);
    address internal constant CHARLIE = address(0x3);
    address internal constant KEEPER1 = address(0x101);
    address internal constant KEEPER2 = address(0x102);
    address internal constant TREASURY = address(0x999);
    
    uint256 internal constant TEST_FEE = 0.001 ether;
    uint256 internal constant MIN_STAKE = 0.01 ether;
    
    function setUp() public virtual {
        vm.label(ALICE, "Alice");
        vm.label(BOB, "Bob");
        vm.label(CHARLIE, "Charlie");
        vm.label(KEEPER1, "Keeper1");
        vm.label(KEEPER2, "Keeper2");
        vm.label(TREASURY, "Treasury");
        
        vm.deal(ALICE, 100 ether);
        vm.deal(BOB, 100 ether);
        vm.deal(CHARLIE, 100 ether);
        vm.deal(KEEPER1, 100 ether);
        vm.deal(KEEPER2, 100 ether);
    }
    
    function getExampleAgentContract() internal pure returns (string memory) {
        return '{"category":"url-summarizer","version":"1.0.0","input":{"type":"object","required":["url"],"properties":{"url":{"type":"string","format":"uri"}}},"output":{"type":"object","required":["summary"],"properties":{"summary":{"type":"string","minLength":50,"maxLength":500}}},"sla":{"maxLatencyMs":3000,"maxCostUSD":0.02},"testCases":[{"id":"tc-01","description":"Test case 1","input":{"url":"https://example.com"},"evaluation":{"criteria":["Summary is accurate","No hallucinations"]}}]}';
    }
    
    function getExampleTestCases() internal pure returns (string memory) {
        return '[{"id":"tc-01","description":"Test case 1","input":{"url":"https://example.com"},"evaluation":{"criteria":["Summary is accurate","No hallucinations"]}}]';
    }
}
