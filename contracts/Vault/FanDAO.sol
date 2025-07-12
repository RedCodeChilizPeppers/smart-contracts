// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../FBTToken.sol";
import "./MilestoneVesting.sol";

/**
 * @title FanDAO
 * @dev Decentralized governance for milestone approval using FBT token voting
 * Enables community-driven decision making for milestone completion verification
 */
contract FanDAO is Ownable, ReentrancyGuard {

    // Enums
    enum VoteType {
        MilestoneApproval,      // Vote on milestone completion
        ParameterChange,        // Vote on contract parameters
        EntityAction,           // Vote on entity-specific actions
        Emergency               // Emergency governance actions
    }
    
    enum VoteStatus {
        Active,
        Passed,
        Failed,
        Executed,
        Cancelled
    }

    // Structs
    struct Vote {
        uint256 id;
        VoteType voteType;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 totalVotingPower;
        uint256 minimumQuorum;
        VoteStatus status;
        uint256 milestoneId;           // For milestone votes
        bytes executionData;           // For parameter changes
        bool executed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voterPower;
        mapping(address => bool) voteChoice; // true = for, false = against
    }
    
    struct VoterInfo {
        uint256 votingPower;
        uint256 delegatedPower;
        address delegatedTo;
        uint256 lastVoteTime;
        uint256 totalVotesCast;
        uint256 totalRewardsEarned;
    }
    
    struct DAOConfig {
        uint256 votingPeriod;          // Duration of voting in seconds
        uint256 minimumQuorum;         // Minimum % of tokens needed to vote (basis points)
        uint256 passingThreshold;      // % of votes needed to pass (basis points)
        uint256 proposalDeposit;       // FBT tokens required to create proposal
        uint256 votingRewardRate;      // Reward rate for voters (basis points)
        uint256 minimumVotingPower;    // Minimum FBT needed to vote
        bool emergencyMode;            // Emergency governance mode
    }

    // State variables
    FBTToken public immutable fbtToken;
    MilestoneVesting public vestingContract;
    
    DAOConfig public daoConfig;
    
    mapping(uint256 => Vote) public votes;
    mapping(address => VoterInfo) public voterInfo;
    mapping(address => uint256[]) public userVotes;
    
    uint256 public nextVoteId;
    uint256 public totalVotingRewards;
    uint256 public activeVotesCount;
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_VOTING_PERIOD = 7 days;
    uint256 public constant DEFAULT_MINIMUM_QUORUM = 1000;    // 10%
    uint256 public constant DEFAULT_PASSING_THRESHOLD = 5100; // 51%
    uint256 public constant DEFAULT_VOTING_REWARD_RATE = 100; // 1%
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    
    // Events
    event VoteCreated(
        uint256 indexed voteId,
        VoteType voteType,
        string title,
        address proposer,
        uint256 endTime
    );
    event VoteCast(
        uint256 indexed voteId,
        address indexed voter,
        bool choice,
        uint256 votingPower
    );
    event VoteExecuted(
        uint256 indexed voteId,
        VoteStatus result,
        uint256 forVotes,
        uint256 againstVotes
    );
    event MilestoneVoteResolved(
        uint256 indexed voteId,
        uint256 indexed milestoneId,
        bool approved
    );
    event VotingRewardDistributed(
        address indexed voter,
        uint256 amount,
        uint256 voteId
    );
    event DAOConfigUpdated(
        uint256 votingPeriod,
        uint256 minimumQuorum,
        uint256 passingThreshold
    );
    event VotingPowerDelegated(
        address indexed delegator,
        address indexed delegatee,
        uint256 amount
    );
    event EmergencyModeToggled(bool enabled);

    modifier onlyActiveVote(uint256 _voteId) {
        require(_voteId < nextVoteId, "FanDAO: Vote does not exist");
        require(votes[_voteId].status == VoteStatus.Active, "FanDAO: Vote not active");
        require(block.timestamp <= votes[_voteId].endTime, "FanDAO: Voting period ended");
        _;
    }

    modifier hasVotingPower(address _voter) {
        uint256 power = getVotingPower(_voter);
        require(power >= daoConfig.minimumVotingPower, "FanDAO: Insufficient voting power");
        _;
    }

    constructor(
        address _fbtToken,
        address _owner
    ) Ownable(_owner) {
        require(_fbtToken != address(0), "FanDAO: FBT token cannot be zero address");
        
        fbtToken = FBTToken(_fbtToken);
        
        // Set default DAO configuration
        daoConfig.votingPeriod = DEFAULT_VOTING_PERIOD;
        daoConfig.minimumQuorum = DEFAULT_MINIMUM_QUORUM;
        daoConfig.passingThreshold = DEFAULT_PASSING_THRESHOLD;
        daoConfig.proposalDeposit = 100 * 1e18; // 100 FBT
        daoConfig.votingRewardRate = DEFAULT_VOTING_REWARD_RATE;
        daoConfig.minimumVotingPower = 10 * 1e18; // 10 FBT minimum
    }
    
    /**
     * @dev Set vesting contract address
     */
    function setVestingContract(address payable _vestingContract) external onlyOwner {
        require(_vestingContract != address(0), "FanDAO: Vesting contract cannot be zero address");
        vestingContract = MilestoneVesting(_vestingContract);
    }
    
    /**
     * @dev Create a milestone approval vote
     */
    function createMilestoneVote(
        uint256 _milestoneId,
        string memory _title,
        string memory _description,
        uint256 _minimumQuorum
    ) external returns (uint256 voteId) {
        require(
            msg.sender == address(vestingContract) || msg.sender == owner(),
            "FanDAO: Only vesting contract or owner"
        );
        
        voteId = _createVote(
            VoteType.MilestoneApproval,
            _title,
            _description,
            _minimumQuorum > 0 ? _minimumQuorum : daoConfig.minimumQuorum,
            msg.sender
        );
        
        votes[voteId].milestoneId = _milestoneId;
        return voteId;
    }
    
    /**
     * @dev Create a general governance vote
     */
    function createProposal(
        VoteType _voteType,
        string memory _title,
        string memory _description,
        bytes memory _executionData
    ) external hasVotingPower(msg.sender) returns (uint256 voteId) {
        require(_voteType != VoteType.MilestoneApproval, "FanDAO: Use createMilestoneVote for milestones");
        
        // Require proposal deposit
        if (daoConfig.proposalDeposit > 0) {
            require(
                fbtToken.transferFrom(msg.sender, address(this), daoConfig.proposalDeposit),
                "FanDAO: Proposal deposit transfer failed"
            );
        }
        
        voteId = _createVote(
            _voteType,
            _title,
            _description,
            daoConfig.minimumQuorum,
            msg.sender
        );
        
        votes[voteId].executionData = _executionData;
        return voteId;
    }
    
    /**
     * @dev Internal function to create a vote
     */
    function _createVote(
        VoteType _voteType,
        string memory _title,
        string memory _description,
        uint256 _minimumQuorum,
        address _proposer
    ) internal returns (uint256 voteId) {
        require(bytes(_title).length > 0, "FanDAO: Title cannot be empty");
        require(_minimumQuorum <= BASIS_POINTS, "FanDAO: Invalid quorum");
        
        voteId = nextVoteId++;
        Vote storage vote = votes[voteId];
        
        vote.id = voteId;
        vote.voteType = _voteType;
        vote.title = _title;
        vote.description = _description;
        vote.proposer = _proposer;
        vote.startTime = block.timestamp;
        vote.endTime = block.timestamp + daoConfig.votingPeriod;
        vote.minimumQuorum = _minimumQuorum;
        vote.status = VoteStatus.Active;
        vote.totalVotingPower = fbtToken.totalSupply();
        
        activeVotesCount++;
        userVotes[_proposer].push(voteId);
        
        emit VoteCreated(voteId, _voteType, _title, _proposer, vote.endTime);
        
        return voteId;
    }
    
    /**
     * @dev Cast a vote
     */
    function castVote(uint256 _voteId, bool _choice) external onlyActiveVote(_voteId) hasVotingPower(msg.sender) nonReentrant {
        Vote storage vote = votes[_voteId];
        require(!vote.hasVoted[msg.sender], "FanDAO: Already voted");
        
        uint256 votingPower = getVotingPower(msg.sender);
        
        vote.hasVoted[msg.sender] = true;
        vote.voterPower[msg.sender] = votingPower;
        vote.voteChoice[msg.sender] = _choice;
        
        if (_choice) {
            vote.forVotes += votingPower;
        } else {
            vote.againstVotes += votingPower;
        }
        
        // Update voter info
        VoterInfo storage voter = voterInfo[msg.sender];
        voter.lastVoteTime = block.timestamp;
        voter.totalVotesCast++;
        userVotes[msg.sender].push(_voteId);
        
        emit VoteCast(_voteId, msg.sender, _choice, votingPower);
        
        // Distribute voting reward
        _distributeVotingReward(msg.sender, votingPower, _voteId);
    }
    
    /**
     * @dev Execute a vote after voting period ends
     */
    function executeVote(uint256 _voteId) external nonReentrant {
        require(_voteId < nextVoteId, "FanDAO: Vote does not exist");
        
        Vote storage vote = votes[_voteId];
        require(vote.status == VoteStatus.Active, "FanDAO: Vote not active");
        require(block.timestamp > vote.endTime, "FanDAO: Voting period not ended");
        require(!vote.executed, "FanDAO: Vote already executed");
        
        vote.executed = true;
        activeVotesCount--;
        
        // Check quorum
        uint256 totalVotesCast = vote.forVotes + vote.againstVotes;
        uint256 requiredQuorum = (vote.totalVotingPower * vote.minimumQuorum) / BASIS_POINTS;
        
        bool quorumMet = totalVotesCast >= requiredQuorum;
        bool passed = false;
        
        if (quorumMet) {
            uint256 requiredVotes = (totalVotesCast * daoConfig.passingThreshold) / BASIS_POINTS;
            passed = vote.forVotes >= requiredVotes;
        }
        
        if (passed) {
            vote.status = VoteStatus.Passed;
            _executeVoteAction(_voteId);
        } else {
            vote.status = VoteStatus.Failed;
        }
        
        emit VoteExecuted(_voteId, vote.status, vote.forVotes, vote.againstVotes);
    }
    
    /**
     * @dev Internal function to execute vote-specific actions
     */
    function _executeVoteAction(uint256 _voteId) internal {
        Vote storage vote = votes[_voteId];
        
        if (vote.voteType == VoteType.MilestoneApproval) {
            // Approve milestone in vesting contract
            if (address(vestingContract) != address(0)) {
                vestingContract.approveMilestone(vote.milestoneId, _voteId);
                emit MilestoneVoteResolved(_voteId, vote.milestoneId, true);
            }
        }
        // Add other vote type executions here as needed
        
        vote.status = VoteStatus.Executed;
    }
    
    /**
     * @dev Distribute voting rewards to participants
     */
    function _distributeVotingReward(address _voter, uint256 _votingPower, uint256 _voteId) internal {
        if (daoConfig.votingRewardRate == 0) return;
        
        // Calculate reward based on voting power and reward rate
        uint256 rewardAmount = (_votingPower * daoConfig.votingRewardRate) / BASIS_POINTS;
        
        if (rewardAmount > 0) {
            fbtToken.mint(_voter, rewardAmount, "dao_voting_reward");
            
            voterInfo[_voter].totalRewardsEarned += rewardAmount;
            totalVotingRewards += rewardAmount;
            
            emit VotingRewardDistributed(_voter, rewardAmount, _voteId);
        }
    }
    
    /**
     * @dev Delegate voting power to another address
     */
    function delegateVotingPower(address _delegatee) external {
        require(_delegatee != address(0), "FanDAO: Cannot delegate to zero address");
        require(_delegatee != msg.sender, "FanDAO: Cannot delegate to self");
        
        uint256 userBalance = fbtToken.balanceOf(msg.sender);
        require(userBalance > 0, "FanDAO: No tokens to delegate");
        
        VoterInfo storage delegator = voterInfo[msg.sender];
        VoterInfo storage delegatee = voterInfo[_delegatee];
        
        // Remove previous delegation
        if (delegator.delegatedTo != address(0)) {
            voterInfo[delegator.delegatedTo].delegatedPower -= userBalance;
        }
        
        // Set new delegation
        delegator.delegatedTo = _delegatee;
        delegatee.delegatedPower += userBalance;
        
        emit VotingPowerDelegated(msg.sender, _delegatee, userBalance);
    }
    
    /**
     * @dev Remove delegation and return voting power to self
     */
    function removeDelegation() external {
        VoterInfo storage delegator = voterInfo[msg.sender];
        require(delegator.delegatedTo != address(0), "FanDAO: No delegation to remove");
        
        address previousDelegatee = delegator.delegatedTo;
        uint256 userBalance = fbtToken.balanceOf(msg.sender);
        
        voterInfo[previousDelegatee].delegatedPower -= userBalance;
        delegator.delegatedTo = address(0);
        
        emit VotingPowerDelegated(msg.sender, address(0), userBalance);
    }
    
    /**
     * @dev Get effective voting power for an address
     */
    function getVotingPower(address _voter) public view returns (uint256) {
        uint256 ownTokens = fbtToken.balanceOf(_voter);
        uint256 delegatedTokens = voterInfo[_voter].delegatedPower;
        return ownTokens + delegatedTokens;
    }
    
    /**
     * @dev Update DAO configuration (requires governance vote)
     */
    function updateDAOConfig(
        uint256 _votingPeriod,
        uint256 _minimumQuorum,
        uint256 _passingThreshold,
        uint256 _proposalDeposit,
        uint256 _votingRewardRate,
        uint256 _minimumVotingPower
    ) external onlyOwner {
        require(_votingPeriod >= MIN_VOTING_PERIOD && _votingPeriod <= MAX_VOTING_PERIOD, "FanDAO: Invalid voting period");
        require(_minimumQuorum <= BASIS_POINTS, "FanDAO: Invalid quorum");
        require(_passingThreshold > BASIS_POINTS / 2 && _passingThreshold <= BASIS_POINTS, "FanDAO: Invalid threshold");
        require(_votingRewardRate <= 1000, "FanDAO: Reward rate too high"); // Max 10%
        
        daoConfig.votingPeriod = _votingPeriod;
        daoConfig.minimumQuorum = _minimumQuorum;
        daoConfig.passingThreshold = _passingThreshold;
        daoConfig.proposalDeposit = _proposalDeposit;
        daoConfig.votingRewardRate = _votingRewardRate;
        daoConfig.minimumVotingPower = _minimumVotingPower;
        
        emit DAOConfigUpdated(_votingPeriod, _minimumQuorum, _passingThreshold);
    }
    
    /**
     * @dev Toggle emergency mode
     */
    function toggleEmergencyMode() external onlyOwner {
        daoConfig.emergencyMode = !daoConfig.emergencyMode;
        emit EmergencyModeToggled(daoConfig.emergencyMode);
    }
    
    /**
     * @dev Get vote information
     */
    function getVote(uint256 _voteId) external view returns (
        string memory title,
        string memory description,
        VoteType voteType,
        VoteStatus status,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 endTime,
        address proposer
    ) {
        require(_voteId < nextVoteId, "FanDAO: Vote does not exist");
        
        Vote storage vote = votes[_voteId];
        return (
            vote.title,
            vote.description,
            vote.voteType,
            vote.status,
            vote.forVotes,
            vote.againstVotes,
            vote.endTime,
            vote.proposer
        );
    }
    
    /**
     * @dev Get user's vote on a specific proposal
     */
    function getUserVote(uint256 _voteId, address _user) external view returns (
        bool hasVoted,
        bool choice,
        uint256 votingPower
    ) {
        require(_voteId < nextVoteId, "FanDAO: Vote does not exist");
        
        Vote storage vote = votes[_voteId];
        return (
            vote.hasVoted[_user],
            vote.voteChoice[_user],
            vote.voterPower[_user]
        );
    }
    
    /**
     * @dev Get active votes
     */
    function getActiveVotes() external view returns (uint256[] memory) {
        uint256[] memory activeVotes = new uint256[](activeVotesCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextVoteId; i++) {
            if (votes[i].status == VoteStatus.Active && block.timestamp <= votes[i].endTime) {
                activeVotes[index] = i;
                index++;
            }
        }
        
        return activeVotes;
    }
    
    /**
     * @dev Get user's voting history
     */
    function getUserVotingHistory(address _user) external view returns (uint256[] memory) {
        return userVotes[_user];
    }
    
    /**
     * @dev Get DAO statistics
     */
    function getDAOStats() external view returns (
        uint256 totalVotes,
        uint256 activeVotes,
        uint256 totalVotingRewards_,
        uint256 totalVotingPower
    ) {
        return (
            nextVoteId,
            activeVotesCount,
            totalVotingRewards,
            fbtToken.totalSupply()
        );
    }
}