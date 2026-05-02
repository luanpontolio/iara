// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ForoRegistry} from "../src/ForoRegistry.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {MockERC8004} from "../src/MockERC8004.sol";

/**
 * @title GasBenchmark
 * @notice Measure gas costs for critical operations and compare against spec targets
 * @dev Target gas costs from plan.md:
 *      - requestTest: <100k gas
 *      - commitTest: <150k gas
 *      - submitResult: <200k gas
 *      - finalizeResult: <300k gas
 */
contract GasBenchmark is Script {
    ForoRegistry public foroRegistry;
    AgentVault public agentVault;
    MockERC8004 public erc8004;

    address public deployer;
    address public creator = address(0x1);
    address public user = address(0x2);
    address public keeper = address(0x3);

    uint256 public constant TEST_FEE = 0.001 ether;
    uint256 public constant KEEPER_STAKE = TEST_FEE * 2;
    uint256 public constant MIN_KEEPER_STAKE = 0.01 ether;

    uint256 public agentId;
    uint256 public foroId;
    string public agentContractJSON = '{"category":"url-summarizer","testCases":[{"id":"tc-01"}]}';

    struct GasReport {
        string operation;
        uint256 gasUsed;
        uint256 target;
        bool passesTarget;
    }

    function run() external {
        deployer = msg.sender;

        console.log("=== Foro Gas Benchmark Report ===\n");
        console.log("Measuring gas costs for critical operations\n");

        // Deploy contracts
        _deployContracts();

        // Setup test data
        _setupTestData();

        // Measure operations
        GasReport[] memory reports = new GasReport[](4);
        reports[0] = _measureRequestTest();
        reports[1] = _measureCommitTest();
        reports[2] = _measureSubmitResult();
        reports[3] = _measureFinalizeResult();

        // Print summary
        _printSummary(reports);

        // Save to JSON
        _saveReport(reports);
    }

    function _deployContracts() internal {
        erc8004 = new MockERC8004();
        agentVault = new AgentVault(deployer);
        foroRegistry = new ForoRegistry(address(agentVault));
        agentVault.transferOwnership(address(foroRegistry));

        vm.deal(creator, 10 ether);
        vm.deal(user, 10 ether);
        vm.deal(keeper, 10 ether);

        vm.prank(keeper);
        foroRegistry.registerKeeper{value: MIN_KEEPER_STAKE}();

        console.log("Contracts deployed:");
        console.log("  ForoRegistry:", address(foroRegistry));
        console.log("  AgentVault:", address(agentVault));
        console.log("  MockERC8004:", address(erc8004));
        console.log("");
    }

    function _setupTestData() internal {
        vm.startPrank(creator);
        agentId = erc8004.register("test-agent");
        erc8004.setMetadata(agentId, "foro:contract", bytes(agentContractJSON));
        foroId = foroRegistry.registerAgent(address(erc8004), agentId);
        vm.stopPrank();
    }

    function _measureRequestTest() internal returns (GasReport memory) {
        uint256 gasBefore = gasleft();

        vm.prank(user);
        foroRegistry.requestTest{value: TEST_FEE}(foroId);

        uint256 gasUsed = gasBefore - gasleft();
        uint256 target = 100_000;

        console.log("1. requestTest()");
        console.log("   Gas used:", gasUsed);
        console.log("   Target: <", target);
        console.log("   Status:", gasUsed < target ? "PASS" : "FAIL");
        console.log("");

        return GasReport({
            operation: "requestTest",
            gasUsed: gasUsed,
            target: target,
            passesTarget: gasUsed < target
        });
    }

    function _measureCommitTest() internal returns (GasReport memory) {
        // Setup: request test first
        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        bytes32 commitHash = keccak256(abi.encode(agentContractJSON, bytes32(uint256(1))));

        uint256 gasBefore = gasleft();
        
        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);
        
        uint256 gasUsed = gasBefore - gasleft();
        uint256 target = 150_000;

        console.log("2. commitTest()");
        console.log("   Gas used:", gasUsed);
        console.log("   Target: <", target);
        console.log("   Status:", gasUsed < target ? "PASS" : "FAIL");
        console.log("");

        return GasReport({
            operation: "commitTest",
            gasUsed: gasUsed,
            target: target,
            passesTarget: gasUsed < target
        });
    }

    function _measureSubmitResult() internal returns (GasReport memory) {
        // Setup: request, commit, reveal
        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        bytes32 salt = bytes32(uint256(2));
        bytes32 commitHash = keccak256(abi.encode(agentContractJSON, salt));

        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);

        vm.prank(keeper);
        foroRegistry.revealTestInputs(testForoId, agentContractJSON, salt);

        uint256 gasBefore = gasleft();
        
        vm.prank(keeper);
        foroRegistry.submitResult(testForoId, 75, 1500, 1, keccak256("test-chat"));
        
        uint256 gasUsed = gasBefore - gasleft();
        uint256 target = 200_000;

        console.log("3. submitResult()");
        console.log("   Gas used:", gasUsed);
        console.log("   Target: <", target);
        console.log("   Status:", gasUsed < target ? "PASS" : "FAIL");
        console.log("");

        return GasReport({
            operation: "submitResult",
            gasUsed: gasUsed,
            target: target,
            passesTarget: gasUsed < target
        });
    }

    function _measureFinalizeResult() internal returns (GasReport memory) {
        // Setup: complete flow up to finalization
        vm.prank(user);
        uint256 testForoId = foroRegistry.requestTest{value: TEST_FEE}(foroId);

        bytes32 salt = bytes32(uint256(3));
        bytes32 commitHash = keccak256(abi.encode(agentContractJSON, salt));

        vm.prank(keeper);
        foroRegistry.claimJob{value: KEEPER_STAKE}(testForoId, commitHash);

        vm.prank(keeper);
        foroRegistry.revealTestInputs(testForoId, agentContractJSON, salt);

        vm.prank(keeper);
        foroRegistry.submitResult(testForoId, 75, 1500, 1, keccak256("chat"));

        vm.warp(block.timestamp + 1 hours + 1);

        uint256 gasBefore = gasleft();
        
        vm.prank(keeper);
        foroRegistry.finalizeResult(testForoId);
        
        uint256 gasUsed = gasBefore - gasleft();
        uint256 target = 300_000;

        console.log("4. finalizeResult()");
        console.log("   Gas used:", gasUsed);
        console.log("   Target: <", target);
        console.log("   Status:", gasUsed < target ? "PASS" : "FAIL");
        console.log("");

        return GasReport({
            operation: "finalizeResult",
            gasUsed: gasUsed,
            target: target,
            passesTarget: gasUsed < target
        });
    }

    function _printSummary(GasReport[] memory reports) internal view {
        console.log("=== Summary ===");
        console.log("");

        uint256 passed = 0;
        for (uint256 i = 0; i < reports.length; i++) {
            if (reports[i].passesTarget) {
                passed++;
            }
        }

        console.log("Operations tested:", reports.length);
        console.log("Passed:", passed);
        console.log("Failed:", reports.length - passed);
        console.log("");

        if (passed == reports.length) {
            console.log("Result: ALL OPERATIONS MEET GAS TARGETS");
        } else {
            console.log("Result: SOME OPERATIONS EXCEED GAS TARGETS");
            console.log("Review optimization opportunities above.");
        }
    }

    function _saveReport(GasReport[] memory reports) internal {
        string memory json = "gas_report";
        
        for (uint256 i = 0; i < reports.length; i++) {
            string memory key = string(abi.encodePacked("operation_", vm.toString(i)));
            vm.serializeString(json, string(abi.encodePacked(key, "_name")), reports[i].operation);
            vm.serializeUint(json, string(abi.encodePacked(key, "_gasUsed")), reports[i].gasUsed);
            vm.serializeUint(json, string(abi.encodePacked(key, "_target")), reports[i].target);
            vm.serializeBool(json, string(abi.encodePacked(key, "_passes")), reports[i].passesTarget);
        }

        string memory output = vm.serializeUint(json, "timestamp", block.timestamp);
        vm.writeJson(output, "./gas-report.json");

        console.log("Gas report saved to: gas-report.json");
    }
}
