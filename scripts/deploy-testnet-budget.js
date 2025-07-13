const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");
const fs = require("fs");
const path = require("path");

/**
 * Budget Testnet Deployment Script
 * 
 * Deploys the core platform + 3 celebrity ecosystems to fit within 25 CHZ budget
 */

async function deployBudgetTestnetPlatform() {
  console.log("🚀 CELEBRITY CROWDFUNDING PLATFORM - BUDGET TESTNET DEPLOYMENT");
  console.log("================================================================\n");
  
  const [deployer] = await hre.viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  
  console.log("📋 Deployment Configuration:");
  console.log(`  Network: ${hre.network.name}`);
  console.log(`  Chain ID: ${hre.network.config.chainId}`);
  console.log(`  Deployer: ${deployerAddress}`);
  console.log(`  Budget: 25 CHZ (deploying 3 celebrity ecosystems)\n`);

  // 1. Use existing core platform (already deployed)
  console.log("🏗️ PHASE 1: Using Existing Core Platform");
  console.log("==========================================");
  const coreContracts = {
    mockWCHZ: await hre.viem.getContractAt("MockWCHZ", "0x5ecdcb11a9c6905eabe87153dda9069cc4cde2e7"),
    mockCAP20: await hre.viem.getContractAt("MockCAP20", "0x82de88133e58710bc7a3209d14dc39305c3e32f5"),
    factory: await hre.viem.getContractAt("UniswapV2Factory", "0x2289333f8c0cce8548ce619de4c719689d64722e"),
    router: await hre.viem.getContractAt("UniswapV2Router02", "0xfc13b707d92b999cdce050e8eb136f09a7eff20d")
  };
  
  console.log("✅ Core platform contracts connected:");
  console.log(`  MockWCHZ: ${coreContracts.mockWCHZ.address}`);
  console.log(`  MockCAP20: ${coreContracts.mockCAP20.address}`);
  console.log(`  UniswapV2Factory: ${coreContracts.factory.address}`);
  console.log(`  UniswapV2Router02: ${coreContracts.router.address}`);
  
  // 2. Deploy 3 Celebrity Ecosystems (budget-friendly)
  console.log("\n🎭 PHASE 2: Celebrity Ecosystems (3 ecosystems)");
  console.log("================================================");
  const celebrities = await deployBudgetCelebrities(coreContracts);
  
  // 3. Save Results
  console.log("\n💾 PHASE 3: Documentation");
  console.log("==========================");
  const deploymentData = await saveDeploymentResults(coreContracts, celebrities);
  
  console.log("\n🎉 BUDGET DEPLOYMENT COMPLETED!");
  console.log("===============================");
  console.log(`✅ Core Platform: Reused existing contracts`);
  console.log(`✅ Celebrity Ecosystems: ${celebrities.length} deployed`);
  console.log(`✅ Total New Contracts: ${celebrities.length * 3} contracts`);
  console.log(`📄 Deployment saved: ${deploymentData.filename}`);
  
  return { coreContracts, celebrities, deploymentData };
}

async function deployBudgetCelebrities(coreContracts) {
  const celebrities = [
    {
      name: "Lionel Messi",
      symbol: "MESSI",
      type: "sportsTeam",
      description: "Official fan token for Lionel Messi's football academy project"
    },
    {
      name: "Cristiano Ronaldo", 
      symbol: "CR7",
      type: "sportsTeam",
      description: "CR7 lifestyle brand expansion and fan engagement"
    },
    {
      name: "Taylor Swift",
      symbol: "SWIFTIE",
      type: "musicArtist", 
      description: "Taylor Swift re-recording project and exclusive content"
    }
  ];
  
  const deployedCelebrities = [];
  
  for (let i = 0; i < celebrities.length; i++) {
    const celebrity = celebrities[i];
    console.log(`\n🌟 ${i + 1}/3: Deploying ${celebrity.name} Ecosystem`);
    console.log(`${"=".repeat(50)}`);
    
    const ecosystem = await deploySimpleCelebrityEcosystem(celebrity, coreContracts, i);
    deployedCelebrities.push(ecosystem);
    
    console.log(`    ✅ ${celebrity.name} ecosystem deployed successfully!`);
  }
  
  return deployedCelebrities;
}

