// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../FBTToken.sol";

/**
 * @title FBTStakingVault
 * @dev Staking vault for FBT tokens where users can stake tokens to earn rewards
 * Staked tokens are locked for a specified period and generate additional FBT rewards
 */
contract FBTStakingVault is Ownable {
    
    // Structs
    struct StakeInfo {
        uint256 amount;           // Amount of FBT staked
        uint256 lockEndTime;      // When the stake can be withdrawn
        uint256 rewardDebt;       // Reward debt for calculating rewards
        uint256 lastRewardTime;   // Last time rewards were calculated
    }
    
    struct PoolInfo {
        uint256 lockDuration;     // Lock duration in seconds
        uint256 rewardRate;       // Reward rate per second (in basis points, 10000 = 100%)
        uint256 totalStaked;      // Total amount staked in this pool
        bool active;              // Whether this pool is active
        string name;              // Pool name (e.g., "30 Days", "90 Days", "1 Year")
    }
    
    // State variables
    FBTToken public immutable fbtToken;
    
    // Pool ID => Pool Info
    mapping(uint256 => PoolInfo) public pools;
    
    // User => Pool ID => Stake Info
    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    
    // User => Pool ID => Total claimed rewards
    mapping(address => mapping(uint256 => uint256)) public totalClaimedRewards;
    
    uint256 public nextPoolId;
    uint256 public totalPoolsCreated;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // Events
    event PoolCreated(uint256 indexed poolId, string name, uint256 lockDuration, uint256 rewardRate);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 lockEndTime);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 reward);
    event RewardsClaimed(address indexed user, uint256 indexed poolId, uint256 reward);
    event PoolStatusChanged(uint256 indexed poolId, bool active);
    event EmergencyWithdraw(address indexed user, uint256 indexed poolId, uint256 amount);
    
    constructor(address _fbtToken, address _owner) Ownable(_owner) {
        require(_fbtToken != address(0), "Vault: FBT token cannot be zero address");
        fbtToken = FBTToken(_fbtToken);
    }
    
    /**
     * @dev Create a new staking pool
     * @param _name Pool name
     * @param _lockDuration Lock duration in seconds
     * @param _rewardRate Annual reward rate in basis points (e.g., 1000 = 10%)
     */
    function createPool(
        string memory _name,
        uint256 _lockDuration,
        uint256 _rewardRate
    ) external onlyOwner {
        require(_lockDuration > 0, "Vault: Lock duration must be greater than 0");
        require(_rewardRate > 0 && _rewardRate <= BASIS_POINTS, "Vault: Invalid reward rate");
        
        uint256 poolId = nextPoolId++;
        totalPoolsCreated++;
        
        pools[poolId] = PoolInfo({
            lockDuration: _lockDuration,
            rewardRate: _rewardRate,
            totalStaked: 0,
            active: true,
            name: _name
        });
        
        emit PoolCreated(poolId, _name, _lockDuration, _rewardRate);
    }
    
    /**
     * @dev Stake FBT tokens in a specific pool
     * @param _poolId Pool ID to stake in
     * @param _amount Amount of FBT to stake
     */
    function stake(uint256 _poolId, uint256 _amount) external {
        require(_amount > 0, "Vault: Amount must be greater than 0");
        require(pools[_poolId].active, "Vault: Pool is not active");
        require(_poolId < nextPoolId, "Vault: Pool does not exist");
        
        PoolInfo storage pool = pools[_poolId];
        StakeInfo storage userStake = stakes[msg.sender][_poolId];
        
        // If user already has a stake, claim pending rewards first
        if (userStake.amount > 0) {
            _claimRewards(msg.sender, _poolId);
        }
        
        // Transfer tokens from user to vault
        require(fbtToken.transferFrom(msg.sender, address(this), _amount), "Vault: Transfer failed");
        
        // Update stake info
        userStake.amount += _amount;
        userStake.lockEndTime = block.timestamp + pool.lockDuration;
        userStake.lastRewardTime = block.timestamp;
        userStake.rewardDebt = 0;
        
        // Update pool info
        pool.totalStaked += _amount;
        
        emit Staked(msg.sender, _poolId, _amount, userStake.lockEndTime);
    }
    
    /**
     * @dev Unstake FBT tokens from a specific pool
     * @param _poolId Pool ID to unstake from
     */
    function unstake(uint256 _poolId) external {
        StakeInfo storage userStake = stakes[msg.sender][_poolId];
        require(userStake.amount > 0, "Vault: No stake found");
        require(block.timestamp >= userStake.lockEndTime, "Vault: Stake is still locked");
        
        PoolInfo storage pool = pools[_poolId];
        
        // Calculate and mint rewards
        uint256 reward = _calculateRewards(msg.sender, _poolId);
        uint256 stakedAmount = userStake.amount;
        
        // Update pool total
        pool.totalStaked -= stakedAmount;
        
        // Reset user stake
        delete stakes[msg.sender][_poolId];
        
        // Transfer staked tokens back to user
        require(fbtToken.transfer(msg.sender, stakedAmount), "Vault: Transfer failed");
        
        // Mint reward tokens
        if (reward > 0) {
            fbtToken.mint(msg.sender, reward, "staking_reward");
            totalClaimedRewards[msg.sender][_poolId] += reward;
        }
        
        emit Unstaked(msg.sender, _poolId, stakedAmount, reward);
    }
    
    /**
     * @dev Claim pending rewards without unstaking
     * @param _poolId Pool ID to claim rewards from
     */
    function claimRewards(uint256 _poolId) external {
        require(stakes[msg.sender][_poolId].amount > 0, "Vault: No stake found");
        _claimRewards(msg.sender, _poolId);
    }
    
    /**
     * @dev Internal function to claim rewards
     * @param _user User address
     * @param _poolId Pool ID
     */
    function _claimRewards(address _user, uint256 _poolId) internal {
        uint256 reward = _calculateRewards(_user, _poolId);
        
        if (reward > 0) {
            stakes[_user][_poolId].lastRewardTime = block.timestamp;
            stakes[_user][_poolId].rewardDebt = 0;
            
            fbtToken.mint(_user, reward, "staking_reward");
            totalClaimedRewards[_user][_poolId] += reward;
            
            emit RewardsClaimed(_user, _poolId, reward);
        }
    }
    
    /**
     * @dev Calculate pending rewards for a user
     * @param _user User address
     * @param _poolId Pool ID
     * @return reward Pending reward amount
     */
    function _calculateRewards(address _user, uint256 _poolId) internal view returns (uint256 reward) {
        StakeInfo storage userStake = stakes[_user][_poolId];
        PoolInfo storage pool = pools[_poolId];
        
        if (userStake.amount == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - userStake.lastRewardTime;
        
        // Calculate reward: (stakedAmount * rewardRate * stakingDuration) / (BASIS_POINTS * SECONDS_PER_YEAR)
        reward = (userStake.amount * pool.rewardRate * stakingDuration) / (BASIS_POINTS * SECONDS_PER_YEAR);
        
        return reward;
    }
    
    /**
     * @dev Get pending rewards for a user
     * @param _user User address
     * @param _poolId Pool ID
     * @return reward Pending reward amount
     */
    function getPendingRewards(address _user, uint256 _poolId) external view returns (uint256 reward) {
        return _calculateRewards(_user, _poolId);
    }
    
    /**
     * @dev Emergency withdraw - allows users to withdraw without rewards in case of emergency
     * @param _poolId Pool ID to emergency withdraw from
     */
    function emergencyWithdraw(uint256 _poolId) external {
        StakeInfo storage userStake = stakes[msg.sender][_poolId];
        require(userStake.amount > 0, "Vault: No stake found");
        
        uint256 amount = userStake.amount;
        PoolInfo storage pool = pools[_poolId];
        
        // Update pool total
        pool.totalStaked -= amount;
        
        // Reset user stake
        delete stakes[msg.sender][_poolId];
        
        // Transfer tokens back (no rewards)
        require(fbtToken.transfer(msg.sender, amount), "Vault: Transfer failed");
        
        emit EmergencyWithdraw(msg.sender, _poolId, amount);
    }
    
    /**
     * @dev Set pool active status
     * @param _poolId Pool ID
     * @param _active New active status
     */
    function setPoolActive(uint256 _poolId, bool _active) external onlyOwner {
        require(_poolId < nextPoolId, "Vault: Pool does not exist");
        pools[_poolId].active = _active;
        emit PoolStatusChanged(_poolId, _active);
    }
    
    /**
     * @dev Get pool information
     * @param _poolId Pool ID
     * @return pool Pool information
     */
    function getPoolInfo(uint256 _poolId) external view returns (PoolInfo memory pool) {
        require(_poolId < nextPoolId, "Vault: Pool does not exist");
        return pools[_poolId];
    }
    
    /**
     * @dev Get user stake information
     * @param _user User address
     * @param _poolId Pool ID
     * @return stakeInfo Stake information
     */
    function getUserStake(address _user, uint256 _poolId) external view returns (StakeInfo memory stakeInfo) {
        return stakes[_user][_poolId];
    }
    
    /**
     * @dev Get all active pools
     * @return activePools Array of active pool IDs
     */
    function getActivePools() external view returns (uint256[] memory activePools) {
        uint256 activeCount = 0;
        
        // Count active pools
        for (uint256 i = 0; i < nextPoolId; i++) {
            if (pools[i].active) {
                activeCount++;
            }
        }
        
        // Create array of active pool IDs
        activePools = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextPoolId; i++) {
            if (pools[i].active) {
                activePools[index] = i;
                index++;
            }
        }
        
        return activePools;
    }
    
    /**
     * @dev Get total value locked (TVL) across all pools
     * @return tvl Total value locked
     */
    function getTotalValueLocked() external view returns (uint256 tvl) {
        for (uint256 i = 0; i < nextPoolId; i++) {
            tvl += pools[i].totalStaked;
        }
        return tvl;
    }
}