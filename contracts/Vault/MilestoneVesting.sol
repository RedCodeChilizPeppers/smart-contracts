// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../FBTToken.sol";
import "./FanDAO.sol";

/**
 * @title MilestoneVesting
 * @dev Vesting contract that releases funds based on milestone completion
 * Integrates with DAO voting and oracle verification for milestone approval
 */
contract MilestoneVesting is Ownable, ReentrancyGuard {
    using Address for address payable;

    // Enums
    enum MilestoneStatus {
        Pending,
        InProgress,
        SubmittedForReview,
        Approved,
        Rejected,
        Released
    }
    
    enum MilestoneType {
        ProjectDeliverable,    // Album release, movie completion, etc.
        PerformanceMetric,     // Sales targets, streaming numbers
        TimeBasedDeadline,     // Fixed date milestones
        CommunityGoal,         // Fan engagement targets
        Custom                 // Other milestone types
    }

    // Structs
    struct Milestone {
        string title;
        string description;
        MilestoneType milestoneType;
        uint256 releaseAmount;        // CHZ amount to release
        uint256 fbtRewardAmount;      // FBT tokens to mint as reward
        uint256 deadline;             // Deadline timestamp
        MilestoneStatus status;
        uint256 createdAt;
        uint256 approvedAt;
        uint256 releasedAt;
        bytes32 evidenceHash;         // IPFS hash or evidence reference
        uint256 daoVoteId;           // Reference to DAO vote
        bool requiresOracle;          // Whether oracle verification is needed
        address oracleVerifier;       // Oracle contract address
        uint256 minimumVoteQuorum;    // Minimum voters needed
    }
    
    struct VestingInfo {
        uint256 totalAmount;          // Total CHZ in vesting
        uint256 totalFBTRewards;      // Total FBT rewards available
        uint256 releasedAmount;       // CHZ already released
        uint256 releasedFBTRewards;   // FBT rewards already released
        uint256 milestoneCount;       // Number of milestones
        address beneficiary;          // Entity wallet for releases
        bool initialized;             // Whether vesting is initialized
        uint256 emergencyReleaseTime; // Emergency release timestamp
    }

    // State variables
    FBTToken public immutable fbtToken;
    FanDAO public daoContract;
    mapping(address => bool) public authorizedInitializers;
    
    VestingInfo public vestingInfo;
    mapping(uint256 => Milestone) public milestones;
    mapping(bytes32 => uint256) public evidenceToMilestone;
    
    uint256 public nextMilestoneId;
    uint256 public constant EMERGENCY_DELAY = 365 days; // 1 year emergency delay
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event VestingInitialized(
        uint256 totalAmount,
        uint256 totalFBTRewards,
        address beneficiary
    );
    event MilestoneCreated(
        uint256 indexed milestoneId,
        string title,
        uint256 releaseAmount,
        uint256 deadline
    );
    event MilestoneSubmitted(
        uint256 indexed milestoneId,
        bytes32 evidenceHash,
        string evidence
    );
    event MilestoneApproved(
        uint256 indexed milestoneId,
        uint256 daoVoteId,
        uint256 approvedAt
    );
    event MilestoneRejected(
        uint256 indexed milestoneId,
        uint256 daoVoteId,
        string reason
    );
    event FundsReleased(
        uint256 indexed milestoneId,
        address beneficiary,
        uint256 chzAmount,
        uint256 fbtRewardAmount
    );
    event EmergencyRelease(
        address beneficiary,
        uint256 remainingAmount
    );
    event DAOContractUpdated(address newDAO);
    event MilestoneDeadlineExtended(
        uint256 indexed milestoneId,
        uint256 newDeadline
    );

    modifier onlyDAO() {
        require(msg.sender == address(daoContract), "MilestoneVesting: Only DAO can call");
        _;
    }

    modifier vestingInitialized() {
        require(vestingInfo.initialized, "MilestoneVesting: Vesting not initialized");
        _;
    }

    constructor(
        address _fbtToken,
        address _beneficiary,
        address _owner
    ) Ownable(_owner) {
        require(_fbtToken != address(0), "MilestoneVesting: FBT token cannot be zero address");
        require(_beneficiary != address(0), "MilestoneVesting: Beneficiary cannot be zero address");
        
        fbtToken = FBTToken(_fbtToken);
        vestingInfo.beneficiary = _beneficiary;
        vestingInfo.emergencyReleaseTime = block.timestamp + EMERGENCY_DELAY;
    }
    
    /**
     * @dev Initialize vesting with ICO funds
     */
    function initializeVesting(uint256 _chzAmount, uint256 _fbtRewards) external payable {
        require(
            msg.sender == owner() || authorizedInitializers[msg.sender], 
            "MilestoneVesting: Only owner or authorized contracts can initialize"
        );
        require(!vestingInfo.initialized, "MilestoneVesting: Already initialized");
        require(msg.value == _chzAmount, "MilestoneVesting: CHZ amount mismatch");
        require(_chzAmount > 0, "MilestoneVesting: Amount must be greater than 0");
        
        vestingInfo.totalAmount = _chzAmount;
        vestingInfo.totalFBTRewards = _fbtRewards;
        vestingInfo.initialized = true;
        
        emit VestingInitialized(_chzAmount, _fbtRewards, vestingInfo.beneficiary);
    }
    
    /**
     * @dev Set DAO contract address
     */
    function setDAOContract(address _daoContract) external onlyOwner {
        require(_daoContract != address(0), "MilestoneVesting: DAO contract cannot be zero address");
        daoContract = FanDAO(_daoContract);
        emit DAOContractUpdated(_daoContract);
    }
    
    /**
     * @dev Authorize a contract to initialize vesting
     */
    function authorizeInitializer(address _initializer) external onlyOwner {
        require(_initializer != address(0), "MilestoneVesting: Initializer cannot be zero address");
        authorizedInitializers[_initializer] = true;
    }
    
    /**
     * @dev Create a new milestone
     */
    function createMilestone(
        string memory _title,
        string memory _description,
        MilestoneType _milestoneType,
        uint256 _releaseAmount,
        uint256 _fbtRewardAmount,
        uint256 _deadline,
        bool _requiresOracle,
        address _oracleVerifier,
        uint256 _minimumVoteQuorum
    ) external onlyOwner vestingInitialized {
        require(bytes(_title).length > 0, "MilestoneVesting: Title cannot be empty");
        require(_releaseAmount > 0, "MilestoneVesting: Release amount must be greater than 0");
        require(_deadline > block.timestamp, "MilestoneVesting: Deadline must be in future");
        require(
            vestingInfo.releasedAmount + _releaseAmount <= vestingInfo.totalAmount,
            "MilestoneVesting: Insufficient vesting balance"
        );
        require(
            vestingInfo.releasedFBTRewards + _fbtRewardAmount <= vestingInfo.totalFBTRewards,
            "MilestoneVesting: Insufficient FBT rewards"
        );
        
        if (_requiresOracle) {
            require(_oracleVerifier != address(0), "MilestoneVesting: Oracle verifier required");
        }
        
        uint256 milestoneId = nextMilestoneId++;
        
        milestones[milestoneId] = Milestone({
            title: _title,
            description: _description,
            milestoneType: _milestoneType,
            releaseAmount: _releaseAmount,
            fbtRewardAmount: _fbtRewardAmount,
            deadline: _deadline,
            status: MilestoneStatus.Pending,
            createdAt: block.timestamp,
            approvedAt: 0,
            releasedAt: 0,
            evidenceHash: bytes32(0),
            daoVoteId: 0,
            requiresOracle: _requiresOracle,
            oracleVerifier: _oracleVerifier,
            minimumVoteQuorum: _minimumVoteQuorum
        });
        
        vestingInfo.milestoneCount++;
        
        emit MilestoneCreated(milestoneId, _title, _releaseAmount, _deadline);
    }
    
    /**
     * @dev Submit milestone for review with evidence
     */
    function submitMilestoneForReview(
        uint256 _milestoneId,
        bytes32 _evidenceHash,
        string memory _evidenceDescription
    ) external onlyOwner {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Pending || milestone.status == MilestoneStatus.InProgress,
            "MilestoneVesting: Invalid milestone status"
        );
        require(_evidenceHash != bytes32(0), "MilestoneVesting: Evidence hash required");
        
        milestone.status = MilestoneStatus.SubmittedForReview;
        milestone.evidenceHash = _evidenceHash;
        evidenceToMilestone[_evidenceHash] = _milestoneId;
        
        emit MilestoneSubmitted(_milestoneId, _evidenceHash, _evidenceDescription);
        
        // Trigger DAO vote if DAO contract is set
        if (address(daoContract) != address(0)) {
            uint256 daoVoteId = daoContract.createMilestoneVote(
                _milestoneId,
                milestone.title,
                _evidenceDescription,
                milestone.minimumVoteQuorum
            );
            milestone.daoVoteId = daoVoteId;
        }
    }
    
    /**
     * @dev Approve milestone (called by DAO)
     */
    function approveMilestone(uint256 _milestoneId, uint256 _daoVoteId) external onlyDAO {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.SubmittedForReview, "MilestoneVesting: Invalid status");
        require(milestone.daoVoteId == _daoVoteId, "MilestoneVesting: DAO vote ID mismatch");
        
        milestone.status = MilestoneStatus.Approved;
        milestone.approvedAt = block.timestamp;
        
        emit MilestoneApproved(_milestoneId, _daoVoteId, block.timestamp);
        
        // Auto-release funds
        _releaseMilestoneFunds(_milestoneId);
    }
    
    /**
     * @dev Reject milestone (called by DAO)
     */
    function rejectMilestone(
        uint256 _milestoneId,
        uint256 _daoVoteId,
        string memory _reason
    ) external onlyDAO {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.SubmittedForReview, "MilestoneVesting: Invalid status");
        require(milestone.daoVoteId == _daoVoteId, "MilestoneVesting: DAO vote ID mismatch");
        
        milestone.status = MilestoneStatus.Rejected;
        
        emit MilestoneRejected(_milestoneId, _daoVoteId, _reason);
    }
    
    /**
     * @dev Internal function to release milestone funds
     */
    function _releaseMilestoneFunds(uint256 _milestoneId) internal {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.Approved, "MilestoneVesting: Not approved");
        
        milestone.status = MilestoneStatus.Released;
        milestone.releasedAt = block.timestamp;
        
        // Update vesting info
        vestingInfo.releasedAmount += milestone.releaseAmount;
        vestingInfo.releasedFBTRewards += milestone.fbtRewardAmount;
        
        // Release CHZ funds
        if (milestone.releaseAmount > 0) {
            payable(vestingInfo.beneficiary).sendValue(milestone.releaseAmount);
        }
        
        // Release FBT reward tokens
        if (milestone.fbtRewardAmount > 0) {
            fbtToken.mint(vestingInfo.beneficiary, milestone.fbtRewardAmount, "milestone_reward");
        }
        
        emit FundsReleased(
            _milestoneId,
            vestingInfo.beneficiary,
            milestone.releaseAmount,
            milestone.fbtRewardAmount
        );
    }
    
    /**
     * @dev Emergency release of all remaining funds (after delay)
     */
    function emergencyRelease() external onlyOwner nonReentrant {
        require(block.timestamp >= vestingInfo.emergencyReleaseTime, "MilestoneVesting: Emergency delay not met");
        require(vestingInfo.initialized, "MilestoneVesting: Not initialized");
        
        uint256 remainingAmount = vestingInfo.totalAmount - vestingInfo.releasedAmount;
        require(remainingAmount > 0, "MilestoneVesting: No funds to release");
        
        vestingInfo.releasedAmount = vestingInfo.totalAmount;
        payable(vestingInfo.beneficiary).sendValue(remainingAmount);
        
        emit EmergencyRelease(vestingInfo.beneficiary, remainingAmount);
    }
    
    /**
     * @dev Extend milestone deadline
     */
    function extendMilestoneDeadline(uint256 _milestoneId, uint256 _newDeadline) external onlyOwner {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        require(_newDeadline > block.timestamp, "MilestoneVesting: New deadline must be in future");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Pending || milestone.status == MilestoneStatus.InProgress,
            "MilestoneVesting: Cannot extend deadline for this status"
        );
        require(_newDeadline > milestone.deadline, "MilestoneVesting: New deadline must be later");
        
        milestone.deadline = _newDeadline;
        emit MilestoneDeadlineExtended(_milestoneId, _newDeadline);
    }
    
    /**
     * @dev Update milestone status to in progress
     */
    function startMilestone(uint256 _milestoneId) external onlyOwner {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.Pending, "MilestoneVesting: Milestone not pending");
        
        milestone.status = MilestoneStatus.InProgress;
    }
    
    /**
     * @dev Get milestone information
     */
    function getMilestone(uint256 _milestoneId) external view returns (
        string memory title,
        string memory description,
        MilestoneType milestoneType,
        uint256 releaseAmount,
        uint256 fbtRewardAmount,
        uint256 deadline,
        MilestoneStatus status,
        bytes32 evidenceHash,
        bool requiresOracle
    ) {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        
        Milestone memory milestone = milestones[_milestoneId];
        return (
            milestone.title,
            milestone.description,
            milestone.milestoneType,
            milestone.releaseAmount,
            milestone.fbtRewardAmount,
            milestone.deadline,
            milestone.status,
            milestone.evidenceHash,
            milestone.requiresOracle
        );
    }
    
    /**
     * @dev Get vesting summary
     */
    function getVestingSummary() external view returns (
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 remainingAmount,
        uint256 totalFBTRewards,
        uint256 releasedFBTRewards,
        uint256 milestoneCount,
        address beneficiary
    ) {
        return (
            vestingInfo.totalAmount,
            vestingInfo.releasedAmount,
            vestingInfo.totalAmount - vestingInfo.releasedAmount,
            vestingInfo.totalFBTRewards,
            vestingInfo.releasedFBTRewards,
            vestingInfo.milestoneCount,
            vestingInfo.beneficiary
        );
    }
    
    /**
     * @dev Get milestones by status
     */
    function getMilestonesByStatus(MilestoneStatus _status) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count milestones with given status
        for (uint256 i = 0; i < nextMilestoneId; i++) {
            if (milestones[i].status == _status) {
                count++;
            }
        }
        
        // Create array of milestone IDs
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextMilestoneId; i++) {
            if (milestones[i].status == _status) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Check if milestone is overdue
     */
    function isMilestoneOverdue(uint256 _milestoneId) external view returns (bool) {
        require(_milestoneId < nextMilestoneId, "MilestoneVesting: Milestone does not exist");
        
        Milestone memory milestone = milestones[_milestoneId];
        return (
            milestone.status != MilestoneStatus.Released &&
            milestone.status != MilestoneStatus.Approved &&
            block.timestamp > milestone.deadline
        );
    }
    
    receive() external payable {
        // Allow contract to receive CHZ
    }
}