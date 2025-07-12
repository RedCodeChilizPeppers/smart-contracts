// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FBTToken
 * @dev Fan Base Token (FBT) for crowdfunding stars (sport, music, cinema, bands, events)
 * This token can be staked to earn rewards and burned to redeem prizes/merch
 */
contract FBTToken is ERC20, Ownable {
    
    // Events
    event TokensBurned(address indexed user, uint256 amount, string reason);
    event TokensMinted(address indexed to, uint256 amount, string reason);
    
    // Token metadata
    string public entityName;
    string public entityType; // "sport", "music", "cinema", "band", "event"
    string public description;
    
    // Authorized contracts that can mint/burn tokens
    mapping(address => bool) public authorizedMinters;
    mapping(address => bool) public authorizedBurners;
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _entityName,
        string memory _entityType,
        string memory _description,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        entityName = _entityName;
        entityType = _entityType;
        description = _description;
    }
    
    /**
     * @dev Mint new tokens (authorized contracts only)
     * @param to Address to mint to
     * @param amount Amount to mint
     * @param reason Reason for minting (e.g., "staking_reward", "ico_distribution")
     */
    function mint(address to, uint256 amount, string memory reason) external {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "FBT: Not authorized to mint");
        require(to != address(0), "FBT: Cannot mint to zero address");
        require(amount > 0, "FBT: Amount must be greater than 0");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens from caller for prize/merch redemption
     * @param amount Amount to burn
     * @param reason Reason for burning (e.g., "merch_redemption", "prize_claim")
     */
    function burn(uint256 amount, string memory reason) external {
        require(amount > 0, "FBT: Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "FBT: Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, reason);
    }
    
    /**
     * @dev Burn tokens from a specific address (authorized contracts only)
     * @param from Address to burn from
     * @param amount Amount to burn
     * @param reason Reason for burning
     */
    function burnFrom(address from, uint256 amount, string memory reason) external {
        require(authorizedBurners[msg.sender] || msg.sender == owner(), "FBT: Not authorized to burn");
        require(amount > 0, "FBT: Amount must be greater than 0");
        require(balanceOf(from) >= amount, "FBT: Insufficient balance");
        
        _burn(from, amount);
        emit TokensBurned(from, amount, reason);
    }
    
    /**
     * @dev Add authorized minter
     * @param minter Address to authorize for minting
     */
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "FBT: Cannot authorize zero address");
        authorizedMinters[minter] = true;
    }
    
    /**
     * @dev Remove authorized minter
     * @param minter Address to remove minting authorization
     */
    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
    }
    
    /**
     * @dev Add authorized burner
     * @param burner Address to authorize for burning
     */
    function addAuthorizedBurner(address burner) external onlyOwner {
        require(burner != address(0), "FBT: Cannot authorize zero address");
        authorizedBurners[burner] = true;
    }
    
    /**
     * @dev Remove authorized burner
     * @param burner Address to remove burning authorization
     */
    function removeAuthorizedBurner(address burner) external onlyOwner {
        authorizedBurners[burner] = false;
    }
    
    /**
     * @dev Update entity information
     * @param _entityName New entity name
     * @param _entityType New entity type
     * @param _description New description
     */
    function updateEntityInfo(
        string memory _entityName,
        string memory _entityType,
        string memory _description
    ) external onlyOwner {
        entityName = _entityName;
        entityType = _entityType;
        description = _description;
    }
    
    /**
     * @dev Get entity information
     * @return name Entity name
     * @return entityType_ Entity type
     * @return desc Description
     */
    function getEntityInfo() external view returns (
        string memory name,
        string memory entityType_,
        string memory desc
    ) {
        return (entityName, entityType, description);
    }
}