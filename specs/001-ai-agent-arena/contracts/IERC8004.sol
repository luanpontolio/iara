// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004
 * @notice External interface for ERC-8004 agent registry standard
 * @dev Foro reads this interface but does not implement it
 * @dev Reference: https://eips.ethereum.org/EIPS/eip-8004
 */
interface IERC8004 {
    /**
     * @notice Register a new agent
     * @param agentURI URI pointing to agent metadata
     * @return agentId Unique agent ID
     */
    function register(string calldata agentURI) external returns (uint256 agentId);
    
    /**
     * @notice Set metadata for an agent
     * @param agentId Agent ID
     * @param key Metadata key (e.g., "foro:contract", "foro:endpoint")
     * @param value Metadata value as bytes
     */
    function setMetadata(
        uint256 agentId,
        string calldata key,
        bytes calldata value
    ) external;
    
    /**
     * @notice Get metadata for an agent
     * @param agentId Agent ID
     * @param key Metadata key
     * @return value Metadata value as bytes
     */
    function getMetadata(
        uint256 agentId,
        string calldata key
    ) external view returns (bytes memory value);
    
    /**
     * @notice Get owner of an agent
     * @param agentId Agent ID
     * @return owner Owner address
     */
    function ownerOf(uint256 agentId) external view returns (address owner);
    
    /**
     * @notice Get URI for an agent
     * @param agentId Agent ID
     * @return uri Agent URI
     */
    function tokenURI(uint256 agentId) external view returns (string memory uri);
    
    /**
     * @notice Get wallet address for an agent
     * @param agentId Agent ID
     * @return wallet Wallet address receiving payments
     */
    function getAgentWallet(uint256 agentId) external view returns (address wallet);
}
