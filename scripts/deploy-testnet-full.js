const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");
const fs = require("fs");
const path = require("path");

/**
 * Full Testnet Deployment Script
 * 
 * Deploys the complete Celebrity Crowdfunding Platform to Spicy testnet
 * with 10 different celebrity ecosystems
 */

async function deployFullTestnetPlatform() {
  console.log("🚀 CELEBRITY CROWDFUNDING PLATFORM - FULL TESTNET DEPLOYMENT");
  console.log("=============================================================\n");
  
  const [deployer] = await hre.viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  
  console.log("📋 Deployment Configuration:");
  console.log(`  Network: ${hre.network.name}`);
  console.log(`  Chain ID: ${hre.network.config.chainId}`);
  console.log(`  Deployer: ${deployerAddress}`);
  
  try {
    const publicClient = await hre.viem.getPublicClient();
    const balance = await publicClient.getBalance({
      address: deployerAddress
    });
    console.log(`  Balance: ${formatEther(balance)} CHZ\n`);
    
    if (balance < parseEther("5")) {
      console.warn("⚠️  WARNING: Low balance! You might need more CHZ for deployment.");
    }
  } catch (error) {
    console.log(`  Balance: Unable to fetch (proceeding with deployment)\n`);
  }

  // 1. Deploy Core Platform Infrastructure
  console.log("🏗️ PHASE 1: Core Platform Infrastructure");
  console.log("==========================================");
  const coreContracts = await deployCoreInfrastructure();
  
  // 2. Deploy 10 Celebrity Ecosystems
  console.log("\n🎭 PHASE 2: Celebrity Ecosystems Deployment");
  console.log("============================================");
  const celebrities = await deployCelebrityEcosystems(coreContracts);
  
  // 3. Configure Cross-Celebrity Features
  console.log("\n⚙️ PHASE 3: Cross-Platform Configuration");
  console.log("==========================================");
  await configureCrossPlatformFeatures(coreContracts, celebrities);
  
  // 4. Save Deployment Results
  console.log("\n💾 PHASE 4: Documentation & Verification");
  console.log("==========================================");
  const deploymentData = await saveDeploymentResults(coreContracts, celebrities);
  
  console.log("\n🎉 FULL PLATFORM DEPLOYMENT COMPLETED!");
  console.log("=====================================");
  console.log(`✅ Core Platform: ${Object.keys(coreContracts).length} contracts`);
  console.log(`✅ Celebrity Ecosystems: ${celebrities.length} complete ecosystems`);
  console.log(`✅ Total Contracts: ${Object.keys(coreContracts).length + (celebrities.length * 4)} contracts`);
  console.log(`📄 Deployment saved: ${deploymentData.filename}`);
  
  return { coreContracts, celebrities, deploymentData };
}

async function deployCoreInfrastructure() {
  const contracts = {};
  
  console.log("📦 Deploying Core Contracts...");
  
  // Mock tokens for testnet
  console.log("  Deploying MockWCHZ...");
  contracts.mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
  console.log(`    ✅ MockWCHZ: ${contracts.mockWCHZ.address}`);
  
  console.log("  Deploying MockCAP20...");
  contracts.mockCAP20 = await hre.viem.deployContract("MockCAP20", []);
  console.log(`    ✅ MockCAP20: ${contracts.mockCAP20.address}`);
  
  // DEX Infrastructure
  console.log("  Deploying UniswapV2Factory...");
  contracts.factory = await hre.viem.deployContract("UniswapV2Factory", [
    (await hre.viem.getWalletClients())[0].account.address,
    contracts.mockWCHZ.address
  ]);
  console.log(`    ✅ UniswapV2Factory: ${contracts.factory.address}`);
  
  console.log("  Deploying UniswapV2Router02...");
  contracts.router = await hre.viem.deployContract("UniswapV2Router02", [
    contracts.factory.address
  ]);
  console.log(`    ✅ UniswapV2Router02: ${contracts.router.address}`);
  
  // Create base trading pairs
  console.log("  Creating base trading pairs...");
  await contracts.factory.write.createPair([
    contracts.mockCAP20.address,
    contracts.mockWCHZ.address
  ]);
  
  const cap20WchzPair = await contracts.factory.read.getPair([
    contracts.mockCAP20.address,
    contracts.mockWCHZ.address
  ]);
  contracts.baseCAP20Pair = cap20WchzPair;
  console.log(`    ✅ CAP20-WCHZ Pair: ${cap20WchzPair}`);
  
  // Mint initial liquidity tokens for testing
  console.log("  Minting initial test tokens...");
  await contracts.mockWCHZ.write.mint([
    (await hre.viem.getWalletClients())[0].account.address,
    parseEther("100000")
  ]);
  await contracts.mockCAP20.write.mint([
    (await hre.viem.getWalletClients())[0].account.address,
    parseEther("100000")
  ]);
  console.log("    ✅ Test tokens minted for liquidity");
  
  return contracts;
}

