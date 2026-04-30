// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004
 * @notice External interface for ERC-8004 agent registry standard
 * @dev Foro reads this interface but does not implement it
 * @dev Reference: https://eips.ethereum.org/EIPS/eip-8004
 */
interface IERC8004 {
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    function register() external returns (uint256 agentId);
    
    function register(string calldata agentURI) external returns (uint256 agentId);
    
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId);
    
    function setAgentURI(uint256 agentId, string calldata newURI) external;
    
    function setMetadata(
        uint256 agentId,
        string calldata key,
        bytes calldata value
    ) external;
    
    function getMetadata(
        uint256 agentId,
        string calldata key
    ) external view returns (bytes memory value);
    
    function ownerOf(uint256 agentId) external view returns (address owner);
    
    function tokenURI(uint256 agentId) external view returns (string memory uri);
    
    function getAgentWallet(uint256 agentId) external view returns (address wallet);
    
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external;
    
    function unsetAgentWallet(uint256 agentId) external;
}
