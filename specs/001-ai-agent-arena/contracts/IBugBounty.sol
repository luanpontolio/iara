// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBugBounty
 * @notice Bug bounty interface for Foro agents
 * @dev Allows creators to incentivize bug discovery by Keepers
 */
interface IBugBounty {
    // ============ Enums ============
    
    enum BountyStatus {
        OPEN,
        RESOLVED,
        EXPIRED
    }
    
    // ============ Structs ============
    
    struct Bounty {
        uint256 bountyId;
        uint256 foroId;
        address creator;
        uint256 budget;
        string criteriaURI;
        bytes32 criteriaHash;
        uint256 timelockDays;
        uint256 deadline;
        BountyStatus status;
        address winner;
        uint256 openedTimestamp;
    }
    
    struct Finding {
        uint256 findingId;
        uint256 bountyId;
        address keeper;
        string evidenceURI;
        bytes32 evidenceHash;
        uint256 submissionTimestamp;
        bool approved;
        bool rejected;
        string rejectionReason;
    }
    
    // ============ Events ============
    
    event BountyOpened(
        uint256 indexed bountyId,
        uint256 indexed foroId,
        address indexed creator,
        uint256 budget,
        uint256 deadline
    );
    
    event FindingSubmitted(
        uint256 indexed findingId,
        uint256 indexed bountyId,
        address indexed keeper,
        string evidenceURI
    );
    
    event FindingApproved(
        uint256 indexed findingId,
        uint256 indexed bountyId,
        address indexed keeper,
        uint256 reward
    );
    
    event FindingRejected(
        uint256 indexed findingId,
        uint256 indexed bountyId,
        string reason
    );
    
    event BountyExpired(
        uint256 indexed bountyId,
        uint256 budgetReturned
    );
    
    // ============ Core Functions ============
    
    /**
     * @notice Open a bug bounty for an agent
     * @param foroId Foro agent ID
     * @param criteriaURI IPFS or HTTP URL to bounty criteria document
     * @param timelockDays Deadline window (3 or 7 days)
     * @dev Budget must be >= 0.01 ETH
     * @dev Caller must be agent creator (via ERC-8004 ownerOf)
     * @dev Cannot open if active bounty already exists for foroId
     * @return bountyId Unique bounty ID
     */
    function openBounty(
        uint256 foroId,
        string calldata criteriaURI,
        uint256 timelockDays
    ) external payable returns (uint256 bountyId);
    
    /**
     * @notice Submit a finding for a bounty
     * @param bountyId Bounty ID
     * @param evidenceURI IPFS or HTTP URL to evidence
     * @param evidenceHash keccak256 of evidence for integrity
     * @dev Bounty must be OPEN and before deadline
     * @return findingId Unique finding ID
     */
    function submitFinding(
        uint256 bountyId,
        string calldata evidenceURI,
        bytes32 evidenceHash
    ) external returns (uint256 findingId);
    
    /**
     * @notice Approve a finding and release budget to Keeper
     * @param findingId Finding ID
     * @dev Caller must be bounty creator
     * @dev Must be within deadline
     * @dev Changes bounty status to RESOLVED
     */
    function approveFinding(uint256 findingId) external;
    
    /**
     * @notice Reject a finding with reason
     * @param findingId Finding ID
     * @param reason Rejection reason
     * @dev Keeper can submit new finding after rejection
     */
    function rejectFinding(
        uint256 findingId,
        string calldata reason
    ) external;
    
    /**
     * @notice Claim expired bounty budget back to creator
     * @param bountyId Bounty ID
     * @dev Callable by anyone after deadline if status still OPEN
     * @dev Returns budget to creator
     */
    function claimExpired(uint256 bountyId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get bounty details
     * @param bountyId Bounty ID
     * @return bounty Bounty struct
     */
    function getBounty(uint256 bountyId) external view returns (Bounty memory bounty);
    
    /**
     * @notice Get finding details
     * @param findingId Finding ID
     * @return finding Finding struct
     */
    function getFinding(uint256 findingId) external view returns (Finding memory finding);
    
    /**
     * @notice Get all findings for a bounty
     * @param bountyId Bounty ID
     * @return findings Array of finding IDs
     */
    function getBountyFindings(uint256 bountyId) external view returns (uint256[] memory findings);
    
    /**
     * @notice Get active bounty for an agent (if any)
     * @param foroId Foro agent ID
     * @return bountyId Bounty ID (0 if none active)
     */
    function getActiveBounty(uint256 foroId) external view returns (uint256 bountyId);
}
