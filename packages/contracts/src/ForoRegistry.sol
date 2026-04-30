// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IForoRegistry} from "./interfaces/IForoRegistry.sol";
import {IERC8004} from "./interfaces/IERC8004.sol";

/**
 * @title ForoRegistry
 * @notice Main registry for Foro agent verification protocol
 * @dev Handles agent registration, test orchestration, Keeper management, and contestation
 */
contract ForoRegistry is IForoRegistry, Ownable, ReentrancyGuard {
    uint256 private _nextForoId = 1;
    
    mapping(uint256 => Agent) private _agents;
    mapping(uint256 => TestJob) private _testJobs;
    mapping(uint256 => TestResult) private _testResults;
    mapping(bytes32 => bool) private _registeredAgents;
    
    constructor() Ownable(msg.sender) {}
    
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
        foroId = _nextForoId++;
        
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
        require(foroId > 0 && foroId < _nextForoId, "Invalid foroId");
        return _agents[foroId];
    }
    
    /**
     * @notice Get the current status of an agent
     * @param foroId The Foro ID of the agent
     * @return status The current AgentStatus
     */
    function getAgentStatus(uint256 foroId) external view returns (AgentStatus status) {
        require(foroId > 0 && foroId < _nextForoId, "Invalid foroId");
        return _agents[foroId].status;
    }
    
    // ============================================
    // Test Request & Orchestration (User Story 2)
    // ============================================
    
    function requestTest(uint256 agentId) external payable returns (uint256 foroId) {
        // TODO: Implement in Phase 4 (US2)
        revert("Not implemented yet");
    }
    
    function claimJob(uint256 foroId, bytes32 inputsHash) external payable {
        // TODO: Implement in Phase 4 (US2)
        revert("Not implemented yet");
    }
    
    function revealTestInputs(
        uint256 foroId,
        string calldata testCasesJSON,
        bytes32 salt
    ) external {
        // TODO: Implement in Phase 4 (US2)
        revert("Not implemented yet");
    }
    
    function submitResult(
        uint256 foroId,
        uint256 score,
        uint256 latency,
        uint256 rounds,
        bytes32 chatId
    ) external {
        // TODO: Implement in Phase 4 (US2)
        revert("Not implemented yet");
    }
    
    function finalizeResult(uint256 foroId) external {
        // TODO: Implement in Phase 4 (US2)
        revert("Not implemented yet");
    }
    
    function forfeitStake(uint256 foroId) external {
        // TODO: Implement in Phase 4 (US2)
        revert("Not implemented yet");
    }
    
    // ============================================
    // Contestation (User Story 3)
    // ============================================
    
    function contestResult(
        uint256 foroId,
        string calldata evidenceURI,
        bytes32 evidenceHash
    ) external payable {
        // TODO: Implement in Phase 5 (US3)
        revert("Not implemented yet");
    }
    
    function resolveContestation(uint256 foroId, bool contestantWins) external {
        // TODO: Implement in Phase 5 (US3)
        revert("Not implemented yet");
    }
    
    // ============================================
    // View Functions
    // ============================================
    
    function getTestJob(uint256 foroId) external view returns (TestJob memory job) {
        require(foroId > 0 && foroId < _nextForoId, "Invalid foroId");
        return _testJobs[foroId];
    }
    
    function getTestResult(uint256 foroId) external view returns (TestResult memory result) {
        require(foroId > 0 && foroId < _nextForoId, "Invalid foroId");
        return _testResults[foroId];
    }
    
    function getLeaderboard(string calldata category) external view returns (uint256[] memory foroIds) {
        // TODO: Implement leaderboard query logic
        // For now, return empty array
        return new uint256[](0);
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
     * @dev Update agent status based on test count and cumulative score
     * @param foroId The Foro ID of the agent
     */
    function _updateAgentStatus(uint256 foroId) internal {
        // TODO: Implement in Phase 6 (US4)
        // Status transitions:
        // - PENDING → PROBATION after 1 test
        // - PROBATION → VERIFIED after 3 tests with score >= 60
        // - VERIFIED → ELITE after 10 tests with score >= 80
        // - Any → FAILED with 3+ tests and score < 40
    }
    
    /**
     * @dev Update cumulative score using weighted average
     * @param foroId The Foro ID of the agent
     * @param newScore The new score from the latest test
     */
    function _updateCumulativeScore(uint256 foroId, uint256 newScore) internal {
        // TODO: Implement in Phase 6 (US4)
        // Weighted average formula based on Keeper reputation
    }
}
