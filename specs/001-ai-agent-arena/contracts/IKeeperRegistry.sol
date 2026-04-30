// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKeeperRegistry
 * @notice Registry for Keepers executing tests in Foro protocol
 * @dev Manages Keeper staking, reputation, and weight calculation
 */
interface IKeeperRegistry {
    // ============ Structs ============
    
    struct Keeper {
        address keeperAddress;
        address erc8004Address;
        uint256 erc8004AgentId;
        uint256 stakedAmount;
        uint256 jobsCompleted;
        uint256 jobsContested;
        uint256 contestationsWon;
        uint256 contestationsLost;
        uint256 totalEarned;
        uint256 registrationTimestamp;
        bool active;
    }
    
    // ============ Events ============
    
    event KeeperRegistered(
        address indexed keeper,
        address indexed erc8004Address,
        uint256 erc8004AgentId,
        uint256 stakedAmount
    );
    
    event KeeperStakeIncreased(
        address indexed keeper,
        uint256 amount,
        uint256 newTotal
    );
    
    event KeeperSlashed(
        address indexed keeper,
        uint256 amount,
        uint256 remainingStake
    );
    
    event KeeperDeactivated(
        address indexed keeper
    );
    
    event KeeperReactivated(
        address indexed keeper,
        uint256 newStake
    );
    
    // ============ Core Functions ============
    
    /**
     * @notice Register as a Keeper by staking minimum amount
     * @param erc8004Address Keeper's ERC-8004 contract
     * @param erc8004AgentId AgentId with category "foro-keeper"
     * @dev Stake must be >= 0.01 ETH (MIN_STAKE)
     * @dev ERC-8004 metadata "category" must equal "foro-keeper"
     */
    function registerKeeper(
        address erc8004Address,
        uint256 erc8004AgentId
    ) external payable;
    
    /**
     * @notice Increase Keeper stake
     * @dev Can be called by Keeper to improve weight
     */
    function increaseStake() external payable;
    
    /**
     * @notice Slash Keeper stake (called by ForoRegistry on contestation loss)
     * @param keeper Keeper address to slash
     * @param percentage Percentage to slash (0-100)
     * @dev If remaining stake < MIN_STAKE, Keeper is deactivated
     */
    function slash(address keeper, uint256 percentage) external;
    
    /**
     * @notice Re-stake to reactivate after deactivation
     * @dev Keeper must bring stake back to >= MIN_STAKE
     */
    function restake() external payable;
    
    /**
     * @notice Record job completion (called by ForoRegistry)
     * @param keeper Keeper address
     * @param earned Fee earned from this job
     */
    function recordJobCompleted(address keeper, uint256 earned) external;
    
    /**
     * @notice Record contestation against Keeper (called by ForoRegistry)
     * @param keeper Keeper address
     */
    function recordContested(address keeper) external;
    
    /**
     * @notice Record contestation outcome (called by ForoRegistry)
     * @param keeper Keeper address
     * @param keeperWon True if Keeper won, false if lost
     */
    function recordContestationResolved(address keeper, bool keeperWon) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get Keeper details
     * @param keeper Keeper address
     * @return Keeper struct
     */
    function getKeeper(address keeper) external view returns (Keeper memory);
    
    /**
     * @notice Calculate Keeper weight for score averaging
     * @param keeper Keeper address
     * @return weight Weight value (base 1 + bonuses)
     * @dev weight = 1 + (jobsCompleted / 10) + (stakedAmount / MIN_STAKE - 1)
     */
    function getKeeperWeight(address keeper) external view returns (uint256 weight);
    
    /**
     * @notice Check if Keeper is active and eligible to execute tests
     * @param keeper Keeper address
     * @return active True if Keeper can execute tests
     */
    function isActive(address keeper) external view returns (bool active);
    
    /**
     * @notice Get minimum stake amount
     * @return minStake Minimum stake in wei (0.01 ETH)
     */
    function MIN_STAKE() external view returns (uint256 minStake);
}
