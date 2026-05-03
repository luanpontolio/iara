// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ForoRegistry} from "../src/ForoRegistry.sol";
import {MockERC8004} from "../src/MockERC8004.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {IForoRegistry} from "../src/interfaces/IForoRegistry.sol";
import {IERC8004} from "../src/interfaces/IERC8004.sol";

contract ForoRegistryTest is Test {
    ForoRegistry public registry;
    MockERC8004 public erc8004;
    AgentVault public vault;
    
    address public alice;
    address public bob;
    address public keeper;
    address public protocol;
    
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
        protocol = makeAddr("protocol");
        
        erc8004 = new MockERC8004();
        vault = new AgentVault(protocol);
        registry = new ForoRegistry(address(vault));
        
        // Transfer vault ownership to registry
        vault.transferOwnership(address(registry));
        
        vm.label(address(erc8004), "ERC8004");
        vm.label(address(registry), "ForoRegistry");
        vm.label(address(vault), "AgentVault");
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
    
    // ============================================
    // Phase 4: User Story 2 Tests (T030-T036)
    // ============================================
    
    // Helper: Register a sample agent for testing
    function _registerSampleAgent() internal returns (uint256 foroId) {
        vm.startPrank(alice);
        uint256 erc8004AgentId = erc8004.register("ipfs://agent-metadata");
        
        string memory agentContract = '{"category":"url-summarizer","version":"1.0.0","testCases":[]}';
        erc8004.setMetadata(erc8004AgentId, "foro:contract", bytes(agentContract));
        
        foroId = registry.registerAgent(address(erc8004), erc8004AgentId);
        vm.stopPrank();
    }
    
    // T030: Unit test for requestTest()
    function test_RequestTest() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.startPrank(bob);
        
        uint256 jobId = registry.requestTest{value: testFee}(agentId);
        
        // Job IDs start at 1 from their own counter (independent of agent IDs)
        assertEq(jobId, 1, "First jobId should be 1");
        
        // getLatestTestJobId should return this jobId
        assertEq(registry.getLatestTestJobId(agentId), jobId, "getLatestTestJobId should return jobId");
        
        // Verify test job was created
        IForoRegistry.TestJob memory job = registry.getTestJob(jobId);
        assertEq(job.foroId, jobId, "foroId should match jobId");
        assertEq(job.agentId, agentId, "agentId should match");
        assertEq(job.requester, bob, "requester should be bob");
        assertEq(job.testFee, testFee, "testFee should match");
        assertEq(uint256(job.status), uint256(IForoRegistry.JobStatus.REQUESTED), "status should be REQUESTED");
        assertEq(job.keeperAddress, address(0), "keeper should be zero address initially");
        
        vm.stopPrank();
    }
    
    function test_RequestTest_InsufficientFee() public {
        uint256 agentId = _registerSampleAgent();
        
        vm.deal(bob, 1 ether);
        vm.startPrank(bob);
        
        // Should revert if fee is too low
        vm.expectRevert("Insufficient test fee");
        registry.requestTest{value: 0.0001 ether}(agentId);
        
        vm.stopPrank();
    }
    
    function test_RequestTest_InvalidAgent() public {
        vm.deal(bob, 1 ether);
        vm.startPrank(bob);
        
        // Should revert for non-existent agent
        vm.expectRevert("Invalid agentId");
        registry.requestTest{value: 0.001 ether}(999);
        
        vm.stopPrank();
    }
    
    // T031: Unit test for commit-reveal mechanism
    function test_CommitRevealMechanism() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        // Bob requests test
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        // Keeper prepares commit
        string memory testCasesJSON = '{"testCases":[{"id":"tc-01"}]}';
        bytes32 salt = keccak256("random-salt");
        bytes32 commitHash = keccak256(abi.encode(testCasesJSON, salt));
        
        // Keeper claims job with stake
        uint256 requiredStake = testFee * 2;
        vm.deal(keeper, 1 ether);
        vm.startPrank(keeper);
        
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        
        // Verify job was claimed
        IForoRegistry.TestJob memory job = registry.getTestJob(foroId);
        assertEq(job.keeperAddress, keeper, "keeper should be set");
        assertEq(job.keeperStake, requiredStake, "stake should match");
        assertEq(job.commitHash, commitHash, "commitHash should match");
        assertEq(uint256(job.status), uint256(IForoRegistry.JobStatus.COMMITTED), "status should be COMMITTED");
        assertGt(job.commitTimestamp, 0, "commitTimestamp should be set");
        
        // Keeper reveals test inputs
        registry.revealTestInputs(foroId, testCasesJSON, salt);
        
        // Verify reveal succeeded
        IForoRegistry.TestJob memory jobAfterReveal = registry.getTestJob(foroId);
        assertEq(uint256(jobAfterReveal.status), uint256(IForoRegistry.JobStatus.REVEALED), "status should be REVEALED");
        assertGt(jobAfterReveal.revealTimestamp, 0, "revealTimestamp should be set");
        
        vm.stopPrank();
    }
    
    function test_ClaimJob_InsufficientStake() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        bytes32 commitHash = keccak256("test");
        
        vm.deal(keeper, 1 ether);
        vm.startPrank(keeper);
        
        // Should revert if stake is less than 2x fee
        vm.expectRevert("Insufficient stake");
        registry.claimJob{value: testFee}(foroId, commitHash); // Only 1x fee
        
        vm.stopPrank();
    }
    
    function test_RevealTestInputs_HashMismatch() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        string memory testCasesJSON = '{"testCases":[]}';
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = keccak256(abi.encode(testCasesJSON, salt));
        
        uint256 requiredStake = testFee * 2;
        vm.deal(keeper, 1 ether);
        vm.startPrank(keeper);
        
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        
        // Try to reveal with different data - should revert
        string memory wrongTestCases = '{"testCases":["wrong"]}';
        vm.expectRevert("Hash mismatch");
        registry.revealTestInputs(foroId, wrongTestCases, salt);
        
        vm.stopPrank();
    }
    
    // T032: Unit test for submitResult()
    function test_SubmitResult() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        // Request, claim, and reveal
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        string memory testCasesJSON = '{"testCases":[]}';
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = keccak256(abi.encode(testCasesJSON, salt));
        
        uint256 requiredStake = testFee * 2;
        vm.deal(keeper, 1 ether);
        vm.startPrank(keeper);
        
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        registry.revealTestInputs(foroId, testCasesJSON, salt);
        
        // Submit result
        uint256 score = 7500; // 75.00
        uint256 latency = 1500; // ms
        uint256 rounds = 3;
        bytes32 chatId = keccak256("chat-id");
        
        registry.submitResult(foroId, score, latency, rounds, chatId);
        
        // Verify result was stored
        IForoRegistry.TestResult memory result = registry.getTestResult(foroId);
        assertEq(result.foroId, foroId, "foroId should match");
        assertEq(result.score, score, "score should match");
        assertEq(result.avgLatencyMs, latency, "latency should match");
        assertEq(result.rounds, rounds, "rounds should match");
        assertEq(result.chatId, chatId, "chatId should match");
        assertEq(result.teeVerified, true, "teeVerified should be true with valid chatId");
        assertGt(result.submissionTimestamp, 0, "submissionTimestamp should be set");
        assertEq(result.finalized, false, "should not be finalized yet");
        
        // Verify job status updated
        IForoRegistry.TestJob memory job = registry.getTestJob(foroId);
        assertEq(uint256(job.status), uint256(IForoRegistry.JobStatus.SUBMITTED), "status should be SUBMITTED");
        assertGt(job.contestationDeadline, block.timestamp, "contestation deadline should be in future");
        
        vm.stopPrank();
    }
    
    function test_SubmitResult_WithoutTEEProof() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        string memory testCasesJSON = '{"testCases":[]}';
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = keccak256(abi.encode(testCasesJSON, salt));
        
        uint256 requiredStake = testFee * 2;
        vm.deal(keeper, 1 ether);
        vm.startPrank(keeper);
        
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        registry.revealTestInputs(foroId, testCasesJSON, salt);
        
        // Submit result without TEE proof (chatId = 0)
        registry.submitResult(foroId, 7500, 1500, 3, bytes32(0));
        
        // Verify score is forced to 0 when teeVerified=false
        IForoRegistry.TestResult memory result = registry.getTestResult(foroId);
        assertEq(result.score, 0, "score should be 0 without TEE proof");
        assertEq(result.teeVerified, false, "teeVerified should be false");
        
        vm.stopPrank();
    }
    
    // T033: Unit test for finalizeResult()
    function test_FinalizeResult() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        // Full flow: request → claim → reveal → submit
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        string memory testCasesJSON = '{"testCases":[]}';
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = keccak256(abi.encode(testCasesJSON, salt));
        
        uint256 requiredStake = testFee * 2;
        vm.deal(keeper, 1 ether);
        vm.prank(keeper);
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        
        vm.prank(keeper);
        registry.revealTestInputs(foroId, testCasesJSON, salt);
        
        vm.prank(keeper);
        registry.submitResult(foroId, 7500, 1500, 3, keccak256("chat-id"));
        
        // Wait for contestation window to expire (1 hour)
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Finalize result
        uint256 keeperBalanceBefore = keeper.balance;
        vm.prank(keeper);
        registry.finalizeResult(foroId);
        
        // Verify result is finalized
        IForoRegistry.TestResult memory result = registry.getTestResult(foroId);
        assertEq(result.finalized, true, "result should be finalized");
        
        // Verify job status
        IForoRegistry.TestJob memory job = registry.getTestJob(foroId);
        assertEq(uint256(job.status), uint256(IForoRegistry.JobStatus.FINALIZED), "status should be FINALIZED");
        
        // Verify stake was returned to keeper
        uint256 keeperBalanceAfter = keeper.balance;
        assertGt(keeperBalanceAfter, keeperBalanceBefore, "keeper should receive stake back");
        
        // Verify agent stats updated
        IForoRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.testCount, 1, "testCount should be 1");
    }
    
    function test_FinalizeResult_BeforeContestationWindow() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        string memory testCasesJSON = '{"testCases":[]}';
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = keccak256(abi.encode(testCasesJSON, salt));
        
        uint256 requiredStake = testFee * 2;
        vm.deal(keeper, 1 ether);
        vm.prank(keeper);
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        
        vm.prank(keeper);
        registry.revealTestInputs(foroId, testCasesJSON, salt);
        
        vm.prank(keeper);
        registry.submitResult(foroId, 7500, 1500, 3, keccak256("chat-id"));
        
        // Try to finalize immediately (contestation window still active)
        vm.prank(keeper);
        vm.expectRevert("Contestation window active");
        registry.finalizeResult(foroId);
    }
    
    // T035: Unit test for forfeitStake() timeout mechanism
    function test_ForfeitStake_AfterTimeout() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        bytes32 commitHash = keccak256("test");
        uint256 requiredStake = testFee * 2;
        
        vm.deal(keeper, 1 ether);
        vm.prank(keeper);
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        
        // Wait for reveal timeout (24 hours)
        vm.warp(block.timestamp + 24 hours + 1);
        
        // Anyone can call forfeitStake after timeout
        uint256 bobBalanceBefore = bob.balance;
        vm.prank(alice);
        registry.forfeitStake(foroId);
        
        // Verify stake was slashed
        IForoRegistry.TestJob memory job = registry.getTestJob(foroId);
        assertEq(uint256(job.status), uint256(IForoRegistry.JobStatus.REFUNDED), "status should be REFUNDED");
        
        // Verify requester received refund
        uint256 bobBalanceAfter = bob.balance;
        assertEq(bobBalanceAfter - bobBalanceBefore, testFee, "requester should receive refund");
    }
    
    function test_ForfeitStake_BeforeTimeout() public {
        uint256 agentId = _registerSampleAgent();
        uint256 testFee = 0.001 ether;
        
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        uint256 foroId = registry.requestTest{value: testFee}(agentId);
        
        bytes32 commitHash = keccak256("test");
        uint256 requiredStake = testFee * 2;
        
        vm.deal(keeper, 1 ether);
        vm.prank(keeper);
        registry.claimJob{value: requiredStake}(foroId, commitHash);
        
        // Try to forfeit before timeout - should revert
        vm.prank(alice);
        vm.expectRevert("Timeout not reached");
        registry.forfeitStake(foroId);
    }
}
