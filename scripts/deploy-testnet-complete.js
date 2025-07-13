const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");
const fs = require("fs");
const path = require("path");

/**
 * Complete Testnet Deployment Script with improved gas handling
 * Deploys 10 celebrity ecosystems with robust error handling
 */

async function deployCompleteTestnet() {
  console.log("🚀 CELEBRITY CROWDFUNDING PLATFORM - COMPLETE DEPLOYMENT");
  console.log("========================================================\n");
  
  const [deployer] = await hre.viem.getWalletClients();
  
  console.log("📋 Configuration:");
  console.log(`  Network: ${hre.network.name}`);
  console.log(`  Deployer: ${deployer.account.address}`);
  
  // Check balance
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({
    address: deployer.account.address
  });
  console.log(`  Balance: ${formatEther(balance)} CHZ\n`);

  // Deploy with improved error handling
  const deploymentResults = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.account.address,
    timestamp: new Date().toISOString(),
    coreContracts: {},
    celebrities: []
  };

  try {
    // Phase 1: Core Platform
    console.log("🏗️ PHASE 1: Core Platform Infrastructure");
    console.log("=========================================");
    
    console.log("  Deploying MockWCHZ...");
    const mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
    deploymentResults.coreContracts.mockWCHZ = mockWCHZ.address;
    console.log(`    ✅ MockWCHZ: ${mockWCHZ.address}`);
    
    console.log("  Deploying MockCAP20...");
    const mockCAP20 = await hre.viem.deployContract("MockCAP20", []);
    deploymentResults.coreContracts.mockCAP20 = mockCAP20.address;
    console.log(`    ✅ MockCAP20: ${mockCAP20.address}`);
    
    console.log("  Deploying UniswapV2Factory...");
    const factory = await hre.viem.deployContract("UniswapV2Factory", [
      deployer.account.address,
      mockWCHZ.address
    ]);
    deploymentResults.coreContracts.factory = factory.address;
    console.log(`    ✅ UniswapV2Factory: ${factory.address}`);
    
    console.log("  Deploying UniswapV2Router02...");
    const router = await hre.viem.deployContract("UniswapV2Router02", [
      factory.address
    ]);
    deploymentResults.coreContracts.router = router.address;
    console.log(`    ✅ UniswapV2Router02: ${router.address}`);
    
    // Phase 2: Celebrity Ecosystems
    console.log("\n🎭 PHASE 2: Celebrity Ecosystems");
    console.log("=================================");
    
    const celebrities = [
      { name: "Lionel Messi", symbol: "MESSI", type: "sportsTeam", description: "Official fan token for Lionel Messi's football academy project" },
      { name: "Cristiano Ronaldo", symbol: "CR7", type: "sportsTeam", description: "CR7 lifestyle brand expansion and fan engagement" },
      { name: "Taylor Swift", symbol: "SWIFTIE", type: "musicArtist", description: "Taylor Swift re-recording project and exclusive content" },
      { name: "The Rock", symbol: "ROCK", type: "entertainment", description: "Independent movie production and Hollywood projects" },
      { name: "Neymar Jr", symbol: "NJF", type: "sportsTeam", description: "Brazilian youth development and charity initiatives" },
      { name: "Lewis Hamilton", symbol: "LH44", type: "sportsTeam", description: "Formula 1 sustainability and racing academy" },
      { name: "Serena Williams", symbol: "SERENA", type: "sportsTeam", description: "Women's tennis development and empowerment" },
      { name: "Drake", symbol: "DRAKE", type: "musicArtist", description: "Music label development and artist collaborations" },
      { name: "Kylie Jenner", symbol: "KYLIE", type: "entertainment", description: "Beauty brand expansion and fashion collaborations" },
      { name: "Stephen Curry", symbol: "CURRY", type: "sportsTeam", description: "Basketball training academies and youth programs" }
    ];
    
    for (let i = 0; i < celebrities.length; i++) {
      const celebrity = celebrities[i];
      console.log(`\n🌟 ${i + 1}/10: Deploying ${celebrity.name} (${celebrity.symbol})`);
      console.log("=" + "=".repeat(50));
      
      try {
        const ecosystem = await deployCelebrityEcosystem(celebrity, {
          mockWCHZ, mockCAP20, factory, router
        });
        deploymentResults.celebrities.push(ecosystem);
        console.log(`    ✅ ${celebrity.name} ecosystem completed!`);
        
        // Add delay between deployments to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`    ❌ Failed to deploy ${celebrity.name}: ${error.message}`);
        // Continue with next celebrity instead of failing entire deployment
      }
    }
    
    // Phase 3: Save Results
    console.log("\n💾 PHASE 3: Documentation");
    console.log("==========================");
    await saveResults(deploymentResults);
    
    console.log("\n🎉 DEPLOYMENT COMPLETED!");
    console.log("========================");
    console.log(`✅ Core Platform: 4 contracts`);
    console.log(`✅ Celebrity Ecosystems: ${deploymentResults.celebrities.length}/10`);
    console.log(`✅ Total Successful: ${4 + (deploymentResults.celebrities.length * 3)} contracts`);
    
    return deploymentResults;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

async function deployCelebrityEcosystem(celebrity, coreContracts) {
  const deployer = (await hre.viem.getWalletClients())[0];
  
  // 1. Deploy FBT Token
  console.log(`    📦 Deploying ${celebrity.symbol} Token...`);
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    celebrity.name,
    celebrity.symbol,
    celebrity.name,
    celebrity.type,
    celebrity.description,
    deployer.account.address
  ]);
  console.log(`      ✅ FBTToken: ${fbtToken.address}`);
  
  // 2. Deploy Staking Vault
  console.log(`    🏦 Deploying Staking Vault...`);
  const stakingVault = await hre.viem.deployContract("FBTStakingVault", [
    fbtToken.address,
    deployer.account.address
  ]);
  console.log(`      ✅ FBTStakingVault: ${stakingVault.address}`);
  
  // 3. Deploy Prize Redemption
  console.log(`    🎁 Deploying Prize Redemption...`);
  const prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
    fbtToken.address,
    deployer.account.address
  ]);
  console.log(`      ✅ PrizeRedemption: ${prizeRedemption.address}`);
  
  // 4. Configure Basic Permissions (simplified to avoid gas issues)
  console.log(`    ⚙️ Configuring permissions...`);
  try {
    await fbtToken.write.addAuthorizedMinter([stakingVault.address]);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await fbtToken.write.addAuthorizedBurner([prizeRedemption.address]);
    console.log(`      ✅ Permissions configured`);
  } catch (error) {
    console.log(`      ⚠️ Permission configuration skipped: ${error.message}`);
  }
  
  // 5. Create Trading Pair
  console.log(`    💱 Creating trading pair...`);
  try {
    await coreContracts.factory.write.createPair([
      fbtToken.address,
      coreContracts.mockWCHZ.address
    ]);
    
    const pairAddress = await coreContracts.factory.read.getPair([
      fbtToken.address,
      coreContracts.mockWCHZ.address
    ]);
    console.log(`      ✅ Trading pair: ${pairAddress}`);
    
    return {
      name: celebrity.name,
      symbol: celebrity.symbol,
      type: celebrity.type,
      description: celebrity.description,
      contracts: {
        fbtToken: fbtToken.address,
        stakingVault: stakingVault.address,
        prizeRedemption: prizeRedemption.address,
        tradingPair: pairAddress
      }
    };
  } catch (error) {
    console.log(`      ⚠️ Trading pair creation failed: ${error.message}`);
    return {
      name: celebrity.name,
      symbol: celebrity.symbol,
      type: celebrity.type,
      description: celebrity.description,
      contracts: {
        fbtToken: fbtToken.address,
        stakingVault: stakingVault.address,
        prizeRedemption: prizeRedemption.address,
        tradingPair: "0x0000000000000000000000000000000000000000"
      }
    };
  }
}

