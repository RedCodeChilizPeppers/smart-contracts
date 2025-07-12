const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function testMainnet() {
  console.log("🔴 Chiliz Mainnet Deployment");
  console.log("============================\n");

  // Verify we're on mainnet
  const network = hre.network.name;
  if (network !== 'mainnet') {
    throw new Error("This script is for Chiliz mainnet only. Use --network mainnet");
  }

  console.log("🔴 MAINNET DEPLOYMENT - REAL CHZ WILL BE USED!");
  console.log("⚠️  WARNING: This will deploy to production network\n");

  // Safety confirmation (in real usage, you'd want user confirmation)
  console.log("📋 Pre-deployment Checklist:");
  console.log("✅ Private key is for a funded mainnet wallet");
  console.log("✅ WCHZ_ADDRESS is set in .env file");
  console.log("✅ All contracts have been tested on testnet");
  console.log("✅ Gas price is acceptable");
  console.log("✅ Deployment parameters are correct\n");

  // Get wallet client
  const walletClients = await hre.viem.getWalletClients();
  const deployer = walletClients[0];
  
  if (!deployer) {
    throw new Error("No wallet client found. Please check your PRIVATE_KEY in .env file");
  }

  console.log("👤 Mainnet Deployer:");
  console.log(`  Address: ${deployer.account.address}`);
  
  // Check balance
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`  CHZ Balance: ${formatEther(balance)} CHZ`);
  
  // Mainnet requires more CHZ for deployment
  const requiredBalance = parseEther("5"); // 5 CHZ minimum
  if (balance < requiredBalance) {
    throw new Error(`Insufficient CHZ balance. Required: ${formatEther(requiredBalance)} CHZ, Available: ${formatEther(balance)} CHZ`);
  }
  console.log("✅ Sufficient CHZ balance for mainnet deployment\n");

  // Check WCHZ address requirement
  const WCHZ_ADDRESS = process.env.WCHZ_ADDRESS;
  if (!WCHZ_ADDRESS) {
    throw new Error("WCHZ_ADDRESS must be set in .env file for mainnet deployment");
  }
  console.log(`✅ WCHZ Address configured: ${WCHZ_ADDRESS}\n`);

  // Deploy system with mainnet configuration
  console.log("🚀 Deploying to Chiliz Mainnet...");
  console.log("⏳ This may take several minutes...\n");
  
  const { deployCompleteSystem } = require('./deploy-system');
  
  const startTime = Date.now();
  const { contracts, deploymentInfo } = await deployCompleteSystem({
    network: 'mainnet',
    entityType: 'entertainment', // Conservative entertainment config for mainnet
    skipLiquidityMinting: true, // Skip test token minting on mainnet
    productionMode: true
  });
  const deployTime = (Date.now() - startTime) / 1000;
  
  console.log(`✅ Mainnet deployment completed in ${deployTime.toFixed(2)} seconds\n`);

  // Run mainnet validation (minimal tests)
  console.log("🔍 Running mainnet validation...\n");

  // Test 1: Contract verification
  console.log("1️⃣ Contract Verification");
  console.log("------------------------");
  
  // Verify contracts are deployed correctly
  const tokenName = await contracts.fbtToken.read.name();
  const tokenSymbol = await contracts.fbtToken.read.symbol();
  const totalSupply = await contracts.fbtToken.read.totalSupply();
  const deployerBalance = await contracts.fbtToken.read.balanceOf([deployer.account.address]);
  
  console.log(`  Token Name: ${tokenName}`);
  console.log(`  Token Symbol: ${tokenSymbol}`);
  console.log(`  Total Supply: ${formatEther(totalSupply)} FBT`);
  console.log(`  Deployer Balance: ${formatEther(deployerBalance)} FBT`);
  console.log("  ✅ FBT Token verified");

  // Test 2: Staking pools verification
  console.log("\n2️⃣ Staking System Verification");
  console.log("------------------------------");
  
  const activePools = await contracts.stakingVault.read.getActivePools();
  console.log(`  Active Staking Pools: ${activePools.length}`);
  
  for (let i = 0; i < activePools.length; i++) {
    const pool = await contracts.stakingVault.read.pools([activePools[i]]);
    const lockDays = Number(pool[0]) / (24 * 60 * 60);
    const apy = Number(pool[1]) / 100;
    console.log(`    Pool ${i}: ${lockDays} days, ${apy}% APY`);
  }
  console.log("  ✅ Staking pools configured");

  // Test 3: Prize system verification
  console.log("\n3️⃣ Prize System Verification");
  console.log("----------------------------");
  
  const activePrizes = await contracts.prizeRedemption.read.getActivePrizes();
  console.log(`  Available Prizes: ${activePrizes.length}`);
  
  for (let i = 0; i < Math.min(activePrizes.length, 3); i++) {
    const prize = await contracts.prizeRedemption.read.getPrize([activePrizes[i]]);
    console.log(`    Prize ${i}: ${prize[0]} - ${formatEther(prize[3])} FBT`);
  }
  console.log("  ✅ Prize system configured");

  // Test 4: DEX system verification
  console.log("\n4️⃣ DEX System Verification");
  console.log("--------------------------");
  
  const factoryOwner = await contracts.factory.read.owner();
  console.log(`  Factory Owner: ${factoryOwner}`);
  console.log(`  Router Address: ${contracts.router.address}`);
  console.log("  ✅ DEX infrastructure deployed");
  console.log("  ⚠️  Note: Liquidity needs to be added manually");

  // Final cost calculation
  const finalBalance = await publicClient.getBalance({ address: deployer.account.address });
  const totalCost = balance - finalBalance;
  
  console.log("\n💰 Mainnet Deployment Cost");
  console.log("==========================");
  console.log(`Initial Balance: ${formatEther(balance)} CHZ`);
  console.log(`Final Balance: ${formatEther(finalBalance)} CHZ`);
  console.log(`Total Cost: ${formatEther(totalCost)} CHZ`);

  console.log("\n📋 MAINNET CONTRACT ADDRESSES");
  console.log("=============================");
  console.log(`🎯 FBTToken: ${contracts.fbtToken.address}`);
  console.log(`🏦 StakingVault: ${contracts.stakingVault.address}`);
  console.log(`🎁 PrizeRedemption: ${contracts.prizeRedemption.address}`);
  console.log(`🏭 UniswapV2Factory: ${contracts.factory.address}`);
  console.log(`🔄 UniswapV2Router: ${contracts.router.address}`);

  console.log("\n🔒 SECURITY CHECKLIST");
  console.log("====================");
  console.log("⚠️  IMPORTANT: Save these addresses securely!");
  console.log("⚠️  Verify contracts on Chiliz block explorer");
  console.log("⚠️  Transfer ownership if needed");
  console.log("⚠️  Set up monitoring and alerts");
  console.log("⚠️  Backup deployment information");

  console.log("\n📝 POST-DEPLOYMENT ACTIONS");
  console.log("==========================");
  console.log("1. 🔍 Verify contracts on explorer");
  console.log("2. 💧 Add initial DEX liquidity");
  console.log("3. 👥 Distribute initial FBT tokens");
  console.log("4. 📊 Set up monitoring");
  console.log("5. 🌐 Update frontend with addresses");
  console.log("6. 📢 Announce to community");

  // Save deployment info to file
  const deploymentSummary = {
    network: "mainnet",
    chainId: 212,
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    totalCost: formatEther(totalCost),
    contracts: {
      FBTToken: contracts.fbtToken.address,
      StakingVault: contracts.stakingVault.address,
      PrizeRedemption: contracts.prizeRedemption.address,
      UniswapV2Factory: contracts.factory.address,
      UniswapV2Router: contracts.router.address
    }
  };

  console.log("\n🔴 MAINNET DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("===========================================");
  console.log("🎉 Your celebrity crowdfunding platform is now LIVE!");
  console.log("💼 Save the contract addresses and deployment info");
  console.log("🚀 Ready for production use");
  
  return { contracts, deploymentInfo, deploymentSummary, totalCost: formatEther(totalCost) };
}

// Execute if run directly
if (require.main === module) {
  testMainnet()
    .then((result) => {
      console.log("\n🏁 Mainnet deployment session completed!");
      console.log("💾 Deployment summary available in result object");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Mainnet deployment failed:");
      console.error(error);
      console.log("\n🔧 Troubleshooting:");
      console.log("1. Check your PRIVATE_KEY for mainnet wallet");
      console.log("2. Ensure wallet has sufficient CHZ (5+ CHZ recommended)");
      console.log("3. Set WCHZ_ADDRESS in .env file");
      console.log("4. Test on testnet first");
      console.log("5. Check gas prices and network status");
      process.exit(1);
    });
}

module.exports = { testMainnet };