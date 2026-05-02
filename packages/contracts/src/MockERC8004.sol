// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {IERC8004} from "./interfaces/IERC8004.sol";

/**
 * @title MockERC8004
 * @notice ERC-8004 compliant agent registry implementation
 * @dev Extends ERC721URIStorage as per EIP-8004 specification
 * @dev Reference: https://eips.ethereum.org/EIPS/eip-8004
 */
contract MockERC8004 is ERC721URIStorage, EIP712, IERC8004 {
    using ECDSA for bytes32;

    uint256 private _nextAgentId = 1;
    
    mapping(uint256 => address) private _agentWallets;
    mapping(uint256 => mapping(string => bytes)) private _agentMetadata;
    
    bytes32 private constant SET_AGENT_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");
    
    string private constant AGENT_WALLET_KEY = "agentWallet";
    
    error NotOwner();
    error InvalidAgentId();
    error InvalidSignature();
    error SignatureExpired();
    error ReservedMetadataKey();
    
    constructor() ERC721("ERC8004 Agent Registry", "AGENT") EIP712("ERC8004", "1") {}
    
    function register() external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _agentWallets[agentId] = msg.sender;
        _safeMint(msg.sender, agentId);
        
        emit Registered(agentId, "", msg.sender);
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, abi.encode(msg.sender));
    }
    
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _agentWallets[agentId] = msg.sender;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        emit Registered(agentId, agentURI, msg.sender);
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, abi.encode(msg.sender));
    }
    
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentWallets[agentId] = msg.sender;
        
        emit Registered(agentId, agentURI, msg.sender);
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, abi.encode(msg.sender));
        
        for (uint256 i = 0; i < metadata.length; i++) {
            if (keccak256(bytes(metadata[i].metadataKey)) == keccak256(bytes(AGENT_WALLET_KEY))) {
                revert ReservedMetadataKey();
            }
            _agentMetadata[agentId][metadata[i].metadataKey] = metadata[i].metadataValue;
            emit MetadataSet(
                agentId,
                metadata[i].metadataKey,
                metadata[i].metadataKey,
                metadata[i].metadataValue
            );
        }
    }
    
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        if (ownerOf(agentId) != msg.sender) revert NotOwner();
        
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }
    
    function setMetadata(
        uint256 agentId,
        string calldata key,
        bytes calldata value
    ) external {
        if (keccak256(bytes(key)) == keccak256(bytes(AGENT_WALLET_KEY))) {
            revert ReservedMetadataKey();
        }
        if (ownerOf(agentId) != msg.sender) revert NotOwner();
        
        _agentMetadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }
    
    function getMetadata(
        uint256 agentId,
        string calldata key
    ) external view returns (bytes memory value) {
        if (keccak256(bytes(key)) == keccak256(bytes(AGENT_WALLET_KEY))) {
            return abi.encode(_agentWallets[agentId]);
        }
        return _agentMetadata[agentId][key];
    }
    
    function ownerOf(uint256 tokenId) public view virtual override(ERC721, IERC721, IERC8004) returns (address) {
        return super.ownerOf(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721URIStorage, IERC8004)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    function getAgentWallet(uint256 agentId) external view returns (address wallet) {
        return _agentWallets[agentId];
    }
    
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (ownerOf(agentId) != msg.sender) revert NotOwner();
        if (block.timestamp > deadline) revert SignatureExpired();
        
        bytes32 structHash = keccak256(
            abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        
        if (signer != newWallet) revert InvalidSignature();
        
        _agentWallets[agentId] = newWallet;
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, abi.encode(newWallet));
    }
    
    function unsetAgentWallet(uint256 agentId) external {
        if (ownerOf(agentId) != msg.sender) revert NotOwner();
        
        _agentWallets[agentId] = address(0);
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, abi.encode(address(0)));
    }
    
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        if (from != address(0) && to != address(0)) {
            _agentWallets[tokenId] = address(0);
            emit MetadataSet(tokenId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, abi.encode(address(0)));
        }
        
        return from;
    }
}
