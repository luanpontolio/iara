// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {MockERC8004} from "../src/MockERC8004.sol";
import {IERC8004} from "../src/interfaces/IERC8004.sol";

contract MockERC8004Test is Test {
    MockERC8004 public erc8004;
    
    uint256 internal alicePrivateKey = 0xA11CE;
    uint256 internal bobPrivateKey = 0xB0B;
    address public alice;
    address public bob;
    
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    
    function setUp() public {
        alice = vm.addr(alicePrivateKey);
        bob = vm.addr(bobPrivateKey);
        erc8004 = new MockERC8004();
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
    }
    
    function _signSetAgentWallet(
        uint256 privateKey,
        uint256 agentId,
        address newWallet,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)"),
                agentId,
                newWallet,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                erc8004.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
    
    function test_Register() public {
        vm.startPrank(alice);
        
        uint256 agentId = erc8004.register("ipfs://Qm...");
        
        assertEq(agentId, 1, "First agent ID should be 1");
        assertEq(erc8004.ownerOf(agentId), alice, "Owner should be alice");
        assertEq(erc8004.getAgentWallet(agentId), alice, "Wallet should default to owner");
        assertEq(erc8004.tokenURI(agentId), "ipfs://Qm...", "URI should match");
        
        vm.stopPrank();
    }
    
    function test_RegisterMultiple() public {
        vm.prank(alice);
        uint256 id1 = erc8004.register("uri1");
        
        vm.prank(bob);
        uint256 id2 = erc8004.register("uri2");
        
        assertEq(id1, 1, "First ID");
        assertEq(id2, 2, "Second ID");
        assertEq(erc8004.ownerOf(id1), alice, "First owner");
        assertEq(erc8004.ownerOf(id2), bob, "Second owner");
    }
    
    function test_RegisterWithoutURI() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register();
        
        assertEq(agentId, 1, "First agent ID should be 1");
        assertEq(erc8004.ownerOf(agentId), alice, "Owner should be alice");
        assertEq(erc8004.getAgentWallet(agentId), alice, "Wallet should default to owner");
        assertEq(erc8004.tokenURI(agentId), "", "URI should be empty");
    }
    
    function test_RegisterWithMetadata() public {
        vm.prank(alice);
        
        IERC8004.MetadataEntry[] memory metadata = new IERC8004.MetadataEntry[](2);
        metadata[0] = IERC8004.MetadataEntry("foro:contract", bytes("contract-data"));
        metadata[1] = IERC8004.MetadataEntry("foro:endpoint", bytes("https://api.agent.com"));
        
        uint256 agentId = erc8004.register("ipfs://test", metadata);
        
        assertEq(agentId, 1);
        assertEq(string(erc8004.getMetadata(agentId, "foro:contract")), "contract-data");
        assertEq(string(erc8004.getMetadata(agentId, "foro:endpoint")), "https://api.agent.com");
    }
    
    function test_RevertWhen_RegisterWithReservedMetadataKey() public {
        vm.prank(alice);
        
        IERC8004.MetadataEntry[] memory metadata = new IERC8004.MetadataEntry[](1);
        metadata[0] = IERC8004.MetadataEntry("agentWallet", abi.encode(address(0x999)));
        
        vm.expectRevert(MockERC8004.ReservedMetadataKey.selector);
        erc8004.register("ipfs://test", metadata);
    }
    
    function test_SetAgentURI() public {
        vm.startPrank(alice);
        uint256 agentId = erc8004.register();
        
        erc8004.setAgentURI(agentId, "ipfs://updated");
        assertEq(erc8004.tokenURI(agentId), "ipfs://updated");
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_SetAgentURINotOwner() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        vm.prank(bob);
        vm.expectRevert(MockERC8004.NotOwner.selector);
        erc8004.setAgentURI(agentId, "ipfs://hacked");
    }
    
    function test_SetMetadata() public {
        vm.startPrank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        string memory foroContract = '{"category":"url-summarizer","version":"1.0.0"}';
        erc8004.setMetadata(agentId, "foro:contract", bytes(foroContract));
        
        bytes memory retrieved = erc8004.getMetadata(agentId, "foro:contract");
        assertEq(string(retrieved), foroContract, "Metadata should match");
        
        vm.stopPrank();
    }
    
    function test_SetMultipleMetadataKeys() public {
        vm.startPrank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        erc8004.setMetadata(agentId, "foro:contract", bytes("contract"));
        erc8004.setMetadata(agentId, "foro:endpoint", bytes("https://api.agent.com"));
        
        assertEq(string(erc8004.getMetadata(agentId, "foro:contract")), "contract");
        assertEq(string(erc8004.getMetadata(agentId, "foro:endpoint")), "https://api.agent.com");
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_SetMetadataNotOwner() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        vm.prank(bob);
        vm.expectRevert(MockERC8004.NotOwner.selector);
        erc8004.setMetadata(agentId, "foro:contract", bytes("data"));
    }
    
    function test_RevertWhen_SetMetadataReservedKey() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        vm.expectRevert(MockERC8004.ReservedMetadataKey.selector);
        erc8004.setMetadata(agentId, "agentWallet", abi.encode(address(0x999)));
    }
    
    function test_GetMetadataForAgentWallet() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        bytes memory walletData = erc8004.getMetadata(agentId, "agentWallet");
        address retrievedWallet = abi.decode(walletData, (address));
        assertEq(retrievedWallet, alice, "agentWallet metadata should return wallet address");
    }
    
    function test_GetMetadataEmpty() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        bytes memory empty = erc8004.getMetadata(agentId, "nonexistent");
        assertEq(empty.length, 0, "Nonexistent metadata should return empty bytes");
    }
    
    function test_SetAgentWallet() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        address newWallet = vm.addr(0x999);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signSetAgentWallet(0x999, agentId, newWallet, deadline);
        
        vm.prank(alice);
        erc8004.setAgentWallet(agentId, newWallet, deadline, signature);
        
        assertEq(erc8004.getAgentWallet(agentId), newWallet, "Wallet should be updated");
        assertEq(erc8004.ownerOf(agentId), alice, "Owner should remain unchanged");
    }
    
    function test_RevertWhen_SetWalletNotOwner() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        address newWallet = vm.addr(0x999);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signSetAgentWallet(0x999, agentId, newWallet, deadline);
        
        vm.prank(bob);
        vm.expectRevert(MockERC8004.NotOwner.selector);
        erc8004.setAgentWallet(agentId, newWallet, deadline, signature);
    }
    
    function test_RevertWhen_SetWalletInvalidSignature() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        address newWallet = vm.addr(0x999);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory wrongSignature = _signSetAgentWallet(bobPrivateKey, agentId, newWallet, deadline);
        
        vm.prank(alice);
        vm.expectRevert(MockERC8004.InvalidSignature.selector);
        erc8004.setAgentWallet(agentId, newWallet, deadline, wrongSignature);
    }
    
    function test_RevertWhen_SetWalletExpiredSignature() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        address newWallet = vm.addr(0x999);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signSetAgentWallet(0x999, agentId, newWallet, deadline);
        
        vm.warp(deadline + 1);
        
        vm.prank(alice);
        vm.expectRevert(MockERC8004.SignatureExpired.selector);
        erc8004.setAgentWallet(agentId, newWallet, deadline, signature);
    }
    
    function test_UnsetAgentWallet() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        address newWallet = vm.addr(0x999);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signSetAgentWallet(0x999, agentId, newWallet, deadline);
        
        vm.prank(alice);
        erc8004.setAgentWallet(agentId, newWallet, deadline, signature);
        assertEq(erc8004.getAgentWallet(agentId), newWallet);
        
        vm.prank(alice);
        erc8004.unsetAgentWallet(agentId);
        assertEq(erc8004.getAgentWallet(agentId), address(0), "Wallet should be cleared");
    }
    
    function test_AgentWalletClearedOnTransfer() public {
        vm.prank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        address newWallet = vm.addr(0x999);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signSetAgentWallet(0x999, agentId, newWallet, deadline);
        
        vm.prank(alice);
        erc8004.setAgentWallet(agentId, newWallet, deadline, signature);
        
        vm.prank(alice);
        erc8004.transferFrom(alice, bob, agentId);
        
        assertEq(erc8004.getAgentWallet(agentId), address(0), "Wallet should be cleared on transfer");
        assertEq(erc8004.ownerOf(agentId), bob, "Bob should be new owner");
    }
    
    function test_RevertWhen_OwnerOfInvalidId() public {
        vm.expectRevert();
        erc8004.ownerOf(999);
    }
    
    function test_RevertWhen_TokenURIInvalidId() public {
        vm.expectRevert();
        erc8004.tokenURI(999);
    }
    
    function test_GetAgentWalletUnregisteredReturnsZero() public view {
        assertEq(erc8004.getAgentWallet(999), address(0));
    }
    
    function test_EmitRegisteredEvent() public {
        vm.prank(alice);
        
        vm.expectEmit(true, true, false, true);
        emit Registered(1, "ipfs://test", alice);
        
        erc8004.register("ipfs://test");
    }
    
    function test_EmitMetadataSetEvent() public {
        vm.startPrank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        vm.expectEmit(true, true, false, true);
        emit MetadataSet(agentId, "foro:contract", "foro:contract", bytes("data"));
        
        erc8004.setMetadata(agentId, "foro:contract", bytes("data"));
        vm.stopPrank();
    }
    
    function test_EmitURIUpdatedEvent() public {
        vm.startPrank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        vm.expectEmit(true, true, false, true);
        emit URIUpdated(agentId, "ipfs://updated", alice);
        
        erc8004.setAgentURI(agentId, "ipfs://updated");
        vm.stopPrank();
    }
    
    function testFuzz_RegisterMultiple(uint8 count) public {
        vm.assume(count > 0 && count <= 50);
        
        for (uint256 i = 0; i < count; i++) {
            address owner = address(uint160(i + 1));
            vm.prank(owner);
            uint256 id = erc8004.register(string(abi.encodePacked("uri", i)));
            assertEq(id, i + 1, "Sequential ID");
            assertEq(erc8004.ownerOf(id), owner, "Correct owner");
        }
    }
    
    function testFuzz_SetMetadata(bytes calldata value) public {
        vm.startPrank(alice);
        uint256 agentId = erc8004.register("ipfs://test");
        
        erc8004.setMetadata(agentId, "foro:contract", value);
        bytes memory retrieved = erc8004.getMetadata(agentId, "foro:contract");
        
        assertEq(retrieved, value, "Fuzzed metadata should match");
        vm.stopPrank();
    }
}
