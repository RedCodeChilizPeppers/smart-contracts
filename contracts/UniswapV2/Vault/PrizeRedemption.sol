// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../../FBTToken.sol";

/**
 * @title PrizeRedemption
 * @dev Contract for redeeming prizes and merchandise by burning FBT tokens
 */
contract PrizeRedemption is Ownable {
    
    // Structs
    struct Prize {
        string name;
        string description;
        uint256 cost;           // Cost in FBT tokens
        uint256 totalSupply;    // Total available quantity
        uint256 currentSupply;  // Current available quantity
        bool active;
        string imageUrl;
        string category;        // "merch", "experience", "digital", "exclusive"
    }
    
    struct RedemptionRecord {
        uint256 prizeId;
        uint256 timestamp;
        uint256 cost;
        string deliveryInfo;    // IPFS hash or delivery details
        bool fulfilled;
    }
    
    // State variables
    FBTToken public immutable fbtToken;
    
    // Prize ID => Prize Info
    mapping(uint256 => Prize) public prizes;
    
    // User => Redemption history
    mapping(address => RedemptionRecord[]) public userRedemptions;
    
    // Prize ID => Total redeemed count
    mapping(uint256 => uint256) public prizeRedeemedCount;
    
    uint256 public nextPrizeId;
    uint256 public totalPrizesCreated;
    uint256 public totalRedemptions;
    
    // Events
    event PrizeCreated(
        uint256 indexed prizeId,
        string name,
        uint256 cost,
        uint256 totalSupply,
        string category
    );
    event PrizeRedeemed(
        address indexed user,
        uint256 indexed prizeId,
        uint256 cost,
        uint256 timestamp
    );
    event PrizeUpdated(uint256 indexed prizeId, string name, uint256 cost, bool active);
    event RedemptionFulfilled(address indexed user, uint256 indexed prizeId, string deliveryInfo);
    event PrizeSupplyUpdated(uint256 indexed prizeId, uint256 newSupply);
    
    constructor(address _fbtToken, address _owner) Ownable(_owner) {
        require(_fbtToken != address(0), "PrizeRedemption: FBT token cannot be zero address");
        fbtToken = FBTToken(_fbtToken);
    }
    
    /**
     * @dev Create a new prize/merch item
     * @param _name Prize name
     * @param _description Prize description
     * @param _cost Cost in FBT tokens
     * @param _totalSupply Total available quantity (0 = unlimited)
     * @param _imageUrl Image URL or IPFS hash
     * @param _category Prize category
     */
    function createPrize(
        string memory _name,
        string memory _description,
        uint256 _cost,
        uint256 _totalSupply,
        string memory _imageUrl,
        string memory _category
    ) external onlyOwner {
        require(_cost > 0, "PrizeRedemption: Cost must be greater than 0");
        require(bytes(_name).length > 0, "PrizeRedemption: Name cannot be empty");
        
        uint256 prizeId = nextPrizeId++;
        totalPrizesCreated++;
        
        prizes[prizeId] = Prize({
            name: _name,
            description: _description,
            cost: _cost,
            totalSupply: _totalSupply,
            currentSupply: _totalSupply,
            active: true,
            imageUrl: _imageUrl,
            category: _category
        });
        
        emit PrizeCreated(prizeId, _name, _cost, _totalSupply, _category);
    }
    
    /**
     * @dev Redeem a prize by burning FBT tokens
     * @param _prizeId Prize ID to redeem
     */
    function redeemPrize(uint256 _prizeId) external {
        require(_prizeId < nextPrizeId, "PrizeRedemption: Prize does not exist");
        
        Prize storage prize = prizes[_prizeId];
        require(prize.active, "PrizeRedemption: Prize is not active");
        require(prize.currentSupply > 0 || prize.totalSupply == 0, "PrizeRedemption: Prize out of stock");
        require(fbtToken.balanceOf(msg.sender) >= prize.cost, "PrizeRedemption: Insufficient FBT balance");
        
        // Transfer tokens to this contract and burn them
        require(fbtToken.transferFrom(msg.sender, address(this), prize.cost), "PrizeRedemption: Transfer failed");
        fbtToken.burn(prize.cost, string(abi.encodePacked("prize_redemption_", _prizeId)));
        
        // Update supply if not unlimited
        if (prize.totalSupply > 0) {
            prize.currentSupply--;
        }
        
        // Record redemption
        userRedemptions[msg.sender].push(RedemptionRecord({
            prizeId: _prizeId,
            timestamp: block.timestamp,
            cost: prize.cost,
            deliveryInfo: "",
            fulfilled: false
        }));
        
        prizeRedeemedCount[_prizeId]++;
        totalRedemptions++;
        
        emit PrizeRedeemed(msg.sender, _prizeId, prize.cost, block.timestamp);
    }
    
    /**
     * @dev Update prize information
     * @param _prizeId Prize ID
     * @param _name New name
     * @param _description New description
     * @param _cost New cost
     * @param _active New active status
     * @param _imageUrl New image URL
     */
    function updatePrize(
        uint256 _prizeId,
        string memory _name,
        string memory _description,
        uint256 _cost,
        bool _active,
        string memory _imageUrl
    ) external onlyOwner {
        require(_prizeId < nextPrizeId, "PrizeRedemption: Prize does not exist");
        require(_cost > 0, "PrizeRedemption: Cost must be greater than 0");
        
        Prize storage prize = prizes[_prizeId];
        prize.name = _name;
        prize.description = _description;
        prize.cost = _cost;
        prize.active = _active;
        prize.imageUrl = _imageUrl;
        
        emit PrizeUpdated(_prizeId, _name, _cost, _active);
    }
    
    /**
     * @dev Update prize supply
     * @param _prizeId Prize ID
     * @param _newSupply New total supply
     */
    function updatePrizeSupply(uint256 _prizeId, uint256 _newSupply) external onlyOwner {
        require(_prizeId < nextPrizeId, "PrizeRedemption: Prize does not exist");
        
        Prize storage prize = prizes[_prizeId];
        uint256 redeemed = prizeRedeemedCount[_prizeId];
        
        require(_newSupply >= redeemed, "PrizeRedemption: New supply cannot be less than already redeemed");
        
        prize.totalSupply = _newSupply;
        prize.currentSupply = _newSupply - redeemed;
        
        emit PrizeSupplyUpdated(_prizeId, _newSupply);
    }
    
    /**
     * @dev Mark a redemption as fulfilled
     * @param _user User address
     * @param _redemptionIndex Redemption index in user's history
     * @param _deliveryInfo Delivery information or tracking details
     */
    function fulfillRedemption(
        address _user,
        uint256 _redemptionIndex,
        string memory _deliveryInfo
    ) external onlyOwner {
        require(_redemptionIndex < userRedemptions[_user].length, "PrizeRedemption: Invalid redemption index");
        
        RedemptionRecord storage redemption = userRedemptions[_user][_redemptionIndex];
        require(!redemption.fulfilled, "PrizeRedemption: Redemption already fulfilled");
        
        redemption.fulfilled = true;
        redemption.deliveryInfo = _deliveryInfo;
        
        emit RedemptionFulfilled(_user, redemption.prizeId, _deliveryInfo);
    }
    
    /**
     * @dev Get prize information
     * @param _prizeId Prize ID
     * @return prize Prize information
     */
    function getPrize(uint256 _prizeId) external view returns (Prize memory prize) {
        require(_prizeId < nextPrizeId, "PrizeRedemption: Prize does not exist");
        return prizes[_prizeId];
    }
    
    /**
     * @dev Get user's redemption history
     * @param _user User address
     * @return redemptions Array of redemption records
     */
    function getUserRedemptions(address _user) external view returns (RedemptionRecord[] memory redemptions) {
        return userRedemptions[_user];
    }
    
    /**
     * @dev Get user's redemption count
     * @param _user User address
     * @return count Number of redemptions
     */
    function getUserRedemptionCount(address _user) external view returns (uint256 count) {
        return userRedemptions[_user].length;
    }
    
    /**
     * @dev Get all active prizes
     * @return activePrizes Array of active prize IDs
     */
    function getActivePrizes() external view returns (uint256[] memory activePrizes) {
        uint256 activeCount = 0;
        
        // Count active prizes
        for (uint256 i = 0; i < nextPrizeId; i++) {
            if (prizes[i].active && (prizes[i].currentSupply > 0 || prizes[i].totalSupply == 0)) {
                activeCount++;
            }
        }
        
        // Create array of active prize IDs
        activePrizes = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextPrizeId; i++) {
            if (prizes[i].active && (prizes[i].currentSupply > 0 || prizes[i].totalSupply == 0)) {
                activePrizes[index] = i;
                index++;
            }
        }
        
        return activePrizes;
    }
    
    /**
     * @dev Get prizes by category
     * @param _category Category to filter by
     * @return categoryPrizes Array of prize IDs in the category
     */
    function getPrizesByCategory(string memory _category) external view returns (uint256[] memory categoryPrizes) {
        uint256 categoryCount = 0;
        
        // Count prizes in category
        for (uint256 i = 0; i < nextPrizeId; i++) {
            if (prizes[i].active && keccak256(bytes(prizes[i].category)) == keccak256(bytes(_category))) {
                categoryCount++;
            }
        }
        
        // Create array of category prize IDs
        categoryPrizes = new uint256[](categoryCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextPrizeId; i++) {
            if (prizes[i].active && keccak256(bytes(prizes[i].category)) == keccak256(bytes(_category))) {
                categoryPrizes[index] = i;
                index++;
            }
        }
        
        return categoryPrizes;
    }
    
    /**
     * @dev Get total FBT burned for redemptions
     * @return totalBurned Total FBT tokens burned
     */
    function getTotalFBTBurned() external view returns (uint256 totalBurned) {
        for (uint256 i = 0; i < nextPrizeId; i++) {
            totalBurned += prizeRedeemedCount[i] * prizes[i].cost;
        }
        return totalBurned;
    }
}