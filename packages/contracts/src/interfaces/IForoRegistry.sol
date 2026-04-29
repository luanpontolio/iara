// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IForoRegistry
 * @notice Core registry interface for Foro agent verification protocol
 * @dev Defines agent registration, test requests, and result finalization
 */
interface IForoRegistry {
    enum AgentStatus {
        PENDING,
        PROBATION,
        VERIFIED,
        ELITE,
        FAILED
    }
    
    enum JobStatus {
        REQUESTED,
        COMMITTED,
        REVEALED,
        SUBMITTED,
        CONTESTED,
        FINALIZED,
        REFUNDED
    }
    
    struct Agent {
        uint256 foroId;
        address erc8004Address;
        uint256 erc8004AgentId;
        bytes32 contractHash;
        address creatorWallet;
        AgentStatus status;
        uint256 testCount;
        uint256 cumulativeScore;
        uint256 registrationTimestamp;
    }
    
    struct TestJob {
        uint256 foroId;
        uint256 agentId;
        address requester;
        uint256 testFee;
        address keeperAddress;
        uint256 keeperStake;
        bytes32 commitHash;
        uint256 commitTimestamp;
        uint256 revealTimestamp;
        JobStatus status;
        uint256 contestationDeadline;
    }
    
    struct TestResult {
        uint256 foroId;
        uint256 score;
        uint256 latencyScore;
        uint256 qualityScore;
        uint256 avgLatencyMs;
        uint256 rounds;
        bytes32 chatId;
        bytes teeProof;
        bool teeVerified;
        uint256 submissionTimestamp;
        bool finalized;
    }
    
    event AgentRegistered(
        uint256 indexed foroId,
        address indexed erc8004Address,
        uint256 erc8004AgentId,
        bytes32 contractHash,
        address creatorWallet
    );
    
    event TestRequested(
        uint256 indexed foroId,
        uint256 indexed agentId,
        address requester,
        uint256 fee,
        uint256 timestamp
    );
    
    event JobClaimed(
        uint256 indexed foroId,
        address indexed keeper,
        bytes32 commitHash,
        uint256 stake
    );
    
    event TestInputsRevealed(
        uint256 indexed foroId,
        bytes32 salt
    );
    
    event ResultSubmitted(
        uint256 indexed foroId,
        uint256 score,
        uint256 avgLatencyMs,
        bytes32 chatId,
        bool teeVerified
    );
    
    event ResultFinalized(
        uint256 indexed foroId,
        uint256 indexed agentId,
        uint256 newScore,
        AgentStatus newStatus
    );
    
    event ResultContested(
        uint256 indexed foroId,
        address indexed contestant,
        uint256 contestStake,
        string evidenceURI
    );
    
    event ContestationResolved(
        uint256 indexed foroId,
        bool contestantWins
    );
    
    function registerAgent(
        address erc8004Address,
        uint256 erc8004AgentId
    ) external returns (uint256 foroId);
    
    function requestTest(uint256 agentId) external payable returns (uint256 foroId);
    
    function claimJob(uint256 foroId, bytes32 inputsHash) external payable;
    
    function revealTestInputs(
        uint256 foroId,
        string calldata testCasesJSON,
        bytes32 salt
    ) external;
    
    function submitResult(
        uint256 foroId,
        uint256 score,
        uint256 latency,
        uint256 rounds,
        bytes32 chatId
    ) external;
    
    function finalizeResult(uint256 foroId) external;
    
    function contestResult(
        uint256 foroId,
        string calldata evidenceURI,
        bytes32 evidenceHash
    ) external payable;
    
    function resolveContestation(uint256 foroId, bool contestantWins) external;
    
    function forfeitStake(uint256 foroId) external;
    
    function getAgent(uint256 foroId) external view returns (Agent memory agent);
    
    function getTestJob(uint256 foroId) external view returns (TestJob memory job);
    
    function getTestResult(uint256 foroId) external view returns (TestResult memory result);
    
    function getLeaderboard(string calldata category) external view returns (uint256[] memory foroIds);
}
