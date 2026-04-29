// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IForoRegistry
 * @notice Core registry interface for Foro agent verification protocol
 * @dev Defines agent registration, test requests, and result finalization
 */
interface IForoRegistry {
    // ============ Enums ============
    
    enum AgentStatus {
        PENDING,    // 0 tests
        PROBATION,  // 1-2 tests
        VERIFIED,   // 3+ tests, score >= 60
        ELITE,      // 10+ tests, score >= 80
        FAILED      // 3+ tests, score < 40
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
    
    // ============ Structs ============
    
    struct Agent {
        uint256 foroId;
        address erc8004Address;
        uint256 erc8004AgentId;
        bytes32 contractHash;
        address creatorWallet;
        AgentStatus status;
        uint256 testCount;
        uint256 cumulativeScore; // Scaled to 0-10000 (2 decimal precision)
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
    
    // ============ Events ============
    
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
    
    // ============ Core Functions ============
    
    /**
     * @notice Register an agent by linking to ERC-8004 contract
     * @param erc8004Address Address of the ERC-8004 contract
     * @param erc8004AgentId AgentId in the ERC-8004 contract
     * @dev Reads metadata "foro:contract" and "foro:endpoint", computes contractHash
     * @dev Reverts if metadata not found, already registered, or not owner
     * @return foroId Unique ID in Foro system
     */
    function registerAgent(
        address erc8004Address,
        uint256 erc8004AgentId
    ) external returns (uint256 foroId);
    
    /**
     * @notice Request a test for an agent by paying test fee
     * @param agentId Foro agent ID to test
     * @dev Fee must match category minimum (0.001 ETH for url-summarizer)
     * @dev Emits TestRequested event for Keepers to claim
     * @return foroId Unique test job ID
     */
    function requestTest(uint256 agentId) external payable returns (uint256 foroId);
    
    /**
     * @notice Claim a test job by committing input hash and staking
     * @param foroId Test job ID
     * @param inputsHash keccak256(testCases + salt)
     * @dev Stake must be 2x test fee
     * @dev Reverts if already claimed or stake insufficient
     */
    function claimJob(uint256 foroId, bytes32 inputsHash) external payable;
    
    /**
     * @notice Reveal test inputs after execution
     * @param foroId Test job ID
     * @param testCasesJSON Agent Contract test cases as JSON string
     * @param salt Salt used in commit hash
     * @dev Verifies keccak256(testCasesJSON + salt) matches commitHash
     * @dev Verifies testCasesJSON derives to stored contractHash
     */
    function revealTestInputs(
        uint256 foroId,
        string calldata testCasesJSON,
        bytes32 salt
    ) external;
    
    /**
     * @notice Submit test result after execution and TEE verification
     * @param foroId Test job ID
     * @param score Composite score 0-10000
     * @param latency Average latency in milliseconds
     * @param rounds Number of test cases executed (0 if teeVerified = false)
     * @param chatId 0G Compute chatId as proof
     * @dev Starts 1-hour contestation window
     */
    function submitResult(
        uint256 foroId,
        uint256 score,
        uint256 latency,
        uint256 rounds,
        bytes32 chatId
    ) external;
    
    /**
     * @notice Finalize test result after contestation window expires
     * @param foroId Test job ID
     * @dev Returns stake to Keeper, distributes fee via AgentVault
     * @dev Updates agent cumulative score and status
     * @dev Reverts if contestation window not expired or contested
     */
    function finalizeResult(uint256 foroId) external;
    
    /**
     * @notice Contest a submitted result within 1-hour window
     * @param foroId Test job ID
     * @param evidenceURI IPFS or HTTP URL to evidence
     * @param evidenceHash keccak256 of evidence for integrity
     * @dev Stake must be 50% of job stake
     * @dev Blocks finalization until owner resolves
     */
    function contestResult(
        uint256 foroId,
        string calldata evidenceURI,
        bytes32 evidenceHash
    ) external payable;
    
    /**
     * @notice Resolve contestation (owner only in MVP)
     * @param foroId Test job ID
     * @param contestantWins True if contestant wins, false if original Keeper wins
     * @dev If true: slash job stake, refund test fee
     * @dev If false: slash contest stake, Keeper receives normally
     */
    function resolveContestation(uint256 foroId, bool contestantWins) external;
    
    /**
     * @notice Forfeit Keeper stake after reveal timeout
     * @param foroId Test job ID
     * @dev Callable by anyone after 24 hours from commit without reveal
     * @dev Slashes Keeper stake, refunds test fee to requester
     */
    function forfeitStake(uint256 foroId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get agent details
     * @param foroId Foro agent ID
     * @return agent Agent struct
     */
    function getAgent(uint256 foroId) external view returns (Agent memory agent);
    
    /**
     * @notice Get test job details
     * @param foroId Test job ID
     * @return job TestJob struct
     */
    function getTestJob(uint256 foroId) external view returns (TestJob memory job);
    
    /**
     * @notice Get test result details
     * @param foroId Test job ID
     * @return result TestResult struct
     */
    function getTestResult(uint256 foroId) external view returns (TestResult memory result);
    
    /**
     * @notice Get leaderboard for a category
     * @param category Category name (e.g., "url-summarizer")
     * @return foroIds Array of agent IDs sorted by score * log(testCount)
     */
    function getLeaderboard(string calldata category) external view returns (uint256[] memory foroIds);
}
