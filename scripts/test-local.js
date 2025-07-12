const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function testLocal() {
  console.log("🏠 Local Hardhat Network Test Suite");
  console.log("====================================\n");

  // Verify we're on local network
  const network = await hre.network.provider.send("eth_chainId");
  if (parseInt(network, 16) !== 31337) {
    throw new Error("This script is for local Hardhat network only (chain ID 31337)");
  }

  console.log("✅ Running on Hardhat local network (chain ID: 31337)\n");

  // Get multiple accounts (available on local network)
  const [deployer, alice, bob, charlie, dave] = await hre.viem.getWalletClients();
  
  console.log("👥 Test Participants:");
  console.log(`  Deployer: ${deployer.account.address}`);
  console.log(`  Alice: ${alice.account.address}`);
  console.log(`  Bob: ${bob.account.address}`);
  console.log(`  Charlie: ${charlie.account.address}`);
  console.log(`  Dave: ${dave.account.address}\n`);

  // Deploy complete system
  console.log("🚀 Deploying complete system...");
  const { deployCompleteSystem } = require('./deploy-system');
  const { contracts } = await deployCompleteSystem({
    network: 'hardhat',
    entityType: 'entertainment'
  });
  
  console.log("✅ System deployed successfully!\n");

  // Run comprehensive tests with multiple users
  console.log("🧪 Running comprehensive local tests...\n");

  // Test 1: Multi-user token operations
  console.log("1️⃣ Multi-User Token Operations");
  console.log("------------------------------");
  
  // Distribute tokens to all users
  const users = [alice, bob, charlie, dave];
  const amounts = [parseEther("1000"), parseEther("500"), parseEther("750"), parseEther("600")];
  
  for (let i = 0; i < users.length; i++) {
    await contracts.fbtToken.write.mint([
      users[i].account.address, 
      amounts[i], 
      "test_distribution"
    ], { account: deployer.account.address });
    
    const balance = await contracts.fbtToken.read.balanceOf([users[i].account.address]);
    console.log(`  ${['Alice', 'Bob', 'Charlie', 'Dave'][i]}: ${formatEther(balance)} FBT`);
  }

  // Test transfers between users
  await contracts.fbtToken.write.transfer([bob.account.address, parseEther("100")], {
    account: alice.account.address
  });
  console.log("  ✅ Alice → Bob transfer: 100 FBT");

  // Test 2: Multi-pool staking
  console.log("\n2️⃣ Multi-Pool Staking Strategy");
  console.log("------------------------------");
  
  // Alice stakes in pool 0 (30 days)
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("300")], {
    account: alice.account.address
  });
  await contracts.stakingVault.write.stake([0, parseEther("300")], {
    account: alice.account.address
  });
  
  // Bob stakes in pool 1 (90 days)
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("200")], {
    account: bob.account.address
  });
  await contracts.stakingVault.write.stake([1, parseEther("200")], {
    account: bob.account.address
  });
  
  // Charlie stakes in pool 2 (1 year)
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("400")], {
    account: charlie.account.address
  });
  await contracts.stakingVault.write.stake([2, parseEther("400")], {
    account: charlie.account.address
  });

  const tvl = await contracts.stakingVault.read.getTotalValueLocked();
  console.log(`  Total Value Locked: ${formatEther(tvl)} FBT`);
  console.log("  ✅ Multi-pool staking successful");

  // Test 3: Prize redemption competition
  console.log("\n3️⃣ Prize Redemption Competition");
  console.log("-------------------------------");
  
  // Multiple users redeem different prizes
  // Alice redeems Premium Subscription (50 FBT)
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("50")], {
    account: alice.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([0], {
    account: alice.account.address
  });
  
  // Bob redeems Premium Subscription (50 FBT) 
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("50")], {
    account: bob.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([0], {
    account: bob.account.address
  });
  
  // Charlie redeems Exclusive Content Access (25 FBT)
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("25")], {
    account: charlie.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([1], {
    account: charlie.account.address
  });

  const totalBurned = await contracts.prizeRedemption.read.getTotalFBTBurned();
  const totalRedemptions = await contracts.prizeRedemption.read.totalRedemptions();
  console.log(`  Total FBT burned: ${formatEther(totalBurned)} FBT`);
  console.log(`  Total redemptions: ${totalRedemptions}`);
  console.log("  ✅ Prize redemption working");

  // Test 4: DEX operations with liquidity
  console.log("\n4️⃣ DEX Liquidity & Trading Setup");
  console.log("---------------------------------");
  
  // Add liquidity
  await contracts.fbtToken.write.mint([deployer.account.address, parseEther("1000"), "dex_liquidity"], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.mint([deployer.account.address, parseEther("100")], {
    account: deployer.account.address
  });

  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("1000")], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("100")], {
    account: deployer.account.address
  });

  const deadline = Math.floor(Date.now() / 1000) + 300;
  await contracts.router.write.addLiquidity([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address,
    parseEther("1000"),
    parseEther("100"),
    parseEther("900"),
    parseEther("90"),
    deployer.account.address,
    BigInt(deadline)
  ], { account: deployer.account.address });

  const fbtWchzPair = await contracts.factory.read.getPair([
    contracts.fbtToken.address, 
    contracts.mockWCHZ.address
  ]);
  
  console.log(`  FBT-WCHZ Pair: ${fbtWchzPair}`);
  console.log("  ✅ DEX liquidity added successfully");

  // Test a swap to verify trading works
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("10")], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("5")], {
    account: alice.account.address
  });

  const aliceBeforeSwap = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("5"),
    parseEther("40"),
    [contracts.mockWCHZ.address, contracts.fbtToken.address],
    alice.account.address,
    BigInt(deadline)
  ], { account: alice.account.address });

  const aliceAfterSwap = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const fbtReceived = aliceAfterSwap - aliceBeforeSwap;
  console.log(`  ✅ Alice swapped 5 WCHZ → ${formatEther(fbtReceived)} FBT`);

  // Final system statistics
  console.log("\n📊 Final System Statistics");
  console.log("==========================");
  
  const finalTvl = await contracts.stakingVault.read.getTotalValueLocked();
  const finalBurned = await contracts.prizeRedemption.read.getTotalFBTBurned();
  const totalSupply = await contracts.fbtToken.read.totalSupply();
  
  console.log(`Total Supply: ${formatEther(totalSupply)} FBT`);
  console.log(`Total Staked: ${formatEther(finalTvl)} FBT`);
  console.log(`Total Burned: ${formatEther(finalBurned)} FBT`);
  console.log(`Staking Ratio: ${(Number(finalTvl) * 100 / Number(totalSupply)).toFixed(2)}%`);
  console.log(`Burn Ratio: ${(Number(finalBurned) * 100 / Number(totalSupply)).toFixed(2)}%`);

  console.log("\n🎯 Local Test Summary");
  console.log("====================");
  console.log("✅ Multi-user token operations");
  console.log("✅ Multi-pool staking strategies");
  console.log("✅ Prize redemption system");
  console.log("✅ DEX liquidity provision & trading");
  console.log("✅ System statistics tracking");
  
  console.log("\n🏠 All local tests completed successfully!");
  
  return { contracts, users: [alice, bob, charlie, dave] };
}

// Execute if run directly
if (require.main === module) {
  testLocal()
    .then(() => {
      console.log("\n🏁 Local testing session completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Local tests failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testLocal };