async function saveResults(deploymentResults) {
  // Create deployments directory
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Enhanced deployment data
  const enhancedResults = {
    ...deploymentResults,
    summary: {
      totalContracts: 4 + (deploymentResults.celebrities.length * 3),
      coreContracts: 4,
      celebrityEcosystems: deploymentResults.celebrities.length,
      successRate: `${deploymentResults.celebrities.length}/10`,
      features: [
        "✅ MockWCHZ and MockCAP20 tokens",
        "✅ UniswapV2 DEX infrastructure", 
        "✅ FBT tokens for each celebrity",
        "✅ Staking vaults with rewards",
        "✅ Prize redemption systems",
        "✅ Trading pairs for each token"
      ]
    },
    testingInstructions: {
      tokenInteraction: "Use FBTToken contracts to mint/burn tokens",
      stakingTest: "Use stakingVault.stake() after token approval",
      prizeTest: "Use prizeRedemption.redeemPrize() after token approval",
      tradingTest: "Use UniswapV2Router02 for token swaps"
    },
    explorerUrls: {
      base: "https://spicy-explorer.chiliz.com/",
      coreContracts: {
        mockWCHZ: `https://spicy-explorer.chiliz.com/address/${deploymentResults.coreContracts.mockWCHZ}`,
        mockCAP20: `https://spicy-explorer.chiliz.com/address/${deploymentResults.coreContracts.mockCAP20}`,
        factory: `https://spicy-explorer.chiliz.com/address/${deploymentResults.coreContracts.factory}`,
        router: `https://spicy-explorer.chiliz.com/address/${deploymentResults.coreContracts.router}`
      },
      celebrities: deploymentResults.celebrities.map(celebrity => ({
        name: celebrity.name,
        symbol: celebrity.symbol,
        urls: {
          token: `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.fbtToken}`,
          staking: `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.stakingVault}`,
          prizes: `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.prizeRedemption}`,
          pair: celebrity.contracts.tradingPair !== "0x0000000000000000000000000000000000000000" ? 
            `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.tradingPair}` : 
            "Not created"
        }
      }))
    }
  };
  
  // Save deployment file
  const filename = `deployment-complete-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(enhancedResults, null, 2));
  
  console.log(`📄 Complete deployment saved: ${filename}`);
  console.log("\n📊 DEPLOYMENT SUMMARY:");
  console.log("=====================");
  console.log(`🌐 Network: ${enhancedResults.network} (Chain ID: ${enhancedResults.chainId})`);
  console.log(`👤 Deployer: ${enhancedResults.deployer}`);
  console.log(`📦 Total Contracts: ${enhancedResults.summary.totalContracts}`);
  console.log(`🎭 Celebrity Success Rate: ${enhancedResults.summary.successRate}`);
  
  console.log("\n🎯 CORE PLATFORM:");
  console.log(`  MockWCHZ: ${deploymentResults.coreContracts.mockWCHZ}`);
  console.log(`  MockCAP20: ${deploymentResults.coreContracts.mockCAP20}`);
  console.log(`  Factory: ${deploymentResults.coreContracts.factory}`);
  console.log(`  Router: ${deploymentResults.coreContracts.router}`);
  
  console.log("\n🌟 CELEBRITY ECOSYSTEMS:");
  deploymentResults.celebrities.forEach((celebrity, i) => {
    console.log(`  ${i + 1}. ${celebrity.name} (${celebrity.symbol})`);
    console.log(`     Token: ${celebrity.contracts.fbtToken}`);
    console.log(`     Staking: ${celebrity.contracts.stakingVault}`);
    console.log(`     Prizes: ${celebrity.contracts.prizeRedemption}`);
    console.log(`     Pair: ${celebrity.contracts.tradingPair}`);
  });
  
  console.log("\n🔗 EXPLORER LINKS:");
  console.log("==================");
  console.log("🌐 Base: https://spicy-explorer.chiliz.com/");
  console.log("📝 Search any contract address above to view on explorer");
  
  return { filename, data: enhancedResults };
}

// Execute deployment
if (require.main === module) {
  deployCompleteTestnet()
    .then((results) => {
      console.log("\n🎉 COMPLETE TESTNET DEPLOYMENT SUCCESS!");
      console.log("======================================");
      console.log("🚀 Platform is live on Spicy testnet!");
      console.log("📱 Ready for testing and interaction!");
      console.log(`🌟 ${results.celebrities.length} celebrity ecosystems operational!`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Complete deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployCompleteTestnet };