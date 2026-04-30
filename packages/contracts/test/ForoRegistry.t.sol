// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ForoRegistry} from "../src/ForoRegistry.sol";
import {MockERC8004} from "../src/MockERC8004.sol";
import {IForoRegistry} from "../src/interfaces/IForoRegistry.sol";
import {IERC8004} from "../src/interfaces/IERC8004.sol";

contract ForoRegistryTest is Test {
    ForoRegistry public registry;
    MockERC8004 public erc8004;
    
    address public alice;
    address public bob;
    address public keeper;
    
    event AgentRegistered(
        uint256 indexed foroId,
        address indexed erc8004Address,
        uint256 erc8004AgentId,
        bytes32 contractHash,
        address creatorWallet
    );
    
    function setUp() public {
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        keeper = makeAddr("keeper");
        
        erc8004 = new MockERC8004();
        registry = new ForoRegistry();
        
        vm.label(address(erc8004), "ERC8004");
        vm.label(address(registry), "ForoRegistry");
    }
    
    // ============================================
    // Phase 3: User Story 1 Tests (T021-T023)
    // ============================================
    
    // T021: Unit test for ForoRegistry.registerAgent()
    function test_RegisterAgent() public {
        // Setup: Alice mints an ERC-8004 agent with metadata
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        string memory agentContract = '{"category":"url-summarizer","version":"1.0.0","testCases":[]}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(agentContract));
        
        // Calculate expected contractHash
        bytes32 expectedHash = keccak256(bytes(agentContract));
        
        // Register agent in Foro Registry
        vm.expectEmit(true, true, false, true);
        emit AgentRegistered(1, address(erc8004), erc8004AgentId, expectedHash, alice);
        
        uint256 foroId = registry.registerAgent(address(erc8004), erc8004AgentId);
        
        // Verify agent is registered correctly
        assertEq(foroId, 1, "First foroId should be 1");
        
        IForoRegistry.Agent memory agent = registry.getAgent(foroId);
        assertEq(agent.foroId, foroId, "foroId should match");
        assertEq(agent.erc8004Address, address(erc8004), "ERC8004 address should match");
        assertEq(agent.erc8004AgentId, erc8004AgentId, "ERC8004 agentId should match");
        assertEq(agent.contractHash, expectedHash, "contractHash should match computed hash");
        assertEq(agent.creatorWallet, alice, "creatorWallet should be alice");
        assertEq(uint256(agent.status), uint256(IForoRegistry.AgentStatus.PENDING), "Status should be PENDING");
        assertEq(agent.testCount, 0, "testCount should be 0");
        assertEq(agent.cumulativeScore, 0, "cumulativeScore should be 0");
        assertGt(agent.registrationTimestamp, 0, "registrationTimestamp should be set");
        
        vm.stopPrank();
    }
    
    function test_RegisterAgent_WithoutMetadata() public {
        // Setup: Alice mints an ERC-8004 agent without foro:contract metadata
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        // Should revert because metadata is required
        vm.expectRevert("Agent Contract metadata not found");
        registry.registerAgent(address(erc8004), erc8004AgentId);
        
        vm.stopPrank();
    }
    
    function test_RegisterAgent_WithEmptyMetadata() public {
        // Setup: Alice mints an ERC-8004 agent with empty metadata
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(""));
        
        // Should revert because empty metadata is invalid
        // Note: Empty metadata returns empty bytes from getMetadata, same as "not found"
        vm.expectRevert("Agent Contract metadata not found");
        registry.registerAgent(address(erc8004), erc8004AgentId);
        
        vm.stopPrank();
    }
    
    function test_RegisterAgent_NotOwner() public {
        // Setup: Alice mints an ERC-8004 agent
        vm.prank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        vm.prank(alice);
        string memory agentContract = '{"category":"url-summarizer","version":"1.0.0"}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(agentContract));
        
        // Bob tries to register Alice's agent - should revert
        vm.prank(bob);
        vm.expectRevert("Caller is not the agent owner");
        registry.registerAgent(address(erc8004), erc8004AgentId);
    }
    
    // T022: Unit test for duplicate registration prevention
    function test_RevertWhen_DuplicateRegistration() public {
        // Setup: Alice mints and registers an agent
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        string memory agentContract = '{"category":"url-summarizer","version":"1.0.0"}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(agentContract));
        
        // First registration succeeds
        uint256 foroId1 = registry.registerAgent(address(erc8004), erc8004AgentId);
        assertEq(foroId1, 1, "First registration should succeed");
        
        // Second registration of same agent should revert
        vm.expectRevert("Agent already registered");
        registry.registerAgent(address(erc8004), erc8004AgentId);
        
        vm.stopPrank();
    }
    
    function test_RegisterMultipleAgentsBySameOwner() public {
        vm.startPrank(alice);
        
        // Register first agent
        uint256 erc8004AgentId1 = erc8004.register("ipfs://agent1");
        string memory contract1 = '{"category":"url-summarizer","version":"1.0.0"}';
        erc8004.setMetadata(erc8004AgentId1, "foro:contract", bytes(contract1));
        uint256 foroId1 = registry.registerAgent(address(erc8004), erc8004AgentId1);
        
        // Register second agent
        uint256 erc8004AgentId2 = erc8004.register("ipfs://agent2");
        string memory contract2 = '{"category":"text-classifier","version":"1.0.0"}';
        erc8004.setMetadata(erc8004AgentId2, "foro:contract", bytes(contract2));
        uint256 foroId2 = registry.registerAgent(address(erc8004), erc8004AgentId2);
        
        assertEq(foroId1, 1, "First foroId");
        assertEq(foroId2, 2, "Second foroId");
        
        IForoRegistry.Agent memory agent1 = registry.getAgent(foroId1);
        IForoRegistry.Agent memory agent2 = registry.getAgent(foroId2);
        
        assertEq(agent1.erc8004AgentId, erc8004AgentId1, "First agent ERC8004 ID");
        assertEq(agent2.erc8004AgentId, erc8004AgentId2, "Second agent ERC8004 ID");
        
        vm.stopPrank();
    }
    
    // T023: Unit test for Agent Contract metadata immutability detection
    function test_DetectMetadataChange_ContractHashMismatch() public {
        // Setup: Alice mints and registers an agent
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        string memory originalContract = '{"category":"url-summarizer","version":"1.0.0"}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(originalContract));
        
        uint256 foroId = registry.registerAgent(address(erc8004), erc8004AgentId);
        
        // Get the original contractHash
        IForoRegistry.Agent memory agentBefore = registry.getAgent(foroId);
        bytes32 originalHash = agentBefore.contractHash;
        
        // Alice modifies the metadata (this should be detected)
        string memory modifiedContract = '{"category":"url-summarizer","version":"2.0.0"}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(modifiedContract));
        
        // Verify that the on-chain hash is still the original (immutable)
        IForoRegistry.Agent memory agentAfter = registry.getAgent(foroId);
        assertEq(agentAfter.contractHash, originalHash, "Stored contractHash should be immutable");
        
        // Verify that the current ERC8004 metadata produces a different hash
        bytes memory currentMetadata = erc8004.getMetadata(erc8004AgentId, "foro:contract");
        bytes32 currentHash = keccak256(currentMetadata);
        
        assertTrue(currentHash != originalHash, "Current hash should differ from stored hash");
        assertEq(currentHash, keccak256(bytes(modifiedContract)), "Current hash should match modified metadata");
        
        vm.stopPrank();
    }
    
    function test_VerifyMetadataImmutability() public {
        // Setup: Register an agent
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        string memory agentContract = '{"category":"url-summarizer","testCases":["test1","test2"]}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(agentContract));
        
        uint256 foroId = registry.registerAgent(address(erc8004), erc8004AgentId);
        
        // Get the stored hash
        IForoRegistry.Agent memory agent = registry.getAgent(foroId);
        bytes32 storedHash = agent.contractHash;
        
        // Verify: Current metadata matches stored hash (no modification yet)
        bytes memory currentMetadata = erc8004.getMetadata(erc8004AgentId, "foro:contract");
        bytes32 currentHash = keccak256(currentMetadata);
        assertEq(currentHash, storedHash, "Hash should match immediately after registration");
        
        // Simulate a malicious or accidental metadata change
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes('{"category":"url-summarizer","testCases":["modified"]}'));
        
        // The stored hash remains unchanged (proving immutability)
        IForoRegistry.Agent memory agentAfterChange = registry.getAgent(foroId);
        assertEq(agentAfterChange.contractHash, storedHash, "Stored hash must remain immutable");
        
        // But the ERC8004 metadata has changed
        bytes memory modifiedMetadata = erc8004.getMetadata(erc8004AgentId, "foro:contract");
        bytes32 modifiedHash = keccak256(modifiedMetadata);
        assertTrue(modifiedHash != storedHash, "ERC8004 metadata has changed");
        
        vm.stopPrank();
    }
}