async function deploySimpleCelebrityEcosystem(celebrity, coreContracts, index) {
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
  
  // 4. Configure Basic Permissions
  console.log(`    ⚙️ Configuring permissions...`);
  await fbtToken.write.addAuthorizedMinter([stakingVault.address]);
  await fbtToken.write.addAuthorizedBurner([prizeRedemption.address]);
  
  // 5. Create 2 Staking Pools (simplified)
  console.log(`    📊 Creating staking pools...`);
  await stakingVault.write.createPool(["Monthly Lock", 30 * 24 * 60 * 60, 500]);
  await stakingVault.write.createPool(["Annual Lock", 365 * 24 * 60 * 60, 3000]);
  
  // 6. Create 1 Sample Prize
  console.log(`    🏆 Creating sample prize...`);
  await prizeRedemption.write.createPrize([
    `${celebrity.name} Merchandise`,
    `Official merchandise from ${celebrity.name}`,
    parseEther("100"),
    0, // Unlimited
    `https://${celebrity.symbol.toLowerCase()}.com/merch.jpg`,
    "Physical"
  ]);
  
  // 7. Create Trading Pair
  console.log(`    💱 Creating trading pair...`);
  await coreContracts.factory.write.createPair([
    fbtToken.address,
    coreContracts.mockWCHZ.address
  ]);
  
  const pairAddress = await coreContracts.factory.read.getPair([
    fbtToken.address,
    coreContracts.mockWCHZ.address
  ]);
  
  // 8. Mint and Add Basic Liquidity
  console.log(`    💧 Adding basic liquidity...`);
  const initialTokens = parseEther("10000");
  const initialCHZ = parseEther("1000");
  
  await fbtToken.write.mint([deployer.account.address, initialTokens, "initial_liquidity"]);
  await coreContracts.mockWCHZ.write.mint([deployer.account.address, initialCHZ]);
  
  await fbtToken.write.approve([coreContracts.router.address, initialTokens]);
  await coreContracts.mockWCHZ.write.approve([coreContracts.router.address, initialCHZ]);
  
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  await coreContracts.router.write.addLiquidity([
    fbtToken.address,
    coreContracts.mockWCHZ.address,
    initialTokens,
    initialCHZ,
    parseEther("8000"),
    parseEther("800"),
    deployer.account.address,
    BigInt(deadline)
  ]);
  
  return {
    ...celebrity,
    contracts: {
      fbtToken,
      stakingVault,
      prizeRedemption,
      tradingPair: pairAddress
    }
  };
}

async function saveDeploymentResults(coreContracts, celebrities) {
  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: (await hre.viem.getWalletClients())[0].account.address,
    timestamp: new Date().toISOString(),
    deploymentType: "budget",
    
    coreContracts: {
      mockWCHZ: coreContracts.mockWCHZ.address,
      mockCAP20: coreContracts.mockCAP20.address,
      factory: coreContracts.factory.address,
      router: coreContracts.router.address
    },
    
    celebrities: celebrities.map(celebrity => ({
      name: celebrity.name,
      symbol: celebrity.symbol,
      type: celebrity.type,
      description: celebrity.description,
      contracts: {
        fbtToken: celebrity.contracts.fbtToken.address,
        stakingVault: celebrity.contracts.stakingVault.address,
        prizeRedemption: celebrity.contracts.prizeRedemption.address,
        tradingPair: celebrity.contracts.tradingPair
      }
    })),
    
    summary: {
      totalNewContracts: celebrities.length * 3,
      celebrityCount: celebrities.length,
      tradingPairs: celebrities.length,
      features: [
        "FBT Tokens with minting/burning",
        "Multi-pool staking vaults",
        "Prize redemption systems", 
        "DEX trading pairs with liquidity",
        "Cross-platform compatibility"
      ]
    }
  };
  
  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `deployment-testnet-budget-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  
  console.log(`📄 Deployment results saved to: ${filename}`);
  console.log("\n📊 DEPLOYMENT SUMMARY:");
  console.log("====================");
  console.log(`🌐 Network: ${deploymentData.network} (Chain ID: ${deploymentData.chainId})`);
  console.log(`👤 Deployer: ${deploymentData.deployer}`);
  console.log(`📦 New Contracts: ${deploymentData.summary.totalNewContracts}`);
  console.log(`🎭 Celebrities: ${deploymentData.summary.celebrityCount}`);
  console.log(`💱 Trading Pairs: ${deploymentData.summary.tradingPairs}`);
  
  console.log("\n🎯 DEPLOYED CELEBRITIES:");
  celebrities.forEach((celebrity, i) => {
    console.log(`  ${i + 1}. ${celebrity.name} (${celebrity.symbol})`);
    console.log(`     Token: ${celebrity.contracts.fbtToken.address}`);
    console.log(`     Staking: ${celebrity.contracts.stakingVault.address}`);
    console.log(`     Prizes: ${celebrity.contracts.prizeRedemption.address}`);
    console.log(`     DEX Pair: ${celebrity.contracts.tradingPair}`);
  });
  
  return { ...deploymentData, filename };
}

// Execute if run directly
if (require.main === module) {
  deployBudgetTestnetPlatform()
    .then((result) => {
      console.log("\n🎉 BUDGET TESTNET DEPLOYMENT COMPLETED!");
      console.log("======================================");
      console.log("🚀 Platform is now live on Spicy testnet!");
      console.log("📱 Ready for user testing!");
      console.log("🌟 3 Celebrity ecosystems operational!");
      console.log("\n🔗 TESTNET LINKS:");
      console.log("==================");
      console.log("🌐 Spicy Explorer: https://spicy-explorer.chiliz.com/");
      console.log("🔍 Search for any of the deployed contract addresses");
      console.log("\n💡 NEXT STEPS:");
      console.log("===============");
      console.log("1. Verify contracts on explorer");
      console.log("2. Test token minting and trading");
      console.log("3. Test staking functionality");
      console.log("4. Test prize redemption");
      console.log("5. Deploy remaining celebrities when more CHZ available");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Budget testnet deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployBudgetTestnetPlatform };