# Deployment Guide

This directory contains comprehensive deployment scripts for the complete smart contract system including DEX, FBT tokens, and vault functionalities.

## 📋 Available Scripts

### 1. Simple Deployment
```bash
# Deploy with default configuration
npx hardhat run scripts/deploy.js

# Deploy to specific network
npx hardhat run scripts/deploy.js --network spicy
npx hardhat run scripts/deploy.js --network mainnet
```

### 2. Advanced Deployment
```bash
# Deploy with specific entity type
npx hardhat run scripts/deploy-system.js -- --entity-type sportsTeam
npx hardhat run scripts/deploy-system.js -- --entity-type musicArtist
npx hardhat run scripts/deploy-system.js -- --entity-type entertainment

# Skip initial setup (pools and prizes)
npx hardhat run scripts/deploy-system.js -- --skip-setup

# Skip liquidity token minting
npx hardhat run scripts/deploy-system.js -- --skip-liquidity

# Combine options
npx hardhat run scripts/deploy-system.js -- --entity-type sportsTeam --skip-liquidity --network spicy
```

### 3. Legacy Full Deployment
```bash
# Run the original comprehensive deployment
npx hardhat run scripts/deploy-complete-system.js
```

## 🏗️ What Gets Deployed

### Core Infrastructure
- **MockWCHZ**: Wrapped CHZ token (testnet only)
- **MockCAP20**: Mock ERC20 token for testing (testnet only)
- **UniswapV2Factory**: DEX factory for creating trading pairs
- **UniswapV2Router02**: DEX router for swaps and liquidity

### Token Ecosystem
- **FBTToken**: Fan Base Token with entity branding
- **Trading Pairs**: FBT-WCHZ and CAP20-WCHZ pairs

### Vault System
- **FBTStakingVault**: Token staking with time locks and rewards
- **PrizeRedemption**: Burn tokens to redeem prizes and merchandise

### Initial Configuration
- **Staking Pools**: Pre-configured pools with different lock periods and APY
- **Prizes**: Sample prizes for testing redemption functionality
- **Permissions**: Proper minting/burning authorizations between contracts

## 🌐 Network Configurations

### Hardhat Local (Default)
- Platform-focused configuration
- 3 staking pools (30d/5%, 90d/15%, 1y/30%)
- 2 basic prizes (T-shirt, VIP pass)
- 10,000 FBT initial mint

### Chiliz Spicy Testnet
- Sports-focused configuration
- 4 staking pools with higher APY
- 3 sports-themed prizes
- 100,000 FBT initial mint

### Chiliz Mainnet
- Entertainment-focused configuration
- Conservative staking APY
- Limited prize selection
- 1,000,000 FBT initial mint

## 📁 Entity Types

### Sports Team (`sportsTeam`)
```javascript
{
  symbol: "TFT",
  entityType: "sports",
  stakingPools: [
    { name: "Season Lock", duration: "6 months", apy: "15%" },
    { name: "Annual Lock", duration: "1 year", apy: "25%" }
  ],
  prizes: ["Match Tickets", "Team Jersey"]
}
```

### Music Artist (`musicArtist`)
```javascript
{
  symbol: "AFT", 
  entityType: "music",
  stakingPools: [
    { name: "Album Cycle", duration: "4 months", apy: "10%" },
    { name: "Tour Lock", duration: "8 months", apy: "20%" }
  ],
  prizes: ["Concert VIP Pass", "Signed Album"]
}
```

### Entertainment Platform (`entertainment`)
```javascript
{
  symbol: "PFT",
  entityType: "entertainment", 
  stakingPools: [
    { name: "Monthly Lock", duration: "1 month", apy: "5%" },
    { name: "Quarterly Lock", duration: "3 months", apy: "12%" },
    { name: "Semi-Annual Lock", duration: "6 months", apy: "20%" },
    { name: "Annual Lock", duration: "1 year", apy: "30%" }
  ],
  prizes: ["Premium Subscription", "Exclusive Content Access"]
}
```

## 📊 Deployment Output

Each deployment creates:
1. **Console Output**: Real-time deployment progress
2. **JSON File**: Complete deployment information in `./deployments/`
3. **Contract Addresses**: All deployed contract addresses
4. **Configuration**: Used configuration and parameters
5. **Gas Costs**: Total deployment cost in CHZ

### Sample Output Structure
```json
{
  "network": "spicy",
  "chainId": 1777,
  "deployer": "0x...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "contracts": {
    "FBTToken": "0x...",
    "UniswapV2Factory": "0x...",
    "FBTStakingVault": "0x...",
    "PrizeRedemption": "0x..."
  },
  "config": {...},
  "deploymentCost": "1500000000000000000",
  "stakingPools": [...],
  "prizes": [...]
}
```

## 🔧 Environment Setup

Ensure your `.env` file contains:
```
SPICY_RPC_URL=https://spicy-rpc.chiliz.com/
MAINNET_RPC_URL=https://rpc.chiliz.com/
PRIVATE_KEY=your_private_key_here
WCHZ_ADDRESS=0x... (for mainnet only)
```

## 🚨 Important Notes

1. **Testnet vs Mainnet**: Mock tokens are only deployed on testnets
2. **Gas Costs**: Mainnet deployments require sufficient CHZ for gas
3. **WCHZ Address**: Set `WCHZ_ADDRESS` in `.env` for mainnet deployments
4. **Permissions**: All contracts are owned by the deployer address
5. **Initial Tokens**: Deployer receives initial FBT mint for distribution

## 🎯 Post-Deployment Steps

1. **Verify Contracts**: Use Hardhat verify plugin
2. **Add Liquidity**: Use the router to add DEX liquidity
3. **Distribute Tokens**: Send FBT to users for staking/redemption
4. **Configure Frontend**: Use deployed addresses in your dApp
5. **Monitor System**: Check staking and redemption functionality

## 📞 Troubleshooting

### Common Issues
- **Insufficient Gas**: Increase gas limit in network config
- **WCHZ Missing**: Set WCHZ_ADDRESS for mainnet
- **Permission Errors**: Ensure deployer has owner privileges
- **Network Issues**: Check RPC URL and network connectivity

### Recovery
- Failed deployments save partial state to `deployments/`
- Check deployment JSON for successfully deployed contracts
- Resume deployment manually if needed

## 🔄 Upgrading

To upgrade the system:
1. Deploy new contract versions
2. Update permissions and connections
3. Migrate liquidity and user balances
4. Update frontend contract addresses

---

Built for the Chiliz ecosystem with ❤️