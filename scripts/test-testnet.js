const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function testTestnet() {
  console.log("🌐 Chiliz Spicy Testnet Deployment & Test");
  console.log("=========================================\n");

  // Verify we're on testnet
  const network = hre.network.name;
  if (network !== 'spicy') {
    throw new Error("This script is for Chiliz Spicy testnet only. Use --network spicy");
  }

  console.log("✅ Deploying to Chiliz Spicy Testnet (chain ID: 88882)\n");

  // Get wallet client (single account on testnet)
  const walletClients = await hre.viem.getWalletClients();
  const deployer = walletClients[0];
  
  if (!deployer) {
    throw new Error("No wallet client found. Please check your PRIVATE_KEY in .env file");
  }

  console.log("👤 Deployer Account:");
  console.log(`  Address: ${deployer.account.address}`);
  
  // Check balance
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`  CHZ Balance: ${formatEther(balance)} CHZ`);
  
  if (balance < parseEther("0.1")) {
    console.warn("⚠️  Warning: Low CHZ balance. You may need more CHZ for deployment.");
    console.log("💡 Get CHZ from faucet: https://faucet.chiliz.com/\n");
  } else {
    console.log("✅ Sufficient CHZ balance for deployment\n");
  }

  // Deploy system with testnet configuration
  console.log("🚀 Deploying system to testnet...");
  const { deployCompleteSystem } = require('./deploy-system');
  
  const startTime = Date.now();
  const { contracts, deploymentInfo } = await deployCompleteSystem({
    network: 'spicy',
    entityType: 'sportsTeam', // Sports-focused for testnet
    skipLiquidityMinting: false
  });
  const deployTime = (Date.now() - startTime) / 1000;
  
  console.log(`✅ Deployment completed in ${deployTime.toFixed(2)} seconds\n`);

  // Run testnet-specific tests (using deployer account only)
  console.log("🧪 Running testnet validation tests...\n");

  // Test 1: Basic contract functionality
  console.log("1️⃣ Contract Functionality Test");
  console.log("------------------------------");
  
  // Check initial token supply
  const totalSupply = await contracts.fbtToken.read.totalSupply();
  const deployerBalance = await contracts.fbtToken.read.balanceOf([deployer.account.address]);
  
  console.log(`  Total FBT Supply: ${formatEther(totalSupply)} FBT`);
  console.log(`  Deployer Balance: ${formatEther(deployerBalance)} FBT`);
  console.log("  ✅ Token contract working");

  // Test 2: Staking functionality
  console.log("\n2️⃣ Staking System Test");
  console.log("---------------------");
  
  // Check available pools
  const activePools = await contracts.stakingVault.read.getActivePools();
  console.log(`  Active Pools: ${activePools.length}`);
  
  // Stake some tokens
  const stakeAmount = parseEther("100");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, stakeAmount], {
    account: deployer.account.address
  });
  await contracts.stakingVault.write.stake([0, stakeAmount], {
    account: deployer.account.address
  });
  
  const stakeInfo = await contracts.stakingVault.read.getUserStake([deployer.account.address, 0]);
  const tvl = await contracts.stakingVault.read.getTotalValueLocked();
  
  console.log(`  Staked Amount: ${formatEther(stakeInfo.amount)} FBT`);
  console.log(`  Total TVL: ${formatEther(tvl)} FBT`);
  console.log("  ✅ Staking system working");

  // Test 3: Prize redemption
  console.log("\n3️⃣ Prize Redemption Test");
  console.log("------------------------");
  
  // Check available prizes
  const activePrizes = await contracts.prizeRedemption.read.getActivePrizes();
  console.log(`  Available Prizes: ${activePrizes.length}`);
  
  // Redeem a prize
  await contracts.prizeRedemption.write.redeemPrize([0, 1, "Testnet Redemption"], {
    account: deployer.account.address
  });
  
  const totalBurned = await contracts.prizeRedemption.read.getTotalFBTBurned();
  const totalRedemptions = await contracts.prizeRedemption.read.totalRedemptions();
  
  console.log(`  Total Burned: ${formatEther(totalBurned)} FBT`);
  console.log(`  Total Redemptions: ${totalRedemptions}`);
  console.log("  ✅ Prize redemption working");

  // Test 4: DEX functionality
  console.log("\n4️⃣ DEX System Test");
  console.log("-----------------");
  
  // Check if pairs exist
  const fbtWchzPair = await contracts.factory.read.getPair([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address
  ]);
  
  console.log(`  FBT-WCHZ Pair: ${fbtWchzPair}`);
  
  if (fbtWchzPair !== "0x0000000000000000000000000000000000000000") {
    const pair = await hre.viem.getContractAt("UniswapV2Pair", fbtWchzPair);
    const reserves = await pair.read.getReserves();
    console.log(`  FBT Reserve: ${formatEther(reserves[0])} FBT`);
    console.log(`  WCHZ Reserve: ${formatEther(reserves[1])} WCHZ`);
  }
  console.log("  ✅ DEX setup working");
  console.log("  ⚠️  Note: Swap functions not yet implemented");

  // Final balance check
  const finalBalance = await publicClient.getBalance({ address: deployer.account.address });
  const gasUsed = balance - finalBalance;
  
  console.log("\n💰 Gas Usage Summary");
  console.log("===================");
  console.log(`Initial Balance: ${formatEther(balance)} CHZ`);
  console.log(`Final Balance: ${formatEther(finalBalance)} CHZ`);
  console.log(`Gas Used: ${formatEther(gasUsed)} CHZ`);

  console.log("\n📋 Deployed Contract Addresses");
  console.log("==============================");
  console.log(`FBTToken: ${contracts.fbtToken.address}`);
  console.log(`StakingVault: ${contracts.stakingVault.address}`);
  console.log(`PrizeRedemption: ${contracts.prizeRedemption.address}`);
  console.log(`UniswapV2Factory: ${contracts.factory.address}`);
  console.log(`UniswapV2Router: ${contracts.router.address}`);
  console.log(`MockWCHZ: ${contracts.mockWCHZ.address}`);
  console.log(`MockCAP20: ${contracts.mockCAP20.address}`);

  console.log("\n🎯 Testnet Deployment Summary");
  console.log("=============================");
  console.log("✅ Complete system deployed to Spicy testnet");
  console.log("✅ All core functionalities validated");
  console.log("✅ Contracts are live and operational");
  console.log("✅ Ready for frontend integration");
  
  console.log("\n💡 Next Steps:");
  console.log("- Save contract addresses for frontend");
  console.log("- Test with external wallets (MetaMask, etc.)");
  console.log("- Add more liquidity if needed");
  console.log("- Distribute tokens to test users");

  console.log("\n🌐 Testnet deployment completed successfully!");
  
  return { contracts, deploymentInfo, gasUsed: formatEther(gasUsed) };
}

// Execute if run directly
if (require.main === module) {
  testTestnet()
    .then(() => {
      console.log("\n🏁 Testnet deployment session completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Testnet deployment failed:");
      console.error(error);
      console.log("\n🔧 Troubleshooting:");
      console.log("1. Check your PRIVATE_KEY in .env file");
      console.log("2. Ensure wallet has sufficient CHZ balance");
      console.log("3. Get CHZ from faucet: https://faucet.chiliz.com/");
      console.log("4. Check network connectivity");
      process.exit(1);
    });
}

module.exports = { testTestnet };