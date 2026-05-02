// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockERC8004} from "../src/MockERC8004.sol";
import {ForoRegistry} from "../src/ForoRegistry.sol";
import {AgentVault} from "../src/AgentVault.sol";

/**
 * @title Deploy
 * @notice Deployment script for Foro protocol contracts
 * @dev Deploys contracts in dependency order: MockERC8004 → AgentVault → ForoRegistry
 *      Saves addresses to deployments.json for Keeper and frontend integration
 */
contract Deploy is Script {
    // Deployment addresses (populated during run)
    MockERC8004 public mockERC8004;
    AgentVault public agentVault;
    ForoRegistry public foroRegistry;

    // Configuration
    address public protocolTreasury;
    uint256 public minKeeperStake = 0.01 ether;
    uint256 public testFeeAmount = 0.001 ether;

    function run() external {
        // Load deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying from:", deployer);
        console.log("Deployer balance:", deployer.balance);

        // Set protocol treasury (use deployer for testnet MVP)
        protocolTreasury = vm.envOr("PROTOCOL_TREASURY", deployer);
        console.log("Protocol treasury:", protocolTreasury);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy MockERC8004 for testing
        console.log("\n=== Deploying MockERC8004 ===");
        mockERC8004 = new MockERC8004();
        console.log("MockERC8004 deployed at:", address(mockERC8004));

        // Step 2: Deploy AgentVault (simple escrow, no ERC-4626)
        console.log("\n=== Deploying AgentVault ===");
        agentVault = new AgentVault(protocolTreasury);
        console.log("AgentVault deployed at:", address(agentVault));

        // Step 3: Deploy ForoRegistry (main registry with Keeper logic)
        console.log("\n=== Deploying ForoRegistry ===");
        foroRegistry = new ForoRegistry(address(agentVault));
        console.log("ForoRegistry deployed at:", address(foroRegistry));

        // Step 4: Set ForoRegistry as AgentVault owner (for distributePass/Fail access)
        console.log("\n=== Configuring AgentVault ===");
        agentVault.transferOwnership(address(foroRegistry));
        console.log("AgentVault ownership transferred to ForoRegistry");

        vm.stopBroadcast();

        // Step 5: Output deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("MockERC8004:", address(mockERC8004));
        console.log("AgentVault:", address(agentVault));
        console.log("ForoRegistry:", address(foroRegistry));
        console.log("Protocol Treasury:", protocolTreasury);
        console.log("Min Keeper Stake:", minKeeperStake);
        console.log("Test Fee Amount:", testFeeAmount);

        // Step 6: Write deployment artifacts to JSON file
        _writeDeploymentJson();

        console.log("\nDeployment complete!");
        console.log("Artifacts saved to: deployments.json");
    }

    /**
     * @dev Write deployment addresses to JSON file for off-chain integration
     * @notice Format matches backend/frontend expectations
     */
    function _writeDeploymentJson() internal {
        string memory json = "deployment";
        
        // Contract addresses
        vm.serializeAddress(json, "MockERC8004", address(mockERC8004));
        vm.serializeAddress(json, "AgentVault", address(agentVault));
        vm.serializeAddress(json, "ForoRegistry", address(foroRegistry));
        
        // Configuration
        vm.serializeAddress(json, "protocolTreasury", protocolTreasury);
        vm.serializeUint(json, "minKeeperStake", minKeeperStake);
        vm.serializeUint(json, "testFeeAmount", testFeeAmount);
        
        // Network info
        vm.serializeUint(json, "chainId", block.chainid);
        string memory output = vm.serializeUint(json, "deployedAt", block.timestamp);
        
        // Write to file
        vm.writeJson(output, "./deployments.json");
    }

    /**
     * @dev Helper function to verify deployments (call after run())
     * @return success True if all contracts deployed and configured correctly
     */
    function verify() external view returns (bool success) {
        // Check all contracts deployed
        require(address(mockERC8004) != address(0), "MockERC8004 not deployed");
        require(address(agentVault) != address(0), "AgentVault not deployed");
        require(address(foroRegistry) != address(0), "ForoRegistry not deployed");

        // Check AgentVault ownership transferred
        require(
            agentVault.owner() == address(foroRegistry),
            "AgentVault ownership not transferred"
        );

        // Check ForoRegistry configuration
        require(
            address(foroRegistry.agentVault()) == address(agentVault),
            "ForoRegistry vault address incorrect"
        );

        return true;
    }
}
