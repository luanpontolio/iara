// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IForoRegistry} from "./interfaces/IForoRegistry.sol";
import {IERC8004} from "./interfaces/IERC8004.sol";
import {IAgentVault} from "./interfaces/IAgentVault.sol";

/**
 * @title ForoRegistry
 * @notice Main registry for Foro agent verification protocol
 * @dev Handles agent registration, test orchestration, Keeper management, and contestation
 */
contract ForoRegistry is IForoRegistry, Ownable, ReentrancyGuard {
    uint256 private _nextAgentId = 1;
    uint256 private _nextJobId = 1;
    uint256 private _nextContestationId = 1;
    
    mapping(uint256 => Agent) private _agents;
    mapping(uint256 => TestJob) private _testJobs;
    mapping(uint256 => TestResult) private _testResults;
    mapping(bytes32 => bool) private _registeredAgents;
    mapping(uint256 => Contestation[]) private _contestations; // jobId => Contestations
    mapping(address => Keeper) private _keepers;
    mapping(address => uint256) private _pendingWithdrawals;
    mapping(uint256 => uint256) private _latestJobIdForAgent; // agentId => latest jobId
    
    IAgentVault public immutable agentVault;
    
    // Constants
    uint256 public constant MIN_TEST_FEE = 0.001 ether;
    uint256 public constant REVEAL_TIMEOUT = 1 hours;
    uint256 public constant CONTESTATION_WINDOW = 1 hours;
    uint256 public constant MIN_KEEPER_STAKE = 0.01 ether;
    
    constructor(address agentVault_) Ownable(msg.sender) {
        require(agentVault_ != address(0), "Invalid vault address");
        agentVault = IAgentVault(agentVault_);
    }
    
    // ============================================
    // Agent Registration (User Story 1)
    // ============================================
    
    /**
     * @notice Register an agent by linking to an ERC-8004 token
     * @dev Reads metadata from ERC-8004, computes contractHash, validates ownership
     * @param erc8004Address Address of the ERC-8004 contract
     * @param erc8004AgentId Token ID of the agent in the ERC-8004 contract
     * @return foroId The unique Foro ID assigned to this agent
     */
    function registerAgent(
        address erc8004Address,
        uint256 erc8004AgentId
    ) external returns (uint256 foroId) {
        IERC8004 erc8004 = IERC8004(erc8004Address);
        
        // Validate: Caller must be the owner of the ERC-8004 token
        address tokenOwner = erc8004.ownerOf(erc8004AgentId);
        require(tokenOwner == msg.sender, "Caller is not the agent owner");
        
        // Read Agent Contract metadata from ERC-8004
        bytes memory metadataBytes = erc8004.getMetadata(erc8004AgentId, "foro:contract");
        
        // Validate: Metadata must exist and not be empty
        if (metadataBytes.length == 0) {
            revert("Agent Contract metadata not found");
        }
        
        // Validate: Metadata must be valid JSON
        require(_isValidJSON(metadataBytes), "Agent Contract metadata is invalid");
        
        // Compute contractHash (immutable fingerprint of the Agent Contract)
        bytes32 contractHash = keccak256(metadataBytes);
        
        // Check for duplicate registration using composite key
        bytes32 registrationKey = keccak256(abi.encodePacked(erc8004Address, erc8004AgentId));
        require(!_registeredAgents[registrationKey], "Agent already registered");
        
        // Mark as registered
        _registeredAgents[registrationKey] = true;
        
        // Assign foroId and store Agent entity
        foroId = _nextAgentId++;
        
        _agents[foroId] = Agent({
            foroId: foroId,
            erc8004Address: erc8004Address,
            erc8004AgentId: erc8004AgentId,
            contractHash: contractHash,
            creatorWallet: msg.sender,
            status: AgentStatus.PENDING,
            testCount: 0,
            cumulativeScore: 0,
            registrationTimestamp: block.timestamp
        });
        
        emit AgentRegistered(foroId, erc8004Address, erc8004AgentId, contractHash, msg.sender);
    }
    
    /**
     * @notice Get agent details by foroId
     * @param foroId The Foro ID of the agent
     * @return agent The Agent struct
     */
    function getAgent(uint256 foroId) external view returns (Agent memory agent) {
        require(foroId > 0 && foroId < _nextAgentId, "Invalid agentId");
        return _agents[foroId];
    }
    
    /**
     * @notice Get the current status of an agent
     * @param foroId The Foro ID of the agent
     * @return status The current AgentStatus
     */
    function getAgentStatus(uint256 foroId) external view returns (AgentStatus status) {
        require(foroId > 0 && foroId < _nextAgentId, "Invalid agentId");
        return _agents[foroId].status;
    }
    
    // ============================================
    // Test Request & Orchestration (User Story 2)
    // ============================================
    
    /**
     * @notice Request a test for an agent
     * @param agentId The Foro ID of the agent to test
     * @return foroId The unique ID for this test job
     */
    function requestTest(uint256 agentId) external payable returns (uint256 foroId) {
        require(agentId > 0 && agentId < _nextAgentId, "Invalid agentId");
        require(msg.value >= MIN_TEST_FEE, "Insufficient test fee");
        
        Agent storage agent = _agents[agentId];
        require(agent.foroId != 0, "Agent not found");
        
        // Assign a job ID from the separate job counter
        foroId = _nextJobId++;
        
        // Record the latest job ID for this agent
        _latestJobIdForAgent[agentId] = foroId;
        
        // Create test job
        _testJobs[foroId] = TestJob({
            foroId: foroId,
            agentId: agentId,
            requester: msg.sender,
            testFee: msg.value,
            keeperAddress: address(0),
            keeperStake: 0,
            commitHash: bytes32(0),
            commitTimestamp: 0,
            revealTimestamp: 0,
            status: JobStatus.REQUESTED,
            contestationDeadline: 0
        });
        
        // Deposit fee in vault
        agentVault.deposit{value: msg.value}(foroId, msg.sender);
        
        emit TestRequested(foroId, agentId, msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @notice Keeper claims a test job with commit hash and stake
     * @param foroId The test job ID
     * @param inputsHash The keccak256(testCasesJSON, salt) commitment
     */
    function claimJob(uint256 foroId, bytes32 inputsHash) external payable {
        TestJob storage job = _testJobs[foroId];
        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.REQUESTED, "Job not available");
        require(inputsHash != bytes32(0), "Invalid commit hash");
        
        uint256 requiredStake = job.testFee * 2;
        require(msg.value >= requiredStake, "Insufficient stake");
        
        // Update job with keeper details
        job.keeperAddress = msg.sender;
        job.keeperStake = msg.value;
        job.commitHash = inputsHash;
        job.commitTimestamp = block.timestamp;
        job.status = JobStatus.COMMITTED;
        
        emit JobClaimed(foroId, msg.sender, inputsHash, msg.value);
    }
    
    /**
     * @notice Keeper reveals test inputs after execution
     * @param foroId The test job ID
     * @param testCasesJSON The test cases JSON string
     * @param salt The random salt used in commitment
     */
    function revealTestInputs(
        uint256 foroId,
        string calldata testCasesJSON,
        bytes32 salt
    ) external {
        TestJob storage job = _testJobs[foroId];
        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.COMMITTED, "Job not committed");
        require(msg.sender == job.keeperAddress, "Not the assigned keeper");
        
        // Verify commit-reveal hash
        bytes32 revealedHash = keccak256(abi.encode(testCasesJSON, salt));
        require(revealedHash == job.commitHash, "Hash mismatch");
        
        // Update job status
        job.revealTimestamp = block.timestamp;
        job.status = JobStatus.REVEALED;
        
        emit TestInputsRevealed(foroId, salt);
    }
    
    /**
     * @notice Keeper submits test result with TEE proof
     * @param foroId The test job ID
     * @param score The composite score (0-10000, representing 0.00-100.00)
     * @param latency Average latency in milliseconds
     * @param rounds Number of test cases executed
     * @param chatId The 0G Compute chatId (TEE proof)
     */
    function submitResult(
        uint256 foroId,
        uint256 score,
        uint256 latency,
        uint256 rounds,
        bytes32 chatId
    ) external {
        TestJob storage job = _testJobs[foroId];
        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.REVEALED, "Job not revealed");
        require(msg.sender == job.keeperAddress, "Not the assigned keeper");
        
        // Determine TEE verification status
        bool teeVerified = chatId != bytes32(0) && rounds > 0;
        
        // Force score to 0 if TEE not verified
        uint256 finalScore = teeVerified ? score : 0;
        
        // Store result
        _testResults[foroId] = TestResult({
            foroId: foroId,
            score: finalScore,
            latencyScore: 0, // Calculated separately if needed
            qualityScore: 0, // Calculated separately if needed
            avgLatencyMs: latency,
            rounds: rounds,
            chatId: chatId,
            teeProof: new bytes(0), // Simplified for MVP
            teeVerified: teeVerified,
            submissionTimestamp: block.timestamp,
            finalized: false
        });
        
        // Update job status and set contestation deadline
        job.status = JobStatus.SUBMITTED;
        job.contestationDeadline = block.timestamp + CONTESTATION_WINDOW;
        
        emit ResultSubmitted(foroId, finalScore, latency, chatId, teeVerified);
    }
    
    /**
     * @notice Finalize result after contestation window expires
     * @param foroId The test job ID
     */
    function finalizeResult(uint256 foroId) external nonReentrant {
        TestJob storage job = _testJobs[foroId];
        TestResult storage result = _testResults[foroId];

        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.SUBMITTED, "Job not submitted");
        require(!result.finalized, "Already finalized");

        // Check for unresolved contestations
        if (_contestations[foroId].length > 0) {
            Contestation storage lastContestation = _contestations[foroId][_contestations[foroId].length - 1];
            require(lastContestation.resolved, "Contestation not resolved");
        }

        // Update all state first
        result.finalized = true;
        job.status = JobStatus.FINALIZED;

        // Update agent stats
        Agent storage agent = _agents[job.agentId];
        
        _updateCumulativeScore(job.agentId, result.score, job.keeperAddress);
        agent.testCount += 1;
        _updateAgentStatus(job.agentId);

        // Add stake to keeper's pending withdrawals
        if (job.keeperStake > 0) {
            _pendingWithdrawals[job.keeperAddress] += job.keeperStake;
        }

        // Distribute fees via vault
        agentVault.distributePass(foroId, agent.creatorWallet, job.keeperAddress);
        
        // Update Keeper stats
        Keeper storage keeper = _keepers[job.keeperAddress];
        if (keeper.keeperAddress != address(0)) {
            keeper.jobsCompleted += 1;
            keeper.totalEarned += (job.testFee * 70) / 100; // 70% of fee
        }

        emit ResultFinalized(foroId, job.agentId, agent.cumulativeScore, agent.status);
    }

    /**
     * @notice Forfeit keeper stake if reveal timeout exceeded
     * @param foroId The test job ID
     */
    function forfeitStake(uint256 foroId) external nonReentrant {
        TestJob storage job = _testJobs[foroId];

        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.COMMITTED, "Job not in committed state");
        require(block.timestamp > job.commitTimestamp + REVEAL_TIMEOUT, "Timeout not reached");

        // Update state first
        job.status = JobStatus.REFUNDED;

        // Add slashed stake to protocol treasury's pending withdrawals
        if (job.keeperStake > 0) {
            address protocolTreasury = agentVault.protocolTreasury();
            _pendingWithdrawals[protocolTreasury] += job.keeperStake;
        }

        // Refund test fee to requester via vault
        agentVault.distributeFail(foroId, job.requester);
    }

    /**
     * @notice Keeper submits test failure when agent endpoint or TEE fails
     * @param foroId The test job ID
     * @param failureReason The reason for failure
     * @param errorDetails Additional error information
     */
    function submitTestFailed(
        uint256 foroId,
        FailureReason failureReason,
        string calldata errorDetails
    ) external {
        TestJob storage job = _testJobs[foroId];
        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.REVEALED, "Job not revealed");
        require(msg.sender == job.keeperAddress, "Not the assigned keeper");
        
        // Store failed result with reason
        _testResults[foroId] = TestResult({
            foroId: foroId,
            score: 0,
            latencyScore: 0,
            qualityScore: 0,
            avgLatencyMs: 0,
            rounds: 0,
            chatId: bytes32(0),
            teeProof: new bytes(0),
            teeVerified: false,
            submissionTimestamp: block.timestamp,
            finalized: false
        });
        
        // Update job status to FAILED
        job.status = JobStatus.FAILED;
        
        emit TestFailed(foroId, failureReason, errorDetails);
    }

    /**
     * @notice Finalize failed test immediately with full refund and stake return
     * @param foroId The test job ID
     */
    function finalizeTestFailure(uint256 foroId) external nonReentrant {
        TestJob storage job = _testJobs[foroId];
        TestResult storage result = _testResults[foroId];

        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.FAILED, "Job not in failed state");
        require(!result.finalized, "Already finalized");

        // Update all state first
        result.finalized = true;
        job.status = JobStatus.FINALIZED;

        // Add stake to keeper's pending withdrawals (no penalty for agent failure)
        if (job.keeperStake > 0) {
            _pendingWithdrawals[job.keeperAddress] += job.keeperStake;
        }

        // Refund full test fee to user via vault
        agentVault.distributeFail(foroId, job.requester);

        emit TestFailureFinalized(foroId, job.requester, job.testFee);
    }

    // ============================================
    // Contestation (User Story 3)
    // ============================================

    /**
     * @notice Contest a submitted result within the contestation window
     * @param foroId The test job ID
     * @param evidenceURI IPFS or HTTP URL to evidence
     * @param evidenceHash keccak256 of evidence for integrity
     */
    function contestResult(
        uint256 foroId,
        string calldata evidenceURI,
        bytes32 evidenceHash
    ) external payable {
        TestJob storage job = _testJobs[foroId];
        TestResult storage result = _testResults[foroId];
        
        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.SUBMITTED, "Job not submitted");
        require(!result.finalized, "Already finalized");
        require(block.timestamp < job.contestationDeadline, "Contestation window expired");
        require(evidenceHash != bytes32(0), "Invalid evidence hash");
        
        // Require 50% of original job stake as contest stake
        uint256 requiredContestStake = job.keeperStake / 2;
        require(msg.value >= requiredContestStake, "Insufficient contest stake");
        
        // Create contestation
        uint256 contestationId = _nextContestationId++;
        
        _contestations[foroId].push(Contestation({
            contestationId: contestationId,
            foroId: foroId,
            contestant: msg.sender,
            contestStake: msg.value,
            evidenceURI: evidenceURI,
            evidenceHash: evidenceHash,
            contestTimestamp: block.timestamp,
            resolved: false,
            contestantWins: false
        }));
        
        // Block finalization until resolved
        job.status = JobStatus.CONTESTED;
        
        emit ResultContested(foroId, msg.sender, msg.value, evidenceURI);
    }
    
    /**
     * @notice Owner resolves a contestation
     * @param foroId The test job ID
     * @param contestantWins True if contestant wins, false if original keeper wins
     */
    function resolveContestation(uint256 foroId, bool contestantWins) external onlyOwner nonReentrant {
        TestJob storage job = _testJobs[foroId];
        TestResult storage result = _testResults[foroId];
        
        require(job.foroId != 0, "Job not found");
        require(job.status == JobStatus.CONTESTED, "Job not contested");
        require(_contestations[foroId].length > 0, "No contestations found");
        
        // Get the latest contestation
        Contestation storage contestation = _contestations[foroId][_contestations[foroId].length - 1];
        require(!contestation.resolved, "Already resolved");
        
        // Mark as resolved first
        contestation.resolved = true;
        contestation.contestantWins = contestantWins;
        
        if (contestantWins) {
            // Update job status
            job.status = JobStatus.REFUNDED;
            
            // Update Keeper stats
            Keeper storage originalKeeper = _keepers[job.keeperAddress];
            if (originalKeeper.keeperAddress != address(0)) {
                originalKeeper.jobsContested += 1;
                originalKeeper.contestationsLost += 1;
            }
            
            Keeper storage contestantKeeper = _keepers[contestation.contestant];
            if (contestantKeeper.keeperAddress != address(0)) {
                contestantKeeper.contestationsWon += 1;
            }
            
            // Contestant wins: Slash original keeper stake (50/50), refund user
            address protocolTreasury = agentVault.protocolTreasury();
            
            // Add 50% of keeper stake + contest stake to contestant's pending withdrawals
            uint256 halfStake = job.keeperStake / 2;
            _pendingWithdrawals[contestation.contestant] += halfStake + contestation.contestStake;
            
            // Add 50% of keeper stake to protocol's pending withdrawals
            _pendingWithdrawals[protocolTreasury] += (job.keeperStake - halfStake);
            
            // Refund test fee to user via vault
            agentVault.distributeFail(foroId, job.requester);
        } else {
            // Update job status
            job.status = JobStatus.FINALIZED;
            result.finalized = true;
            
            // Update agent stats
            Agent storage agent = _agents[job.agentId];
            _updateCumulativeScore(job.agentId, result.score, job.keeperAddress);
            agent.testCount += 1;
            _updateAgentStatus(job.agentId);
            
            // Update Keeper stats
            Keeper storage originalKeeper = _keepers[job.keeperAddress];
            if (originalKeeper.keeperAddress != address(0)) {
                originalKeeper.jobsCompleted += 1;
                originalKeeper.jobsContested += 1;
                originalKeeper.totalEarned += (job.testFee * 70) / 100;
            }
            
            // Contestant loses: Contest stake to protocol, original keeper gets stake + fee
            address protocolTreasury = agentVault.protocolTreasury();
            
            // Add contest stake to protocol's pending withdrawals
            _pendingWithdrawals[protocolTreasury] += contestation.contestStake;
            
            // Add stake to keeper's pending withdrawals
            _pendingWithdrawals[job.keeperAddress] += job.keeperStake;
            
            // Distribute fee normally via vault
            agentVault.distributePass(foroId, agent.creatorWallet, job.keeperAddress);
        }
        
        emit ContestationResolved(foroId, contestantWins);
    }
    
    // ============================================
    // View Functions
    // ============================================
    
    function getTestJob(uint256 jobId) external view returns (TestJob memory job) {
        require(jobId > 0 && jobId < _nextJobId, "Invalid jobId");
        return _testJobs[jobId];
    }
    
    function getTestResult(uint256 jobId) external view returns (TestResult memory result) {
        require(jobId > 0 && jobId < _nextJobId, "Invalid jobId");
        return _testResults[jobId];
    }
    
    function getLeaderboard(string calldata category) external view returns (uint256[] memory foroIds) {
        // TODO: Implement leaderboard query logic
        // For now, return empty array
        return new uint256[](0);
    }
    
    function getContestations(uint256 jobId) external view returns (Contestation[] memory contestations) {
        require(jobId > 0 && jobId < _nextJobId, "Invalid jobId");
        return _contestations[jobId];
    }
    
    /**
     * @notice Get the latest test job ID for a given agent
     * @param agentId The Foro ID of the agent
     * @return jobId The latest test job ID, or 0 if no test has been requested
     */
    function getLatestTestJobId(uint256 agentId) external view returns (uint256 jobId) {
        require(agentId > 0 && agentId < _nextAgentId, "Invalid agentId");
        return _latestJobIdForAgent[agentId];
    }
    
    function getAllTestJobs() external view returns (TestJob[] memory jobs) {
        uint256 count = 0;
        for (uint256 i = 1; i < _nextJobId; i++) {
            if (_testJobs[i].foroId != 0) {
                count++;
            }
        }
        
        jobs = new TestJob[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < _nextJobId; i++) {
            if (_testJobs[i].foroId != 0) {
                jobs[index] = _testJobs[i];
                index++;
            }
        }
    }
    
    // ============================================
    // Keeper Management (User Story 4)
    // ============================================
    
    /**
     * @notice Register as a Keeper with minimum stake
     */
    function registerKeeper() external payable {
        require(msg.value >= MIN_KEEPER_STAKE, "Insufficient stake");
        require(_keepers[msg.sender].keeperAddress == address(0), "Already registered");
        
        _keepers[msg.sender] = Keeper({
            keeperAddress: msg.sender,
            stakedAmount: msg.value,
            jobsCompleted: 0,
            jobsContested: 0,
            contestationsWon: 0,
            contestationsLost: 0,
            totalEarned: 0,
            active: true,
            registrationTimestamp: block.timestamp
        });
        
        emit KeeperRegistered(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @notice Get Keeper weight for score weighting
     * @param keeper Keeper address
     * @return weight Keeper weight (1 + experience + stake bonus)
     */
    function getKeeperWeight(address keeper) external view returns (uint256 weight) {
        Keeper storage k = _keepers[keeper];
        if (k.keeperAddress == address(0)) return 1; // Default weight for unregistered
        
        uint256 baseWeight = 1;
        uint256 experienceBonus = k.jobsCompleted / 10;
        uint256 stakeBonus = (k.stakedAmount / MIN_KEEPER_STAKE) - 1;
        
        return baseWeight + experienceBonus + stakeBonus;
    }
    
    /**
     * @notice Get Keeper details
     * @param keeper Keeper address
     * @return Keeper struct
     */
    function getKeeper(address keeper) external view returns (Keeper memory) {
        return _keepers[keeper];
    }
    
    // ============================================
    // Withdrawal Functions
    // ============================================
    
    /**
     * @notice Withdraw pending funds
     * @dev Uses pull pattern for secure fund distribution
     */
    function withdraw() external nonReentrant {
        uint256 amount = _pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        // Update state before transfer (checks-effects-interactions)
        _pendingWithdrawals[msg.sender] = 0;
        
        // Transfer funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @notice Get pending withdrawal amount for an address
     * @param account The address to check
     * @return amount The pending withdrawal amount
     */
    function getPendingWithdrawal(address account) external view returns (uint256 amount) {
        return _pendingWithdrawals[account];
    }
    
    // ============================================
    // Internal Helpers
    // ============================================
    
    /**
     * @dev Validate that metadata is non-empty JSON
     * @param data The metadata bytes to validate
     * @return valid True if data is valid
     */
    function _isValidJSON(bytes memory data) private pure returns (bool valid) {
        if (data.length == 0) return false;
        
        // Basic validation: Check if it starts with '{' or '['
        // A more robust JSON parser could be added in production
        bytes1 firstByte = data[0];
        return (firstByte == 0x7b || firstByte == 0x5b); // '{' or '['
    }
    
    /**
     * @dev Update agent status based on cumulative score (single-keeper model)
     * @param foroId The Foro ID of the agent
     */
    function _updateAgentStatus(uint256 foroId) internal {
        Agent storage agent = _agents[foroId];

        if (agent.testCount == 0) {
            agent.status = AgentStatus.PENDING;
            return;
        }

        uint256 score = agent.cumulativeScore;
        AgentStatus newStatus;

        if (score >= 8000) {          // >= 80.00
            newStatus = AgentStatus.ELITE;
        } else if (score >= 6000) {   // >= 60.00
            newStatus = AgentStatus.VERIFIED;
        } else if (score >= 4000) {   // >= 40.00
            newStatus = AgentStatus.PROBATION;
        } else {                      // < 40.00
            newStatus = AgentStatus.FAILED;
        }

        agent.status = newStatus;
    }
    
    /**
     * @dev Update cumulative score using weighted average based on Keeper reputation
     * @param agentId The agent's Foro ID
     * @param newScore The new score from the latest test
     * @param keeperAddress The address of the keeper who executed this test
     */
    function _updateCumulativeScore(uint256 agentId, uint256 newScore, address keeperAddress) internal {
        Agent storage agent = _agents[agentId];
        
        if (agent.testCount == 0) {
            // First test, set score directly
            agent.cumulativeScore = newScore;
        } else {
            // Get Keeper weight
            uint256 keeperWeight = this.getKeeperWeight(keeperAddress);
            
            // Weighted average: (oldScore * oldWeight + newScore * newWeight) / totalWeight
            uint256 oldWeight = agent.testCount;
            uint256 totalScore = (agent.cumulativeScore * oldWeight) + (newScore * keeperWeight);
            agent.cumulativeScore = totalScore / (oldWeight + keeperWeight);
        }
    }
    
    /**
     * @dev Calculate latency score component (0-10000)
     * @param avgLatencyMs Average latency in milliseconds
     * @return score Latency score (100 at 500ms, 0 at 3000ms, linear interpolation)
     */
    function _calculateLatencyScore(uint256 avgLatencyMs) internal pure returns (uint256 score) {
        if (avgLatencyMs <= 500) {
            return 10000; // 100.00%
        }
        if (avgLatencyMs >= 3000) {
            return 0;
        }
        
        // Linear interpolation: score = 100 - ((latency - 500) / 2500) * 100
        // Scaled to 10000 basis points
        uint256 excess = avgLatencyMs - 500;
        uint256 range = 2500; // 3000 - 500
        
        // score = 10000 - (excess * 10000 / range)
        return 10000 - ((excess * 10000) / range);
    }
    
    /**
     * @dev Calculate composite score from latency and quality (30/70 formula)
     * @param latencyScore Latency component (0-10000)
     * @param qualityScore Quality component (0-10000)
     * @return score Composite score (0-10000)
     */
    function _calculateCompositeScore(
        uint256 latencyScore,
        uint256 qualityScore
    ) internal pure returns (uint256 score) {
        // Composite = (latencyScore * 30%) + (qualityScore * 70%)
        return ((latencyScore * 30) + (qualityScore * 70)) / 100;
    }
}
