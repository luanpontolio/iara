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
    
    // ============ View Functions ============
    
    /**
     * @notice Get escrowed amount for a test job
     * @param foroId Test job ID
     * @return amount Amount in escrow
     */
    function escrowed(uint256 foroId) external view returns (uint256 amount);
    
    /**
     * @notice Get protocol treasury address
     * @return treasury Treasury address receiving 10% of fees
     */
    function protocolTreasury() external view returns (address treasury);
}
