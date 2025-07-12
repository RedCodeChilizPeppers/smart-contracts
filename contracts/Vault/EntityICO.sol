// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../FBTToken.sol";
import "./MilestoneVesting.sol";
// Router imports removed for simplicity - liquidity can be added manually

/**
 * @title EntityICO
 * @dev ICO contract for celebrity/entity fundraising with automatic fund distribution
 * Distributes funds: 20% immediate payout, 30% liquidity pool, 50% milestone vesting
 */
contract EntityICO is Ownable, ReentrancyGuard {
    using Address for address payable;

    // Structs
    struct ICOConfig {
        uint256 targetAmount;          // Target CHZ to raise
        uint256 tokenPrice;            // CHZ per FBT token (in wei)
        uint256 minContribution;       // Minimum CHZ contribution
        uint256 maxContribution;       // Maximum CHZ contribution per user
        uint256 startTime;             // ICO start timestamp
        uint256 endTime;               // ICO end timestamp
        uint256 immediatePayoutPct;    // Percentage for immediate payout (basis points)
        uint256 liquidityPoolPct;      // Percentage for liquidity pool (basis points)
        uint256 vestingPct;            // Percentage for vesting (basis points)
        bool kycRequired;              // Whether KYC is required
    }
    
    struct Contribution {
        uint256 chzAmount;             // CHZ contributed
        uint256 fbtAmount;             // FBT tokens allocated
        bool claimed;                  // Whether tokens have been claimed
        bool kycVerified;              // Whether user passed KYC
    }

    // State variables
    FBTToken public immutable fbtToken;
    MilestoneVesting public vestingContract;
    // Uniswap integration removed for simplicity
    uint256 public liquidityReserve; // CHZ reserved for liquidity
    
    ICOConfig public icoConfig;
    
    // Entity information
    string public entityName;
    string public entityType;
    string public entityDescription;
    address public entityWallet;           // Where immediate payout goes
    
    // ICO state
    mapping(address => Contribution) public contributions;
    mapping(address => bool) public kycVerified;
    address[] public contributors;
    
    uint256 public totalRaised;
    uint256 public totalTokensAllocated;
    bool public icoFinalized;
    // Liquidity handling simplified
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_IMMEDIATE_PAYOUT = 2000;    // 20%
    uint256 public constant DEFAULT_LIQUIDITY_POOL = 3000;      // 30%
    uint256 public constant DEFAULT_VESTING = 5000;             // 50%
    
    // Events
    event ICOConfigured(
        uint256 targetAmount,
        uint256 tokenPrice,
        uint256 startTime,
        uint256 endTime
    );
    event ContributionMade(
        address indexed contributor,
        uint256 chzAmount,
        uint256 fbtAmount
    );
    event TokensClaimed(address indexed contributor, uint256 amount);
    event ICOFinalized(
        uint256 totalRaised,
        uint256 immediatePayoutAmount,
        uint256 liquidityAmount,
        uint256 vestingAmount
    );
    // Liquidity event removed for simplicity
    event KYCVerified(address indexed user);
    event FundsDistributed(
        address indexed entityWallet,
        uint256 immediateAmount,
        uint256 liquidityAmount,
        uint256 vestingAmount
    );

    constructor(
        address _fbtToken,
        string memory _entityName,
        string memory _entityType,
        string memory _entityDescription,
        address _entityWallet,
        address _owner
    ) Ownable(_owner) {
        require(_fbtToken != address(0), "EntityICO: FBT token cannot be zero address");
        require(_entityWallet != address(0), "EntityICO: Entity wallet cannot be zero address");
        
        fbtToken = FBTToken(_fbtToken);
        
        entityName = _entityName;
        entityType = _entityType;
        entityDescription = _entityDescription;
        entityWallet = _entityWallet;
        
        // Set default distribution percentages
        icoConfig.immediatePayoutPct = DEFAULT_IMMEDIATE_PAYOUT;
        icoConfig.liquidityPoolPct = DEFAULT_LIQUIDITY_POOL;
        icoConfig.vestingPct = DEFAULT_VESTING;
    }
    
    /**
     * @dev Configure ICO parameters
     */
    function configureICO(
        uint256 _targetAmount,
        uint256 _tokenPrice,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _startTime,
        uint256 _endTime,
        bool _kycRequired
    ) external onlyOwner {
        require(!icoFinalized, "EntityICO: ICO already finalized");
        require(_targetAmount > 0, "EntityICO: Target amount must be greater than 0");
        require(_tokenPrice > 0, "EntityICO: Token price must be greater than 0");
        require(_startTime > block.timestamp, "EntityICO: Start time must be in future");
        require(_endTime > _startTime, "EntityICO: End time must be after start time");
        require(_maxContribution >= _minContribution, "EntityICO: Max must be >= min contribution");
        
        icoConfig.targetAmount = _targetAmount;
        icoConfig.tokenPrice = _tokenPrice;
        icoConfig.minContribution = _minContribution;
        icoConfig.maxContribution = _maxContribution;
        icoConfig.startTime = _startTime;
        icoConfig.endTime = _endTime;
        icoConfig.kycRequired = _kycRequired;
        
        emit ICOConfigured(_targetAmount, _tokenPrice, _startTime, _endTime);
    }
    
    /**
     * @dev Set vesting contract address
     */
    function setVestingContract(address payable _vestingContract) external onlyOwner {
        require(_vestingContract != address(0), "EntityICO: Vesting contract cannot be zero address");
        require(address(vestingContract) == address(0), "EntityICO: Vesting contract already set");
        vestingContract = MilestoneVesting(_vestingContract);
    }
    
    /**
     * @dev Verify KYC for a user
     */
    function verifyKYC(address _user) external onlyOwner {
        require(_user != address(0), "EntityICO: User cannot be zero address");
        kycVerified[_user] = true;
        emit KYCVerified(_user);
    }
    
    /**
     * @dev Contribute CHZ to the ICO
     */
    function contribute() external payable nonReentrant {
        require(block.timestamp >= icoConfig.startTime, "EntityICO: ICO not started");
        require(block.timestamp <= icoConfig.endTime, "EntityICO: ICO ended");
        require(!icoFinalized, "EntityICO: ICO finalized");
        require(msg.value >= icoConfig.minContribution, "EntityICO: Below minimum contribution");
        require(msg.value <= icoConfig.maxContribution, "EntityICO: Above maximum contribution");
        
        if (icoConfig.kycRequired) {
            require(kycVerified[msg.sender], "EntityICO: KYC verification required");
        }
        
        uint256 remainingTarget = icoConfig.targetAmount - totalRaised;
        uint256 contributionAmount = msg.value;
        
        // Cap contribution to remaining target
        if (contributionAmount > remainingTarget) {
            contributionAmount = remainingTarget;
            // Refund excess
            payable(msg.sender).sendValue(msg.value - contributionAmount);
        }
        
        // Calculate FBT tokens to allocate
        uint256 fbtAmount = (contributionAmount * 1e18) / icoConfig.tokenPrice;
        
        // Update or create contribution
        Contribution storage userContribution = contributions[msg.sender];
        if (userContribution.chzAmount == 0) {
            contributors.push(msg.sender);
        }
        
        userContribution.chzAmount += contributionAmount;
        userContribution.fbtAmount += fbtAmount;
        userContribution.kycVerified = kycVerified[msg.sender];
        
        totalRaised += contributionAmount;
        totalTokensAllocated += fbtAmount;
        
        emit ContributionMade(msg.sender, contributionAmount, fbtAmount);
        
        // Auto-finalize if target reached
        if (totalRaised >= icoConfig.targetAmount) {
            _finalizeICO();
        }
    }
    
    /**
     * @dev Manually finalize ICO (callable by owner after end time)
     */
    function finalizeICO() external onlyOwner {
        require(block.timestamp > icoConfig.endTime, "EntityICO: ICO not ended");
        require(!icoFinalized, "EntityICO: ICO already finalized");
        _finalizeICO();
    }
    
    /**
     * @dev Internal function to finalize ICO and distribute funds
     */
    function _finalizeICO() internal {
        require(totalRaised > 0, "EntityICO: No funds raised");
        require(address(vestingContract) != address(0), "EntityICO: Vesting contract not set");
        
        icoFinalized = true;
        
        // Calculate distribution amounts
        uint256 immediateAmount = (totalRaised * icoConfig.immediatePayoutPct) / BASIS_POINTS;
        uint256 liquidityAmount = (totalRaised * icoConfig.liquidityPoolPct) / BASIS_POINTS;
        uint256 vestingAmount = totalRaised - immediateAmount - liquidityAmount;
        
        // Mint FBT tokens for liquidity and vesting
        uint256 liquidityFBT = (liquidityAmount * 1e18) / icoConfig.tokenPrice;
        uint256 vestingFBT = (vestingAmount * 1e18) / icoConfig.tokenPrice;
        
        // Distribute funds
        if (immediateAmount > 0) {
            payable(entityWallet).sendValue(immediateAmount);
        }
        
        if (liquidityAmount > 0) {
            liquidityReserve = liquidityAmount;
        }
        
        if (vestingAmount > 0) {
            vestingContract.initializeVesting{value: vestingAmount}(vestingAmount, vestingFBT);
        }
        
        emit ICOFinalized(totalRaised, immediateAmount, liquidityAmount, vestingAmount);
        emit FundsDistributed(entityWallet, immediateAmount, liquidityAmount, vestingAmount);
    }
    
    /**
     * @dev Get liquidity reserve amount
     */
    function getLiquidityReserve() external view returns (uint256) {
        return liquidityReserve;
    }
    
    /**
     * @dev Claim allocated FBT tokens
     */
    function claimTokens() external nonReentrant {
        require(icoFinalized, "EntityICO: ICO not finalized");
        
        Contribution storage userContribution = contributions[msg.sender];
        require(userContribution.fbtAmount > 0, "EntityICO: No tokens to claim");
        require(!userContribution.claimed, "EntityICO: Tokens already claimed");
        
        if (icoConfig.kycRequired) {
            require(userContribution.kycVerified, "EntityICO: KYC verification required");
        }
        
        userContribution.claimed = true;
        
        // Mint and transfer FBT tokens to user
        fbtToken.mint(msg.sender, userContribution.fbtAmount, "ico_allocation");
        
        emit TokensClaimed(msg.sender, userContribution.fbtAmount);
    }
    
    /**
     * @dev Emergency withdraw (only if ICO failed)
     */
    function emergencyWithdraw() external nonReentrant {
        require(block.timestamp > icoConfig.endTime, "EntityICO: ICO not ended");
        require(!icoFinalized, "EntityICO: ICO was finalized");
        require(totalRaised < icoConfig.targetAmount, "EntityICO: ICO was successful");
        
        Contribution storage userContribution = contributions[msg.sender];
        require(userContribution.chzAmount > 0, "EntityICO: No contribution to withdraw");
        require(!userContribution.claimed, "EntityICO: Already withdrawn");
        
        uint256 refundAmount = userContribution.chzAmount;
        userContribution.claimed = true;
        
        payable(msg.sender).sendValue(refundAmount);
    }
    
    /**
     * @dev Get ICO status information
     */
    function getICOStatus() external view returns (
        uint256 raised,
        uint256 target,
        uint256 tokensAllocated,
        uint256 remainingTime,
        bool finalized,
        uint256 liquidityReserve_
    ) {
        return (
            totalRaised,
            icoConfig.targetAmount,
            totalTokensAllocated,
            block.timestamp > icoConfig.endTime ? 0 : icoConfig.endTime - block.timestamp,
            icoFinalized,
            liquidityReserve
        );
    }
    
    /**
     * @dev Get contributor information
     */
    function getContribution(address _contributor) external view returns (
        uint256 chzAmount,
        uint256 fbtAmount,
        bool claimed,
        bool kycVerified_
    ) {
        Contribution memory contribution = contributions[_contributor];
        return (
            contribution.chzAmount,
            contribution.fbtAmount,
            contribution.claimed,
            contribution.kycVerified
        );
    }
    
    /**
     * @dev Get number of contributors
     */
    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }
    
    /**
     * @dev Get entity information
     */
    function getEntityInfo() external view returns (
        string memory name,
        string memory entityType_,
        string memory description,
        address wallet
    ) {
        return (entityName, entityType, entityDescription, entityWallet);
    }
}