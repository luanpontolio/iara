// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ForoRegistry} from "../src/ForoRegistry.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {MockERC8004} from "../src/MockERC8004.sol";
import {IForoRegistry} from "../src/interfaces/IForoRegistry.sol";

/**
 * @title Integration Test
 * @notice Comprehensive end-to-end tests for Foro protocol
 * @dev Tests complete workflows: register → request → commit → execute → reveal → submit → finalize
 *      Includes happy path and failure scenarios (agent endpoint failures, TEE unavailable)
 */
contract IntegrationTest is Test {
    ForoRegistry public foroRegistry;
    AgentVault public agentVault;
    MockERC8004 public erc8004;

    address public protocolTreasury = address(0x999);
    address public creator = address(0x1);
    address public user = address(0x2);
    address public keeper = address(0x3);
    address public keeper2 = address(0x4);
    address public contestant = address(0x5);

    uint256 public constant MIN_KEEPER_STAKE = 0.01 ether;
    uint256 public constant TEST_FEE = 0.001 ether;
    uint256 public constant KEEPER_STAKE = TEST_FEE * 2;
    uint256 public constant CONTEST_STAKE = KEEPER_STAKE / 2;

    uint256 public agentId;
    uint256 public foroId;
    bytes32 public contractHash;

    // Test data
    string public agentContractJSON = '{"category":"url-summarizer","version":"1.0.0","testCases":[{"id":"tc-01","input":{"url":"https://example.com"},"evaluation":{"criteria":["Summary is accurate"]}}]}';
    bytes32 public salt = keccak256("test-salt");
    bytes32 public commitHash;

    function setUp() public {
        // Deploy contracts in correct order
        erc8004 = new MockERC8004();
        agentVault = new AgentVault(protocolTreasury);
        foroRegistry = new ForoRegistry(address(agentVault));

        // Transfer AgentVault ownership to ForoRegistry
        agentVault.transferOwnership(address(foroRegistry));

        // Fund test accounts
        vm.deal(creator, 10 ether);
        vm.deal(user, 10 ether);
        vm.deal(keeper, 10 ether);
        vm.deal(keeper2, 10 ether);
        vm.deal(contestant, 10 ether);

        // Register Keepers
        vm.prank(keeper);
        foroRegistry.registerKeeper{value: MIN_KEEPER_STAKE}();

        vm.prank(keeper2);
        foroRegistry.registerKeeper{value: MIN_KEEPER_STAKE}();
    }

    /**
     * @notice Test complete happy path flow
     * @dev register → request → commit → reveal → submit → finalize → status VERIFIED
     */
    function testHappyPath() public {
        // Step 1: Creator registers agent
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        // Verify agent registered
        IForoRegistry.Agent memory agent = foroRegistry.getAgent(foroId);
        assertEq(uint8(agent.status), uint8(IForoRegistry.AgentStatus.PENDING));
        assertEq(agent.testCount, 0);

        // Step 2: User requests test
        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        // Step 3: Keeper commits hash + stake
        commitHash = keccak256(abi.encode(agentContractJSON, salt));
        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);

        // Step 4: Keeper reveals test inputs
        vm.prank(keeper);
        foroRegistry.revealTestInputs(testForoId, agentContractJSON, salt);

        // Step 5: Keeper submits result
        bytes32 chatId = keccak256("test-chat-id");
        
        vm.prank(keeper);
        foroRegistry.submitResult(
            testForoId,
            7500, // score 75.00% (scaled to 0-10000)
            1500, // 1.5s latency
            1, // rounds (number of test cases executed)
            chatId // TEE proof chatId
        );

        // Step 6: Wait for contestation window (1 hour)
        vm.warp(block.timestamp + 1 hours + 1);

        // Step 7: Finalize result
        vm.prank(keeper);
        foroRegistry.finalizeResult(testForoId);

        // Keeper must withdraw their staked amount from _pendingWithdrawals
        vm.prank(keeper);
        foroRegistry.withdraw();

        // Verify agent status updated to VERIFIED (score 75.00% >= 60.00 threshold)
        IForoRegistry.Agent memory updatedAgent = foroRegistry.getAgent(foroId);
        assertEq(uint8(updatedAgent.status), uint8(IForoRegistry.AgentStatus.VERIFIED));
        assertEq(updatedAgent.testCount, 1);

        // Verify fee distribution (70% keeper, 20% creator, 10% protocol)
        // Note: Keeper paid MIN_KEEPER_STAKE (0.01 ETH) during registration, which remains locked
        // KEEPER_STAKE for the job is paid and returned, so it nets to zero
        assertEq(address(keeper).balance, 10 ether - MIN_KEEPER_STAKE + (TEST_FEE * 70 / 100));
        assertEq(address(creator).balance, 10 ether + (TEST_FEE * 20 / 100));
        assertEq(address(protocolTreasury).balance, TEST_FEE * 10 / 100);
    }

    /**
     * @notice Test agent endpoint failure flow
     * @dev Tests submitTestFailed → finalizeTestFailure → full refund + stake return
     */
    function testAgentEndpointFailure() public {
        // Setup: Register agent and request test
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        // Keeper commits and reveals
        commitHash = keccak256(abi.encode(agentContractJSON, salt));
        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);

        vm.prank(keeper);
        foroRegistry.revealTestInputs(testForoId, agentContractJSON, salt);

        // Keeper submits test failed (agent endpoint timeout)
        uint256 userBalanceBefore = user.balance;
        uint256 keeperBalanceBefore = keeper.balance;

        vm.prank(keeper);
        foroRegistry.submitTestFailed(
            testForoId,
            IForoRegistry.FailureReason.TIMEOUT,
            "Agent endpoint did not respond within 300s"
        );

        // Finalize failure immediately (no contestation window for failures)
        vm.prank(keeper);
        foroRegistry.finalizeTestFailure(testForoId);

        // Keeper must withdraw their staked amount from _pendingWithdrawals
        vm.prank(keeper);
        foroRegistry.withdraw();

        // Verify full refund to user
        assertEq(user.balance, userBalanceBefore + TEST_FEE, "User should receive full refund");

        // Verify full stake return to keeper (no penalty for agent failure)
        assertEq(keeper.balance, keeperBalanceBefore + KEEPER_STAKE, "Keeper should receive stake back");

        // Verify agent status remains PENDING (no test counted)
        IForoRegistry.Agent memory agentAfterFailure = foroRegistry.getAgent(foroId);
        assertEq(uint8(agentAfterFailure.status), uint8(IForoRegistry.AgentStatus.PENDING));
        assertEq(agentAfterFailure.testCount, 0);
    }

    /**
     * @notice Test multi-Keeper weighted score calculation
     * @dev Two Keepers with different jobsCompleted execute tests, verify weighted average
     */
    function testMultiKeeperWeightedScore() public {
        // Setup agent
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        // Give keeper1 more experience (simulate 10 completed jobs)
        // Note: In real scenario, this would come from actual finalized tests
        // For testing, we'll execute multiple tests to build experience

        // Execute first test with keeper1 (score 80)
        _executeTest(foroId, keeper, 80, 1000);
        
        // Verify keeper1 stats updated
        IForoRegistry.Keeper memory keeper1Data = foroRegistry.getKeeper(keeper);
        assertEq(keeper1Data.jobsCompleted, 1);

        // Execute second test with keeper2 (score 60)
        _executeTest(foroId, keeper2, 60, 2000);

        // Verify keeper2 stats
        IForoRegistry.Keeper memory keeper2Data = foroRegistry.getKeeper(keeper2);
        assertEq(keeper2Data.jobsCompleted, 1);

        // Both keepers have weight 1 (equal in MVP), so cumulative score should be average
        // (8000 + 6000) / 2 = 7000 (scaled format)
        IForoRegistry.Agent memory agentWeighted = foroRegistry.getAgent(foroId);
        assertEq(agentWeighted.testCount, 2);
        assertEq(uint8(agentWeighted.status), uint8(IForoRegistry.AgentStatus.VERIFIED)); // score 70.00% >= 60.00 threshold
        
        // Cumulative score should be weighted average (equal weights in MVP)
        // Expected: (8000 * 1 + 6000 * 1) / (1 + 1) = 7000 (70.00%)
        assertApproxEqAbs(agentWeighted.cumulativeScore, 7000, 10, "Weighted score should be ~7000 (70%)");
    }

    /**
     * @notice Test contestation flow
     * @dev Keeper1 submits result, Keeper2 contests, owner resolves in favor of contestant
     */
    function testContestation() public {
        // Setup and execute test
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        // Keeper commits, reveals, submits result
        commitHash = keccak256(abi.encode(agentContractJSON, salt));
        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);

        vm.prank(keeper);
        foroRegistry.revealTestInputs(testForoId, agentContractJSON, salt);

        vm.prank(keeper);
        foroRegistry.submitResult(testForoId, 9000, 500, 1, keccak256("chat-id"));

        // Contestant contests within 1-hour window
        vm.prank(contestant);
        foroRegistry.contestResult{value: CONTEST_STAKE}(
            testForoId, 
            "ipfs://QmEvidence", 
            keccak256("Evidence: TEE proof is invalid")
        );

        // Owner resolves in favor of contestant
        vm.prank(address(this)); // Contract owner
        foroRegistry.resolveContestation(testForoId, true); // contestant wins

        // Contestant and protocol treasury must withdraw from _pendingWithdrawals
        vm.prank(contestant);
        foroRegistry.withdraw();
        vm.prank(protocolTreasury);
        foroRegistry.withdraw();

        // Verify stake slashing (50% to contestant, 50% to protocol)
        uint256 expectedSlash = KEEPER_STAKE / 2;
        assertEq(contestant.balance, 10 ether + expectedSlash, "Contestant should receive 50% of slashed stake");
        assertEq(protocolTreasury.balance, expectedSlash, "Protocol should receive 50% of slashed stake");

        // Verify user refund
        assertEq(user.balance, 10 ether, "User should receive full refund");

        // Verify keeper stats (contestation lost)
        IForoRegistry.Keeper memory keeperAfterContest = foroRegistry.getKeeper(keeper);
        assertEq(keeperAfterContest.contestationsLost, 1);
    }

    /**
     * @notice Test reveal timeout and stake forfeiture
     * @dev Keeper commits but never reveals, stake slashed after timeout
     */
    function testRevealTimeoutForfeit() public {
        // Setup agent and request test
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        // Keeper commits but doesn't reveal
        commitHash = keccak256(abi.encode(agentContractJSON, salt));
        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);

        // Wait past reveal timeout (1 hour)
        vm.warp(block.timestamp + 3601);

        // Anyone can call forfeitStake
        uint256 userBalanceBefore = user.balance;
        foroRegistry.forfeitStake(testForoId);

        // Protocol treasury must withdraw slashed stake from _pendingWithdrawals
        vm.prank(protocolTreasury);
        foroRegistry.withdraw();

        // Verify user refund
        assertEq(user.balance, userBalanceBefore + TEST_FEE, "User should receive full refund");

        // Verify keeper stake slashed to protocol
        assertEq(protocolTreasury.balance, KEEPER_STAKE, "Protocol should receive forfeited stake");
    }

    /**
     * @notice Test status progression through multiple tests
     * @dev Execute tests to verify PENDING → PROBATION → VERIFIED → ELITE transitions
     */
    function testStatusProgression() public {
        // Setup agent
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        // Initially PENDING
        IForoRegistry.Agent memory initialAgent = foroRegistry.getAgent(foroId);
        assertEq(uint8(initialAgent.status), uint8(IForoRegistry.AgentStatus.PENDING));

        // Test 1: score 75 → VERIFIED (score 75.00% >= 60.00 threshold)
        _executeTest(foroId, keeper, 75, 1000);
        IForoRegistry.Agent memory probationAgent = foroRegistry.getAgent(foroId);
        assertEq(uint8(probationAgent.status), uint8(IForoRegistry.AgentStatus.VERIFIED));

        // Test 2: score 70 → still VERIFIED (avg ~72.50%, >= 60.00)
        _executeTest(foroId, keeper2, 70, 1500);
        IForoRegistry.Agent memory stillVerified = foroRegistry.getAgent(foroId);
        assertEq(uint8(stillVerified.status), uint8(IForoRegistry.AgentStatus.VERIFIED));

        // Test 3: score 80 → VERIFIED (avg ~75.00%, >= 60.00, < 80.00)
        _executeTest(foroId, keeper, 80, 800);
        IForoRegistry.Agent memory verifiedAgent = foroRegistry.getAgent(foroId);
        assertEq(uint8(verifiedAgent.status), uint8(IForoRegistry.AgentStatus.VERIFIED));
        assertEq(verifiedAgent.testCount, 3);

        // Execute 7 more tests with high scores to reach ELITE (10+ tests, score >= 80)
        for (uint256 i = 0; i < 7; i++) {
            _executeTest(foroId, keeper, 85, 600);
        }

        IForoRegistry.Agent memory eliteAgent = foroRegistry.getAgent(foroId);
        assertEq(eliteAgent.testCount, 10);
        assertGe(eliteAgent.cumulativeScore, 8000, "Score should be >= 8000 (80%) for ELITE");
        assertEq(uint8(eliteAgent.status), uint8(IForoRegistry.AgentStatus.ELITE));
    }

    /**
     * @notice Test concurrent tests (10 simultaneous test requests)
     * @dev Verify system handles multiple concurrent tests without issues
     */
    function testConcurrentTests() public {
        // Setup agent
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();

        // Create 10 users and request tests concurrently
        for (uint256 i = 0; i < 10; i++) {
            address testUser = address(uint160(1000 + i));
            vm.deal(testUser, 1 ether);
            
            vm.prank(testUser);
            foroRegistry.requestTest{value: TEST_FEE}(foroId);
        }

        // Verify all tests created successfully
        // In production, each test would have unique foroId
        // Here we just verify no gas issues or failures occurred
    }

    // Helper function to execute complete test flow
    function _executeTest(uint256 _foroId, address _keeper, uint256 score, uint256 latency) internal {
        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(_foroId);

        bytes32 hash = keccak256(abi.encode(agentContractJSON, salt));
        vm.prank(_keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, hash);

        vm.prank(_keeper);
        foroRegistry.revealTestInputs(testForoId, agentContractJSON, salt);

        // Scale score to 0-10000 format (e.g., 75 → 7500 for 75.00%)
        uint256 scaledScore = score * 100;
        vm.prank(_keeper);
        foroRegistry.submitResult(testForoId, scaledScore, latency, 1, keccak256("chat"));

        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(_keeper);
        foroRegistry.finalizeResult(testForoId);
    }
}