async function deployCelebrityEcosystems(coreContracts) {
  const celebrities = [
    {
      name: "Lionel Messi",
      symbol: "MESSI",
      type: "sportsTeam",
      description: "Official fan token for Lionel Messi's football academy project",
      targetAmount: "5000", // 5,000 CHZ
      tokenPrice: "0.1", // 0.1 CHZ per token
      maxContribution: "500"
    },
    {
      name: "Cristiano Ronaldo", 
      symbol: "CR7",
      type: "sportsTeam",
      description: "CR7 lifestyle brand expansion and fan engagement",
      targetAmount: "3000",
      tokenPrice: "0.08",
      maxContribution: "300"
    },
    {
      name: "Taylor Swift",
      symbol: "SWIFTIE",
      type: "musicArtist", 
      description: "Taylor Swift re-recording project and exclusive content",
      targetAmount: "8000",
      tokenPrice: "0.25",
      maxContribution: "1000"
    },
    {
      name: "The Rock",
      symbol: "ROCK",
      type: "entertainment",
      description: "Independent movie production and Hollywood projects",
      targetAmount: "10000",
      tokenPrice: "0.2",
      maxContribution: "2000"
    },
    {
      name: "Neymar Jr",
      symbol: "NJF",
      type: "sportsTeam",
      description: "Brazilian youth development and charity initiatives",
      targetAmount: "2000",
      tokenPrice: "0.05",
      maxContribution: "100"
    },
    {
      name: "Lewis Hamilton",
      symbol: "LH44",
      type: "sportsTeam",
      description: "Formula 1 sustainability and racing academy",
      targetAmount: "6000",
      tokenPrice: "0.15",
      maxContribution: "800"
    },
    {
      name: "Serena Williams",
      symbol: "SERENA",
      type: "sportsTeam",
      description: "Women's tennis development and empowerment",
      targetAmount: "4000",
      tokenPrice: "0.12",
      maxContribution: "600"
    },
    {
      name: "Drake",
      symbol: "DRAKE",
      type: "musicArtist",
      description: "Music label development and artist collaborations", 
      targetAmount: "7000",
      tokenPrice: "0.18",
      maxContribution: "1200"
    },
    {
      name: "Kylie Jenner",
      symbol: "KYLIE",
      type: "entertainment",
      description: "Beauty brand expansion and fashion collaborations",
      targetAmount: "5500",
      tokenPrice: "0.22",
      maxContribution: "900"
    },
    {
      name: "Stephen Curry",
      symbol: "CURRY",
      type: "sportsTeam", 
      description: "Basketball training academies and youth programs",
      targetAmount: "4500",
      tokenPrice: "0.13",
      maxContribution: "700"
    }
  ];
  
  const deployedCelebrities = [];
  
  for (let i = 0; i < celebrities.length; i++) {
    const celebrity = celebrities[i];
    console.log(`\n🌟 ${i + 1}/10: Deploying ${celebrity.name} Ecosystem`);
    console.log(`${"=".repeat(50)}`);
    
    const ecosystem = await deploySingleCelebrityEcosystem(celebrity, coreContracts, i);
    deployedCelebrities.push(ecosystem);
    
    console.log(`    ✅ ${celebrity.name} ecosystem deployed successfully!`);
  }
  
  return deployedCelebrities;
}

