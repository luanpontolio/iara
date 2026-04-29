// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAgentVault
 * @notice Escrow and fee distribution interface for Foro protocol
 * @dev Simplified vault implementation without ERC-4626 dependency
 */
interface IAgentVault {
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
    
    function deposit(uint256 foroId, address requester) external payable;
    
    function distributePass(
        uint256 foroId,
        address agentWallet,
        address keeper
    ) external;
    
    function distributeFail(
        uint256 foroId,
        address requester
    ) external;
    
    function depositBounty(uint256 bountyId) external payable;
    
    function releaseBounty(
        uint256 bountyId,
        address recipient
    ) external;
    
    function returnBounty(
        uint256 bountyId,
        address creator
    ) external;
    
    function escrowed(uint256 foroId) external view returns (uint256 amount);
    
    function bountyEscrowed(uint256 bountyId) external view returns (uint256 amount);
    
    function protocolTreasury() external view returns (address treasury);
}
