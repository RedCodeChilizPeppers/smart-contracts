const hre = require("hardhat");
const { parseEther } = require("viem");
const { getConfig, GAS_CONFIGS } = require("./deploy-config");

async function deployCompleteSystem(options = {}) {
  const {
    network = hre.network.name,
    entityType = null,
    skipInitialSetup = false,
    skipLiquidityMinting = false,
    customConfig = null
  } = options;

  console.log("🚀 Complete System Deployment");
  console.log("==============================\n");

  // Get configuration
  const config = customConfig || getConfig(network, entityType);
  console.log(`📋 Network: ${config.name}`);
  console.log(`🎯 Entity Type: ${entityType || 'default'}`);
  
  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  console.log(`👤 Deployer: ${deployer.account.address}`);
  
  // Get initial balance
  const publicClient = await hre.viem.getPublicClient();
  const initialBalance = await publicClient.getBalance({
    address: deployer.account.address
  });
  console.log(`💰 Initial Balance: ${(initialBalance / BigInt(1e18)).toString()} CHZ\n`);

  const contracts = {};
  const deploymentInfo = {
    network: hre.network.name,
    chainId: await publicClient.getChainId(),
    deployer: deployer.account.address,
    timestamp: new Date().toISOString(),
    config: config,
    contracts: {}
  };

  try {
    // ===========================================
    // PHASE 1: CORE INFRASTRUCTURE
    // ===========================================
    console.log("🏗️ PHASE 1: Core Infrastructure");
    console.log("---------------------------------");

    // Deploy Mock Tokens (for testnets and development)
    if (network !== 'mainnet') {
      console.log("Deploying MockWCHZ...");
      contracts.mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
      console.log(`✅ MockWCHZ: ${contracts.mockWCHZ.address}`);
      deploymentInfo.contracts.MockWCHZ = contracts.mockWCHZ.address;

      console.log("Deploying MockCAP20...");
      contracts.mockCAP20 = await hre.viem.deployContract("MockCAP20", []);
      console.log(`✅ MockCAP20: ${contracts.mockCAP20.address}`);
      deploymentInfo.contracts.MockCAP20 = contracts.mockCAP20.address;

      console.log("Deploying MockPSG...");
      contracts.mockPSG = await hre.viem.deployContract("MockPSG", []);
      console.log(`✅ MockPSG: ${contracts.mockPSG.address}`);
      deploymentInfo.contracts.MockPSG = contracts.mockPSG.address;

      console.log("Deploying MockFCB...");
      contracts.mockFCB = await hre.viem.deployContract("MockFCB", []); 
      console.log(`✅ MockFCB: ${contracts.mockFCB.address}`);
      deploymentInfo.contracts.MockFCB = contracts.mockFCB.address;

      console.log("Deploying MockOG...");
      contracts.mockOG = await hre.viem.deployContract("MockOG", []);
      console.log(`✅ MockOG: ${contracts.mockOG.address}`);
      deploymentInfo.contracts.MockOG = contracts.mockOG.address;

      console.log("Deploying MockUFC...");
      contracts.mockUFC = await hre.viem.deployContract("MockUFC", []);
      console.log(`✅ MockUFC: ${contracts.mockUFC.address}`);
      deploymentInfo.contracts.MockUFC = contracts.mockUFC.address;
    }

    // Deploy DEX System
    console.log("Deploying UniswapV2Factory...");
    const wchzAddress = contracts.mockWCHZ ? contracts.mockWCHZ.address : process.env.WCHZ_ADDRESS;
    contracts.factory = await hre.viem.deployContract("UniswapV2Factory", [
      deployer.account.address,
      wchzAddress
    ]);
    console.log(`✅ UniswapV2Factory: ${contracts.factory.address}`);
    deploymentInfo.contracts.UniswapV2Factory = contracts.factory.address;

    console.log("Deploying UniswapV2Router02...");
    contracts.router = await hre.viem.deployContract("UniswapV2Router02", [
      contracts.factory.address
    ]);
    console.log(`✅ UniswapV2Router02: ${contracts.router.address}`);
    deploymentInfo.contracts.UniswapV2Router02 = contracts.router.address;

    // ===========================================
    // PHASE 2: TOKEN ECOSYSTEM
    // ===========================================
    console.log("\n🪙 PHASE 2: Token Ecosystem");
    console.log("----------------------------");

    console.log("Deploying FBTToken...");
    contracts.fbtToken = await hre.viem.deployContract("FBTToken", [
      config.fbtToken.name,
      config.fbtToken.symbol,
      config.fbtToken.entityName,
      config.fbtToken.entityType,
      config.fbtToken.description,
      deployer.account.address
    ]);
    console.log(`✅ FBTToken: ${contracts.fbtToken.address}`);
    deploymentInfo.contracts.FBTToken = contracts.fbtToken.address;

    // ===========================================
    // PHASE 3: VAULT SYSTEM
    // ===========================================
    console.log("\n🏦 PHASE 3: Vault System");
    console.log("-------------------------");

    console.log("Deploying FBTStakingVault...");
    contracts.stakingVault = await hre.viem.deployContract("FBTStakingVault", [
      contracts.fbtToken.address,
      deployer.account.address
    ]);
    console.log(`✅ FBTStakingVault: ${contracts.stakingVault.address}`);
    deploymentInfo.contracts.FBTStakingVault = contracts.stakingVault.address;

    console.log("Deploying PrizeRedemption...");
    contracts.prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
      contracts.fbtToken.address,
      deployer.account.address
    ]);
    console.log(`✅ PrizeRedemption: ${contracts.prizeRedemption.address}`);
    deploymentInfo.contracts.PrizeRedemption = contracts.prizeRedemption.address;

    // ===========================================
    // PHASE 4: SYSTEM CONFIGURATION
    // ===========================================
    console.log("\n⚙️ PHASE 4: System Configuration");
    console.log("----------------------------------");

    // Set up permissions
    console.log("Configuring FBTToken permissions...");
    await contracts.fbtToken.write.addAuthorizedMinter([
      contracts.stakingVault.address
    ], { account: deployer.account.address });
    console.log(`✅ StakingVault authorized as minter`);

    await contracts.fbtToken.write.addAuthorizedBurner([
      contracts.prizeRedemption.address
    ], { account: deployer.account.address });
    console.log(`✅ PrizeRedemption authorized as burner`);

    // Create trading pairs
    if (contracts.mockCAP20 && contracts.mockWCHZ) {
      console.log("Creating trading pairs...");
      await contracts.factory.write.createPair([
        contracts.mockCAP20.address,
        contracts.mockWCHZ.address
      ]);
      const pairAddress = await contracts.factory.read.getPair([
        contracts.mockCAP20.address,
        contracts.mockWCHZ.address
      ]);
      console.log(`✅ CAP20-WCHZ pair: ${pairAddress}`);
      deploymentInfo.contracts.CAP20_WCHZ_Pair = pairAddress;

      // Create FBT-WCHZ pair
      await contracts.factory.write.createPair([
        contracts.fbtToken.address,
        contracts.mockWCHZ.address
      ]);
      const fbtPairAddress = await contracts.factory.read.getPair([
        contracts.fbtToken.address,
        contracts.mockWCHZ.address
      ]);
      console.log(`✅ FBT-WCHZ pair: ${fbtPairAddress}`);
      deploymentInfo.contracts.FBT_WCHZ_Pair = fbtPairAddress;

      // Create PSG-WCHZ pair
      await contracts.factory.write.createPair([
        contracts.mockPSG.address,
        contracts.mockWCHZ.address
      ]);
      const psgPairAddress = await contracts.factory.read.getPair([
        contracts.mockPSG.address,
        contracts.mockWCHZ.address
      ]);
      console.log(`✅ PSG-WCHZ pair: ${psgPairAddress}`);
      deploymentInfo.contracts.PSG_WCHZ_Pair = psgPairAddress;

      // Create FCB-WCHZ pair
      await contracts.factory.write.createPair([
        contracts.mockFCB.address,
        contracts.mockWCHZ.address
      ]);
      const fcbPairAddress = await contracts.factory.read.getPair([
        contracts.mockFCB.address,
        contracts.mockWCHZ.address
      ]);
      console.log(`✅ FCB-WCHZ pair: ${fcbPairAddress}`);
      deploymentInfo.contracts.FCB_WCHZ_Pair = fcbPairAddress;

      // Create OG-WCHZ pair
      await contracts.factory.write.createPair([
        contracts.mockOG.address,
        contracts.mockWCHZ.address
      ]);
      const ogPairAddress = await contracts.factory.read.getPair([
        contracts.mockOG.address,
        contracts.mockWCHZ.address
      ]);
      console.log(`✅ OG-WCHZ pair: ${ogPairAddress}`);
      deploymentInfo.contracts.OG_WCHZ_Pair = ogPairAddress;

      // Create UFC-WCHZ pair
      await contracts.factory.write.createPair([
        contracts.mockUFC.address,
        contracts.mockWCHZ.address
      ]);
      const ufcPairAddress = await contracts.factory.read.getPair([
        contracts.mockUFC.address,
        contracts.mockWCHZ.address
      ]);
      console.log(`✅ UFC-WCHZ pair: ${ufcPairAddress}`);
      deploymentInfo.contracts.UFC_WCHZ_Pair = ufcPairAddress;
    }

    // ===========================================
    // PHASE 5: INITIAL CONTENT SETUP
    // ===========================================
    if (!skipInitialSetup) {
      console.log("\n🎯 PHASE 5: Initial Content Setup");
      console.log("-----------------------------------");

      // Create staking pools
      console.log("Creating staking pools...");
      for (const pool of config.stakingPools) {
        await contracts.stakingVault.write.createPool([
          pool.name,
          pool.duration,
          pool.apy
        ], { account: deployer.account.address });
        console.log(`✅ ${pool.name}: ${pool.apy/100}% APY`);
      }
      deploymentInfo.stakingPools = config.stakingPools;

      // Create prizes
      console.log("Creating prizes...");
      for (const prize of config.prizes) {
        await contracts.prizeRedemption.write.createPrize([
          prize.name,
          prize.description,
          prize.cost,
          prize.supply,
          prize.imageUrl || "https://example.com/prize.jpg",
          prize.category
        ], { account: deployer.account.address });
        console.log(`✅ ${prize.name}: ${(prize.cost / BigInt(1e18)).toString()} FBT`);
      }
      deploymentInfo.prizes = config.prizes;

      // Mint initial tokens
      if (config.initialMint && config.initialMint > 0) {
        console.log("Minting initial FBT tokens...");
        await contracts.fbtToken.write.mint([
          deployer.account.address,
          config.initialMint,
          "initial_deployment_mint"
        ], { account: deployer.account.address });
        console.log(`✅ Minted ${(config.initialMint / BigInt(1e18)).toString()} FBT`);
      }
    }

    // ===========================================
    // PHASE 6: LIQUIDITY SETUP
    // ===========================================
    if (!skipLiquidityMinting && contracts.mockCAP20 && contracts.mockWCHZ) {
      console.log("\n💧 PHASE 6: Liquidity Token Setup");
      console.log("-----------------------------------");

      console.log("Minting liquidity tokens...");
      await contracts.mockCAP20.write.mint([
        deployer.account.address,
        config.liquidityTokens
      ], { account: deployer.account.address });
      console.log(`✅ Minted ${(config.liquidityTokens / BigInt(1e18)).toString()} MockCAP20`);

      await contracts.mockWCHZ.write.mint([
        deployer.account.address,
        config.liquidityTokens
      ], { account: deployer.account.address });
      console.log(`✅ Minted ${(config.liquidityTokens / BigInt(1e18)).toString()} MockWCHZ`);

      // Mint fan tokens for liquidity
      if (contracts.mockPSG) {
        await contracts.mockPSG.write.mint([
          deployer.account.address,
          config.liquidityTokens
        ], { account: deployer.account.address });
        console.log(`✅ Minted ${(config.liquidityTokens / BigInt(1e18)).toString()} MockPSG`);
      }

      if (contracts.mockFCB) {
        await contracts.mockFCB.write.mint([
          deployer.account.address,
          config.liquidityTokens
        ], { account: deployer.account.address });
        console.log(`✅ Minted ${(config.liquidityTokens / BigInt(1e18)).toString()} MockFCB`);
      }

      if (contracts.mockOG) {
        await contracts.mockOG.write.mint([
          deployer.account.address,
          config.liquidityTokens
        ], { account: deployer.account.address });
        console.log(`✅ Minted ${(config.liquidityTokens / BigInt(1e18)).toString()} MockOG`);
      }

      if (contracts.mockUFC) {
        await contracts.mockUFC.write.mint([
          deployer.account.address,
          config.liquidityTokens
        ], { account: deployer.account.address });
        console.log(`✅ Minted ${(config.liquidityTokens / BigInt(1e18)).toString()} MockUFC`);
      }
    }

    // ===========================================
    // DEPLOYMENT SUMMARY
    // ===========================================
    console.log("\n📊 DEPLOYMENT SUMMARY");
    console.log("======================");

    const finalBalance = await publicClient.getBalance({
      address: deployer.account.address
    });
    const deploymentCost = initialBalance - finalBalance;

    console.log(`🌐 Network: ${config.name} (Chain ID: ${deploymentInfo.chainId})`);
    console.log(`👤 Deployer: ${deploymentInfo.deployer}`);
    console.log(`💸 Cost: ${(deploymentCost / BigInt(1e18)).toString()} CHZ`);
    console.log(`⏰ Time: ${deploymentInfo.timestamp}\n`);

    console.log("📦 DEPLOYED CONTRACTS:");
    console.log("-----------------------");
    Object.entries(deploymentInfo.contracts).forEach(([name, address]) => {
      console.log(`${name.padEnd(20)}: ${address}`);
    });

    console.log("\n🔗 SYSTEM STATUS:");
    console.log("------------------");
    console.log(`✅ DEX System: Factory + Router + ${contracts.mockCAP20 ? '2' : '0'} pairs`);
    console.log(`✅ Token System: FBT Token with minting/burning permissions`);
    console.log(`✅ Vault System: Staking + Prize Redemption`);
    if (!skipInitialSetup) {
      console.log(`✅ Content: ${config.stakingPools.length} pools + ${config.prizes.length} prizes`);
    }
    if (!skipLiquidityMinting && contracts.mockCAP20) {
      console.log(`✅ Liquidity: Test tokens minted for DEX operations`);
    }

    // Save deployment information
    deploymentInfo.deploymentCost = deploymentCost.toString();
    deploymentInfo.finalBalance = finalBalance.toString();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deployment-${network}-${timestamp}.json`;
    
    const fs = require('fs');
    const deploymentsDir = './deployments';
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const filepath = `${deploymentsDir}/${filename}`;
    
    // Custom serializer to handle BigInt values
    const jsonData = JSON.stringify(deploymentInfo, (key, value) => {
      return typeof value === 'bigint' ? value.toString() : value;
    }, 2);
    
    fs.writeFileSync(filepath, jsonData);
    console.log(`\n💾 Deployment saved: ${filepath}`);

    console.log("\n✅ DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉");
    return { contracts, deploymentInfo };

  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    
    // Save failure information
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deployment-failed-${network}-${timestamp}.json`;
    
    const fs = require('fs');
    const deploymentsDir = './deployments';
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const errorData = JSON.stringify({
      ...deploymentInfo,
      error: error.message,
      stack: error.stack,
      partialContracts: contracts
    }, (key, value) => {
      return typeof value === 'bigint' ? value.toString() : value;
    }, 2);
    
    fs.writeFileSync(`${deploymentsDir}/${filename}`, errorData);
    
    throw error;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--entity-type':
        options.entityType = args[++i];
        break;
      case '--skip-setup':
        options.skipInitialSetup = true;
        break;
      case '--skip-liquidity':
        options.skipLiquidityMinting = true;
        break;
      case '--network':
        options.network = args[++i];
        break;
    }
  }
  
  return deployCompleteSystem(options);
}

// Export for use as module
module.exports = { deployCompleteSystem };

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}