async function deploySingleCelebrityEcosystem(celebrity, coreContracts, index) {
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
  
  // 4. Deploy ICO & Vesting (if this is one of the first 5 celebrities)
  let entityICO, milestoneVesting, fanDAO;
  if (index < 5) {
    console.log(`    💰 Deploying ICO & Vesting System...`);
    
    entityICO = await hre.viem.deployContract("EntityICO", [
      fbtToken.address,
      celebrity.name,
      celebrity.type,
      celebrity.description,
      deployer.account.address,
      deployer.account.address
    ]);
    console.log(`      ✅ EntityICO: ${entityICO.address}`);
    
    milestoneVesting = await hre.viem.deployContract("MilestoneVesting", [
      fbtToken.address,
      deployer.account.address,
      deployer.account.address
    ]);
    console.log(`      ✅ MilestoneVesting: ${milestoneVesting.address}`);
    
    fanDAO = await hre.viem.deployContract("FanDAO", [
      fbtToken.address,
      deployer.account.address
    ]);
    console.log(`      ✅ FanDAO: ${fanDAO.address}`);
  }
  
  // 5. Configure Permissions
  console.log(`    ⚙️ Configuring permissions...`);
  await fbtToken.write.addAuthorizedMinter([stakingVault.address]);
  await fbtToken.write.addAuthorizedBurner([prizeRedemption.address]);
  if (entityICO) {
    await fbtToken.write.addAuthorizedMinter([entityICO.address]);
    await entityICO.write.setVestingContract([milestoneVesting.address]);
    await milestoneVesting.write.setDAOContract([fanDAO.address]);
    await milestoneVesting.write.authorizeInitializer([entityICO.address]);
  }
  
  // 6. Create Staking Pools
  console.log(`    📊 Creating staking pools...`);
  const pools = [
    { name: "Monthly Lock", duration: 30 * 24 * 60 * 60, apy: 500 + (index * 100) },
    { name: "Quarterly Lock", duration: 90 * 24 * 60 * 60, apy: 1200 + (index * 200) },
    { name: "Semi-Annual Lock", duration: 180 * 24 * 60 * 60, apy: 2000 + (index * 300) },
    { name: "Annual Lock", duration: 365 * 24 * 60 * 60, apy: 3000 + (index * 500) }
  ];
  
  for (const pool of pools) {
    await stakingVault.write.createPool([pool.name, pool.duration, pool.apy]);
  }
  
  // 7. Create Sample Prizes
  console.log(`    🏆 Creating sample prizes...`);
  await prizeRedemption.write.createPrize([
    `${celebrity.name} VIP Meet & Greet`,
    `Exclusive meet and greet opportunity with ${celebrity.name}`,
    parseEther("1000"),
    5, // Limited supply
    `https://${celebrity.symbol.toLowerCase()}.com/vip.jpg`,
    "Experience"
  ]);
  
  await prizeRedemption.write.createPrize([
    `${celebrity.name} Merchandise Pack`,
    `Official merchandise bundle from ${celebrity.name}`,
    parseEther("100"),
    0, // Unlimited
    `https://${celebrity.symbol.toLowerCase()}.com/merch.jpg`,
    "Physical"
  ]);
  
  // 8. Create Trading Pair
  console.log(`    💱 Creating trading pair...`);
  await coreContracts.factory.write.createPair([
    fbtToken.address,
    coreContracts.mockWCHZ.address
  ]);
  
  const pairAddress = await coreContracts.factory.read.getPair([
    fbtToken.address,
    coreContracts.mockWCHZ.address
  ]);
  
  // 9. Mint Initial Tokens & Add Liquidity
  console.log(`    💧 Adding initial liquidity...`);
  const initialTokens = parseEther("50000");
  const initialCHZ = parseEther("5000");
  
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
    parseEther("40000"),
    parseEther("4000"),
    deployer.account.address,
    BigInt(deadline)
  ]);
  
  return {
    ...celebrity,
    contracts: {
      fbtToken,
      stakingVault,
      prizeRedemption,
      entityICO,
      milestoneVesting,
      fanDAO,
      tradingPair: pairAddress
    }
  };
}

