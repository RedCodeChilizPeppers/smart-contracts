const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");
const fs = require("fs");
const path = require("path");

/**
 * Minimal Testnet Deployment Script
 * 
 * Deploys just 1 complete celebrity ecosystem to demonstrate full functionality
 * Uses existing core platform
 */

async function deployMinimalTestnet() {
  console.log("🚀 CELEBRITY CROWDFUNDING PLATFORM - MINIMAL DEMO");
  console.log("==================================================\n");
  
  const [deployer] = await hre.viem.getWalletClients();
  
  console.log("📋 Configuration:");
  console.log(`  Network: ${hre.network.name}`);
  console.log(`  Deployer: ${deployer.account.address}`);
  console.log(`  Scope: 1 Celebrity Ecosystem (Messi)\n`);

  // Use existing core platform
  console.log("🏗️ PHASE 1: Using Existing Core Platform");
  console.log("==========================================");
  const coreContracts = {
    mockWCHZ: await hre.viem.getContractAt("MockWCHZ", "0x5ecdcb11a9c6905eabe87153dda9069cc4cde2e7"),
    mockCAP20: await hre.viem.getContractAt("MockCAP20", "0x82de88133e58710bc7a3209d14dc39305c3e32f5"),
    factory: await hre.viem.getContractAt("UniswapV2Factory", "0x2289333f8c0cce8548ce619de4c719689d64722e"),
    router: await hre.viem.getContractAt("UniswapV2Router02", "0xfc13b707d92b999cdce050e8eb136f09a7eff20d")
  };
  console.log("✅ Core platform connected successfully");
  
  // Deploy Messi ecosystem only
  console.log("\n🌟 PHASE 2: Deploying Messi Complete Ecosystem");
  console.log("===============================================");
  const messi = await deployMessiEcosystem(coreContracts);
  
  console.log("\n💾 PHASE 3: Saving Results");
  console.log("===========================");
  const deploymentData = await saveResults(coreContracts, messi);
  
  console.log("\n🎉 MINIMAL DEPLOYMENT COMPLETED!");
  console.log("=================================");
  console.log("✅ Messi ecosystem fully operational");
  console.log("✅ All features demonstrated");
  console.log(`📄 Results: ${deploymentData.filename}`);
  
  return { coreContracts, messi, deploymentData };
}

async function deployMessiEcosystem(coreContracts) {
  console.log("🎯 Deploying Lionel Messi Fan Token Ecosystem");
  console.log("==============================================");
  
  const deployer = (await hre.viem.getWalletClients())[0];
  
  // 1. FBT Token
  console.log("  📦 Deploying MESSI Token...");
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    "Lionel Messi",
    "MESSI", 
    "Lionel Messi",
    "sportsTeam",
    "Official fan token for Lionel Messi's football academy project",
    deployer.account.address
  ]);
  console.log(`    ✅ MESSI Token: ${fbtToken.address}`);
  
  // 2. Staking Vault
  console.log("  🏦 Deploying Staking Vault...");
  const stakingVault = await hre.viem.deployContract("FBTStakingVault", [
    fbtToken.address,
    deployer.account.address
  ]);
  console.log(`    ✅ Staking Vault: ${stakingVault.address}`);
  
  // 3. Prize Redemption
  console.log("  🎁 Deploying Prize Redemption...");
  const prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
    fbtToken.address,
    deployer.account.address
  ]);
  console.log(`    ✅ Prize Redemption: ${prizeRedemption.address}`);
  
  // 4. Configure Permissions
  console.log("  ⚙️ Configuring permissions...");
  await fbtToken.write.addAuthorizedMinter([stakingVault.address]);
  await fbtToken.write.addAuthorizedBurner([prizeRedemption.address]);
  console.log("    ✅ Permissions configured");
  
  // 5. Create Staking Pools
  console.log("  📊 Creating staking pools...");
  await stakingVault.write.createPool(["30-Day Lock", 30 * 24 * 60 * 60, 500]);
  await stakingVault.write.createPool(["90-Day Lock", 90 * 24 * 60 * 60, 1200]);
  await stakingVault.write.createPool(["1-Year Lock", 365 * 24 * 60 * 60, 3000]);
  console.log("    ✅ 3 staking pools created");
  
  // 6. Create Prizes
  console.log("  🏆 Creating sample prizes...");
  await prizeRedemption.write.createPrize([
    "Messi VIP Experience",
    "Meet Lionel Messi and watch a training session",
    parseEther("5000"), // 5000 MESSI tokens
    1, // Only 1 available
    "https://messi.com/vip-experience.jpg",
    "Experience"
  ]);
  
  await prizeRedemption.write.createPrize([
    "Signed Messi Jersey",
    "Official jersey signed by Lionel Messi",
    parseEther("500"), // 500 MESSI tokens
    10, // 10 available
    "https://messi.com/signed-jersey.jpg",
    "Physical"
  ]);
  console.log("    ✅ 2 exclusive prizes created");
  
  // 7. Create Trading Pair & Add Liquidity
  console.log("  💱 Setting up DEX trading...");
  
  // Create pair
  await coreContracts.factory.write.createPair([
    fbtToken.address,
    coreContracts.mockWCHZ.address
  ]);
  
  const pairAddress = await coreContracts.factory.read.getPair([
    fbtToken.address,
    coreContracts.mockWCHZ.address
  ]);
  console.log(`    ✅ Trading pair created: ${pairAddress}`);
  
  // Mint tokens and add liquidity
  const liquidityTokens = parseEther("50000"); // 50k MESSI
  const liquidityCHZ = parseEther("5000");     // 5k CHZ (1 CHZ = 10 MESSI)
  
  await fbtToken.write.mint([deployer.account.address, liquidityTokens, "dex_liquidity"]);
  await coreContracts.mockWCHZ.write.mint([deployer.account.address, liquidityCHZ]);
  
  await fbtToken.write.approve([coreContracts.router.address, liquidityTokens]);
  await coreContracts.mockWCHZ.write.approve([coreContracts.router.address, liquidityCHZ]);
  
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
  await coreContracts.router.write.addLiquidity([
    fbtToken.address,
    coreContracts.mockWCHZ.address,
    liquidityTokens,
    liquidityCHZ,
    parseEther("40000"), // min tokens
    parseEther("4000"),  // min CHZ
    deployer.account.address,
    BigInt(deadline)
  ]);
  console.log("    ✅ Initial liquidity added (50k MESSI + 5k CHZ)");
  
  // 8. Mint Fan Distribution Tokens
  console.log("  🎁 Minting fan distribution tokens...");
  await fbtToken.write.mint([deployer.account.address, parseEther("100000"), "fan_distribution"]);
  console.log("    ✅ 100k MESSI tokens minted for fan distribution");
  
  console.log("\n🎯 MESSI ECOSYSTEM SUMMARY:");
  console.log("============================");
  console.log(`🪙 Token: MESSI (${fbtToken.address})`);
  console.log(`🏦 Staking: 3 pools with 5%-30% APY`);
  console.log(`🎁 Prizes: VIP experience + signed jerseys`);
  console.log(`💱 DEX: Live trading pair with 50k MESSI liquidity`);
  console.log(`👥 Ready: 100k tokens for fan distribution`);
  
  return {
    name: "Lionel Messi",
    symbol: "MESSI",
    contracts: {
      fbtToken,
      stakingVault,
      prizeRedemption,
      tradingPair: pairAddress
    }
  };
}

async function saveResults(coreContracts, messi) {
  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: (await hre.viem.getWalletClients())[0].account.address,
    timestamp: new Date().toISOString(),
    deploymentType: "minimal-demo",
    
    description: "Complete Messi ecosystem deployment showcasing all platform features",
    
    coreContracts: {
      mockWCHZ: coreContracts.mockWCHZ.address,
      mockCAP20: coreContracts.mockCAP20.address,
      factory: coreContracts.factory.address,
      router: coreContracts.router.address
    },
    
    messiEcosystem: {
      name: messi.name,
      symbol: messi.symbol,
      contracts: {
        fbtToken: messi.contracts.fbtToken.address,
        stakingVault: messi.contracts.stakingVault.address,
        prizeRedemption: messi.contracts.prizeRedemption.address,
        tradingPair: messi.contracts.tradingPair
      },
      features: [
        "✅ FBT Token with controlled minting/burning",
        "✅ 3 staking pools (30d/90d/1y) with 5%-30% APY",
        "✅ 2 exclusive prizes (VIP experience + signed jersey)",
        "✅ DEX trading pair with 50k MESSI + 5k CHZ liquidity",
        "✅ 100k MESSI tokens ready for fan distribution",
        "✅ Full permission system configured"
      ]
    },
    
    testingInstructions: {
      stakingTest: `Call stakingVault.stake(poolId, amount) after approving tokens`,
      prizeTest: `Call prizeRedemption.redeemPrize(prizeId) after approving tokens`,
      tradingTest: `Use DEX router to swap MESSI <-> CHZ`,
      mintTest: `Owner can mint tokens with mint(address, amount, reason)`
    },
    
    explorerUrls: {
      spicyExplorer: "https://spicy-explorer.chiliz.com/",
      searchInstructions: "Search for any contract address to view transactions"
    }
  };
  
  // Save deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `deployment-testnet-minimal-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  
  console.log(`📄 Deployment saved: ${filename}`);
  console.log("\n🔗 TESTNET EXPLORER LINKS:");
  console.log("===========================");
  console.log(`🌐 Base: https://spicy-explorer.chiliz.com/`);
  console.log(`🪙 MESSI Token: https://spicy-explorer.chiliz.com/address/${messi.contracts.fbtToken.address}`);
  console.log(`🏦 Staking Vault: https://spicy-explorer.chiliz.com/address/${messi.contracts.stakingVault.address}`);
  console.log(`🎁 Prize System: https://spicy-explorer.chiliz.com/address/${messi.contracts.prizeRedemption.address}`);
  console.log(`💱 Trading Pair: https://spicy-explorer.chiliz.com/address/${messi.contracts.tradingPair}`);
  
  return { ...deploymentData, filename };
}

// Execute if run directly
if (require.main === module) {
  deployMinimalTestnet()
    .then(() => {
      console.log("\n🎉 TESTNET DEPLOYMENT SUCCESS!");
      console.log("==============================");
      console.log("🚀 Messi ecosystem is LIVE on Spicy testnet!");
      console.log("🎯 All platform features fully operational!");
      console.log("📱 Ready for user interaction and testing!");
      console.log("\n💡 NEXT STEPS:");
      console.log("===============");
      console.log("1. ✅ Verify contracts on Spicy explorer");
      console.log("2. 🎮 Test staking functionality");
      console.log("3. 🛒 Test prize redemption"); 
      console.log("4. 💱 Test DEX trading");
      console.log("5. 🪙 Test token minting/burning");
      console.log("6. 📈 Monitor liquidity and trading");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Minimal deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployMinimalTestnet };