// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAgentVault
 * @notice Escrow and fee distribution interface for Foro protocol
 * @dev Extends ERC-4626 for standardized vault operations
 */
interface IAgentVault {
    // ============ Events ============
    
    event FeeDeposited(
        uint256 indexed foroId,
        address indexed requester,
        uint256 amount
    );
    
    event FeeDistributed(
        uint256 indexed foroId,
        address keeper,
        address creator,
        address protocol,
        uint256 keeperShare,
        uint256 creatorShare,
        uint256 protocolShare
    );
    
    event FeeRefunded(
        uint256 indexed foroId,
        address indexed requester,
        uint256 amount
    );
    
    event BountyDeposited(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 amount
    );
    
    event BountyReleased(
        uint256 indexed bountyId,
        address indexed recipient,
        uint256 amount
    );
    
    event BountyReturned(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 amount
    );
    
    // ============ Core Functions ============
    
    /**
     * @notice Deposit test fee into escrow
     * @param foroId Test job ID
     * @param requester User paying the fee
     * @dev Called by ForoRegistry on requestTest
     */
    function deposit(uint256 foroId, address requester) external payable;
    
    /**
     * @notice Distribute test fee after successful test (70/20/10 split)
     * @param foroId Test job ID
     * @param agentWallet Agent creator wallet (receives 20%)
     * @param keeper Keeper who executed test (receives 70%)
     * @dev Called by ForoRegistry on finalizeResult
     * @dev 10% goes to protocol treasury
     */
    function distributePass(
        uint256 foroId,
        address agentWallet,
        address keeper
    ) external;
    
    /**
     * @notice Refund test fee after failed test or contestation win
     * @param foroId Test job ID
     * @param requester User who paid the fee
     * @dev Called by ForoRegistry when test fails or contestant wins
     */
    function distributeFail(
        uint256 foroId,
        address requester
    ) external;
    
    /**
     * @notice Deposit bug bounty budget
     * @param bountyId Bounty ID
     * @dev Called by BugBounty contract on openBounty
     */
    function depositBounty(uint256 bountyId) external payable;
    
    /**
     * @notice Release bounty to winner
     * @param bountyId Bounty ID
     * @param recipient Keeper who won bounty
     * @dev Called by BugBounty contract on approveFinding
     */
    function releaseBounty(
        uint256 bountyId,
        address recipient
    ) external;
    
    /**
     * @notice Return bounty to creator after expiry
     * @param bountyId Bounty ID
     * @param creator Agent creator who opened bounty
     * @dev Called by BugBounty contract on claimExpired
     */
    function returnBounty(
        uint256 bountyId,
        address creator
    ) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get escrowed amount for a test job
     * @param foroId Test job ID
     * @return amount Amount in escrow
     */
    function escrowed(uint256 foroId) external view returns (uint256 amount);
    
    /**
     * @notice Get escrowed bounty amount
     * @param bountyId Bounty ID
     * @return amount Amount in escrow
     */
    function bountyEscrowed(uint256 bountyId) external view returns (uint256 amount);
    
    /**
     * @notice Get protocol treasury address
     * @return treasury Treasury address receiving 10% of fees
     */
    function protocolTreasury() external view returns (address treasury);
}
