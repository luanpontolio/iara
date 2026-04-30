// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IAgentVault} from "./interfaces/IAgentVault.sol";

/**
 * @title AgentVault
 * @notice Escrow and fee distribution for Foro protocol
 */
contract AgentVault is IAgentVault, Ownable, ReentrancyGuard {
    mapping(uint256 => uint256) private _escrowed;
    mapping(uint256 => uint256) private _bountyEscrowed;

    address private _protocolTreasury;

    // Fee split percentages
    uint256 private constant KEEPER_SHARE_PCT = 70;
    uint256 private constant CREATOR_SHARE_PCT = 20;
    uint256 private constant PROTOCOL_SHARE_PCT = 10;

    constructor(address protocolTreasury_) Ownable(msg.sender) {
        require(protocolTreasury_ != address(0), "Invalid protocol treasury");
        _protocolTreasury = protocolTreasury_;
    }

    // ============================================
    // Test Fee Management
    // ============================================

    /**
     * @notice Deposit test fee into escrow
     * @param foroId The test job ID
     * @param requester The address that paid the fee
     */
    function deposit(uint256 foroId, address requester) external payable onlyOwner {
        require(msg.value > 0, "Invalid deposit amount");
        require(_escrowed[foroId] == 0, "Already escrowed");

        _escrowed[foroId] = msg.value;

        emit FeeDeposited(foroId, requester, msg.value);
    }

    /**
     * @notice Distribute fees after successful test (70/20/10 split)
     * @param foroId The test job ID
     * @param agentWallet Creator's wallet address
     * @param keeper Keeper's wallet address
     */
    function distributePass(
        uint256 foroId,
        address agentWallet,
        address keeper
    ) external onlyOwner nonReentrant {
        uint256 amount = _escrowed[foroId];
        require(amount > 0, "No escrowed funds");
        require(agentWallet != address(0), "Invalid agent wallet");
        require(keeper != address(0), "Invalid keeper");
        
        // Calculate splits: 70% keeper, 20% creator, 10% protocol
        uint256 keeperShare = (amount * KEEPER_SHARE_PCT) / 100;
        uint256 creatorShare = (amount * CREATOR_SHARE_PCT) / 100;
        uint256 protocolShare = amount - keeperShare - creatorShare;
        
        // Clear escrow first (checks-effects-interactions pattern)
        _escrowed[foroId] = 0;
        
        // Transfer fees
        _safeTransfer(keeper, keeperShare);
        _safeTransfer(agentWallet, creatorShare);
        _safeTransfer(_protocolTreasury, protocolShare);
        
        emit FeeDistributed(
            foroId,
            keeper,
            agentWallet,
            _protocolTreasury,
            keeperShare,
            creatorShare,
            protocolShare
        );
    }
    
    /**
     * @notice Refund fee after failed test
     * @param foroId The test job ID
     * @param requester The original requester to refund
     */
    function distributeFail(
        uint256 foroId,
        address requester
    ) external onlyOwner nonReentrant {
        uint256 amount = _escrowed[foroId];
        require(amount > 0, "No escrowed funds");
        require(requester != address(0), "Invalid requester");
        
        // Clear escrow first
        _escrowed[foroId] = 0;
        
        // Refund full amount to requester
        _safeTransfer(requester, amount);
        
        emit FeeRefunded(foroId, requester, amount);
    }
    
    // ============================================
    // Bug Bounty Management (Future Phase)
    // ============================================
    
    /**
     * @notice Deposit bounty funds
     * @param bountyId The bounty ID
     */
    function depositBounty(uint256 bountyId) external payable onlyOwner {
        require(msg.value > 0, "Invalid deposit amount");
        require(_bountyEscrowed[bountyId] == 0, "Already escrowed");
        
        _bountyEscrowed[bountyId] = msg.value;
        
        emit BountyDeposited(bountyId, msg.sender, msg.value);
    }
    
    /**
     * @notice Release bounty to winner
     * @param bountyId The bounty ID
     * @param recipient The winner's address
     */
    function releaseBounty(
        uint256 bountyId,
        address recipient
    ) external onlyOwner nonReentrant {
        uint256 amount = _bountyEscrowed[bountyId];
        require(amount > 0, "No escrowed bounty");
        require(recipient != address(0), "Invalid recipient");
        
        _bountyEscrowed[bountyId] = 0;
        
        _safeTransfer(recipient, amount);
        
        emit BountyReleased(bountyId, recipient, amount);
    }
    
    /**
     * @notice Return bounty to creator after expiry
     * @param bountyId The bounty ID
     * @param creator The bounty creator
     */
    function returnBounty(
        uint256 bountyId,
        address creator
    ) external onlyOwner nonReentrant {
        uint256 amount = _bountyEscrowed[bountyId];
        require(amount > 0, "No escrowed bounty");
        require(creator != address(0), "Invalid creator");
        
        _bountyEscrowed[bountyId] = 0;
        
        _safeTransfer(creator, amount);
        
        emit BountyReturned(bountyId, creator, amount);
    }
    
    // ============================================
    // View Functions
    // ============================================
    
    /**
     * @notice Get escrowed amount for a test
     * @param foroId The test job ID
     * @return amount The escrowed amount
     */
    function escrowed(uint256 foroId) external view returns (uint256 amount) {
        return _escrowed[foroId];
    }
    
    /**
     * @notice Get escrowed bounty amount
     * @param bountyId The bounty ID
     * @return amount The escrowed amount
     */
    function bountyEscrowed(uint256 bountyId) external view returns (uint256 amount) {
        return _bountyEscrowed[bountyId];
    }
    
    /**
     * @notice Get protocol treasury address
     * @return treasury The protocol treasury address
     */
    function protocolTreasury() external view returns (address treasury) {
        return _protocolTreasury;
    }
    
    // ============================================
    // Internal Helpers
    // ============================================
    
    /**
     * @dev Safe ETH transfer with gas limit
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _safeTransfer(address to, uint256 amount) private {
        (bool success, ) = to.call{value: amount, gas: 10000}("");
        require(success, "Transfer failed");
    }
}
