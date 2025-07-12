# 🧪 Complete Testing Guide

This guide provides all commands to test the celebrity crowdfunding platform across different environments.

## 🚀 Quick Start Commands

### 🏠 **Local Development (Recommended)**
```bash
# Basic quick test (5 minutes)
npx hardhat run scripts/quick-test.js

# Comprehensive local testing (10 minutes)
npx hardhat run scripts/test-local.js

# Manual test scenarios (15 minutes)
npx hardhat run scripts/manual-tests.js

# Advanced interactive scenarios (20 minutes)
npx hardhat run scripts/interactive-scenarios.js
```

### 🌐 **Testnet Deployment**
```bash
# Deploy and test on Chiliz Spicy testnet
npx hardhat run scripts/test-testnet.js --network spicy
```

### 🔴 **Mainnet Deployment**
```bash
# Deploy to Chiliz mainnet (PRODUCTION)
npx hardhat run scripts/test-mainnet.js --network mainnet
```

---

## 📋 Environment Setup

### 1. **Local Testing** (No setup required)
- Uses Hardhat's built-in accounts
- No external dependencies
- Perfect for development

### 2. **Testnet Testing** (Setup required)
```bash
# 1. Get CHZ from faucet
# Visit: https://faucet.chiliz.com/

# 2. Update .env file with your private key
PRIVATE_KEY=0x...your_private_key_here

# 3. Run testnet deployment
npx hardhat run scripts/test-testnet.js --network spicy
```

### 3. **Mainnet Deployment** (Production setup)
```bash
# 1. Ensure sufficient CHZ balance (5+ CHZ recommended)
# 2. Set WCHZ address in .env
WCHZ_ADDRESS=0x...official_wchz_address

# 3. Update private key for mainnet wallet
PRIVATE_KEY=0x...your_mainnet_private_key

# 4. Deploy to mainnet
npx hardhat run scripts/test-mainnet.js --network mainnet
```

---

## 🎯 What Each Script Tests

### 🏠 **Local Scripts**

#### `quick-test.js` - Basic Functionality
- ✅ Token operations (mint, transfer, approve)
- ✅ Single-user staking
- ✅ Prize redemption
- ✅ DEX setup (pair creation, liquidity)
- ⚠️ Trading setup (swap functions not implemented)

#### `test-local.js` - Multi-User Testing
- ✅ Multi-user token operations
- ✅ Multi-pool staking strategies
- ✅ Prize redemption competition
- ✅ DEX liquidity provision
- ✅ System statistics tracking

#### `manual-tests.js` - Comprehensive Scenarios
- ✅ 6 detailed test scenarios
- ✅ User journey simulation
- ✅ System health monitoring
- ✅ Final statistics and balances

#### `interactive-scenarios.js` - Advanced Testing
- ✅ New user onboarding
- ✅ Power user staking strategies
- ✅ Prize hunter optimization
- ✅ DEX trader journey
- ✅ Liquidity provider scenario
- ✅ Economic attack simulation
- ✅ System stress testing

### 🌐 **Testnet Script**

#### `test-testnet.js` - Production Validation
- ✅ Real network deployment
- ✅ Gas cost analysis
- ✅ Contract verification
- ✅ Single-account testing
- ✅ Network connectivity validation

### 🔴 **Mainnet Script**

#### `test-mainnet.js` - Production Deployment
- ✅ Full production deployment
- ✅ Security checklist validation
- ✅ Contract verification
- ✅ Cost calculation
- ✅ Post-deployment guidance

---

## 📊 Expected Test Results

### **Local Testing**
```
✅ Token operations working
✅ Staking vault operational
✅ Prize redemption functional
✅ DEX setup successful
⚠️ Trading limited (swap functions pending)
```

### **Testnet Results**
```
✅ Deployment successful
✅ Contracts verified
✅ Gas costs: ~0.5-2 CHZ
✅ All functions operational
✅ Ready for frontend integration
```

### **Mainnet Results**
```
✅ Production deployment complete
✅ All contracts live
✅ Gas costs: ~2-5 CHZ
✅ Security verified
✅ Ready for public use
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### Local Testing
```bash
# If tests fail, restart Hardhat node
npx hardhat node --reset

# Then run tests again
npx hardhat run scripts/test-local.js
```

#### Testnet Issues
```bash
# Check your CHZ balance
# Get CHZ from: https://faucet.chiliz.com/

# Verify network connectivity
npx hardhat console --network spicy
```

#### Mainnet Issues
```bash
# Ensure sufficient CHZ balance
# Check WCHZ_ADDRESS is set
# Verify private key is correct
# Test on testnet first
```

### **Error Solutions**

| Error | Solution |
|-------|----------|
| `HH101: Chain ID mismatch` | Update `hardhat.config.ts` with correct chain ID |
| `Insufficient balance` | Get CHZ from faucet or fund wallet |
| `Cannot read properties of undefined` | Check private key in `.env` |
| `WCHZ_ADDRESS not set` | Add WCHZ address for mainnet |
| `Timeout` | Check network connectivity |

---

## 🎯 Recommended Testing Flow

### **Development Phase**
```bash
1. npx hardhat run scripts/quick-test.js
2. npx hardhat run scripts/test-local.js
3. npx hardhat run scripts/manual-tests.js
```

### **Pre-Production**
```bash
1. Update .env with testnet private key
2. npx hardhat run scripts/test-testnet.js --network spicy
3. Verify all functions work on testnet
```

### **Production**
```bash
1. Update .env with mainnet configuration
2. npx hardhat run scripts/test-mainnet.js --network mainnet
3. Verify contracts on block explorer
4. Set up monitoring and alerts
```

---

## 🌟 Advanced Commands

### **Deployment Only**
```bash
# Deploy without testing
npx hardhat run scripts/deploy.js
npx hardhat run scripts/deploy-system.js

# Entity-specific deployments
npx hardhat run scripts/deploy-system.js -- --entity-type sportsTeam
npx hardhat run scripts/deploy-system.js -- --entity-type musicArtist
npx hardhat run scripts/deploy-system.js -- --entity-type entertainment
```

### **Network-Specific Deployment**
```bash
# Local with specific configuration
npx hardhat run scripts/deploy-system.js -- --entity-type sportsTeam --skip-liquidity

# Testnet with options
npx hardhat run scripts/deploy-system.js --network spicy -- --entity-type entertainment

# Mainnet deployment
npx hardhat run scripts/deploy-system.js --network mainnet -- --entity-type entertainment --skip-setup
```

---

## 🎉 Success Indicators

### **All Tests Passing**
- ✅ No error messages
- ✅ Contract addresses displayed
- ✅ Gas costs reasonable
- ✅ All functionalities working
- ✅ System statistics healthy

### **Ready for Production**
- ✅ Testnet deployment successful
- ✅ Frontend integration tested
- ✅ User acceptance testing complete
- ✅ Security audit completed
- ✅ Monitoring systems in place

---

**🎯 Your celebrity crowdfunding platform is ready to revolutionize fan engagement!**