async function configureCrossPlatformFeatures(coreContracts, celebrities) {
  console.log("🔗 Configuring cross-platform features...");
  
  // Add initial liquidity to base CAP20-WCHZ pair
  console.log("  Adding liquidity to base trading pair...");
  const deployer = (await hre.viem.getWalletClients())[0];
  
  await coreContracts.mockCAP20.write.approve([
    coreContracts.router.address,
    parseEther("50000")
  ]);
  await coreContracts.mockWCHZ.write.approve([
    coreContracts.router.address,
    parseEther("50000")
  ]);
  
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  await coreContracts.router.write.addLiquidity([
    coreContracts.mockCAP20.address,
    coreContracts.mockWCHZ.address,
    parseEther("50000"),
    parseEther("50000"),
    parseEther("40000"),
    parseEther("40000"),
    deployer.account.address,
    BigInt(deadline)
  ]);
  
  console.log("  ✅ Base liquidity added");
  
  // Configure sample ICO for first celebrity (Messi)
  if (celebrities[0]?.contracts?.entityICO) {
    console.log("  Configuring sample ICO for Messi...");
    const messi = celebrities[0];
    
    await messi.contracts.entityICO.write.configureICO([
      parseEther(messi.targetAmount),
      parseEther(messi.tokenPrice),
      parseEther("10"), // min contribution
      parseEther(messi.maxContribution),
      BigInt(Math.floor(Date.now() / 1000) + 3600), // starts in 1 hour
      BigInt(Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)), // ends in 30 days
      false // no KYC required
    ]);
    
    console.log("  ✅ Messi ICO configured");
  }
}

async function saveDeploymentResults(coreContracts, celebrities) {
  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: (await hre.viem.getWalletClients())[0].account.address,
    timestamp: new Date().toISOString(),
    
    coreContracts: {
      mockWCHZ: coreContracts.mockWCHZ.address,
      mockCAP20: coreContracts.mockCAP20.address,
      factory: coreContracts.factory.address,
      router: coreContracts.router.address,
      baseCAP20Pair: coreContracts.baseCAP20Pair
    },
    
    celebrities: celebrities.map(celebrity => ({
      name: celebrity.name,
      symbol: celebrity.symbol,
      type: celebrity.type,
      description: celebrity.description,
      targetAmount: celebrity.targetAmount,
      tokenPrice: celebrity.tokenPrice,
      maxContribution: celebrity.maxContribution,
      contracts: {
        fbtToken: celebrity.contracts.fbtToken.address,
        stakingVault: celebrity.contracts.stakingVault.address,
        prizeRedemption: celebrity.contracts.prizeRedemption.address,
        entityICO: celebrity.contracts.entityICO?.address || null,
        milestoneVesting: celebrity.contracts.milestoneVesting?.address || null,
        fanDAO: celebrity.contracts.fanDAO?.address || null,
        tradingPair: celebrity.contracts.tradingPair
      }
    })),
    
    summary: {
      totalContracts: Object.keys(coreContracts).length + celebrities.reduce((acc, c) => acc + Object.keys(c.contracts).length - 1, 0),
      celebrityCount: celebrities.length,
      icosDeployed: celebrities.filter(c => c.contracts.entityICO).length,
      tradingPairs: celebrities.length + 1 // +1 for base pair
    }
  };
  
  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `deployment-testnet-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  
  console.log(`📄 Deployment results saved to: ${filename}`);
  console.log("\n📊 DEPLOYMENT SUMMARY:");
  console.log("====================");
  console.log(`🌐 Network: ${deploymentData.network} (Chain ID: ${deploymentData.chainId})`);
  console.log(`👤 Deployer: ${deploymentData.deployer}`);
  console.log(`📦 Total Contracts: ${deploymentData.summary.totalContracts}`);
  console.log(`🎭 Celebrities: ${deploymentData.summary.celebrityCount}`);
  console.log(`💰 ICOs Deployed: ${deploymentData.summary.icosDeployed}`);
  console.log(`💱 Trading Pairs: ${deploymentData.summary.tradingPairs}`);
  
  return { ...deploymentData, filename };
}

// Execute if run directly
if (require.main === module) {
  deployFullTestnetPlatform()
    .then((result) => {
      console.log("\n🎉 TESTNET DEPLOYMENT COMPLETED SUCCESSFULLY!");
      console.log("=============================================");
      console.log("🚀 Platform is now live on Spicy testnet!");
      console.log("📱 Ready for user testing and interaction!");
      console.log("🌟 10 Celebrity ecosystems fully operational!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Testnet deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployFullTestnetPlatform };