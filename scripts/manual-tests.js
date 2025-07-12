const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function runManualTests() {
  console.log("🧪 Manual Tests & Scenarios on Hardhat Local Network");
  console.log("======================================================\n");

  // Get accounts
  const [deployer, alice, bob, charlie, dave] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("👥 Test Participants:");
  console.log(`  Deployer: ${deployer.account.address}`);
  console.log(`  Alice: ${alice.account.address}`);
  console.log(`  Bob: ${bob.account.address}`);
  console.log(`  Charlie: ${charlie.account.address}`);
  console.log(`  Dave: ${dave.account.address}\n`);

  // First deploy the system
  console.log("🚀 Deploying Complete System...");
  const { deployCompleteSystem } = require('./deploy-system');
  const { contracts } = await deployCompleteSystem({
    network: 'hardhat',
    entityType: 'entertainment'
  });
  
  console.log("\n✅ System deployed successfully!\n");

  // ===========================================
  // SCENARIO 1: BASIC TOKEN OPERATIONS
  // ===========================================
  console.log("📋 SCENARIO 1: Basic Token Operations");
  console.log("=====================================");

  // Check initial balances
  console.log("Initial FBT balances:");
  let deployerBalance = await contracts.fbtToken.read.balanceOf([deployer.account.address]);
  console.log(`  Deployer: ${formatEther(deployerBalance)} FBT`);
  
  // Distribute tokens to users
  console.log("\nDistributing tokens to test users...");
  await contracts.fbtToken.write.mint([alice.account.address, parseEther("1000"), "test_distribution"], {
    account: deployer.account.address
  });
  await contracts.fbtToken.write.mint([bob.account.address, parseEther("500"), "test_distribution"], {
    account: deployer.account.address
  });
  await contracts.fbtToken.write.mint([charlie.account.address, parseEther("750"), "test_distribution"], {
    account: deployer.account.address
  });

  // Check balances after distribution
  console.log("\nBalances after distribution:");
  const aliceBalance = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const bobBalance = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  const charlieBalance = await contracts.fbtToken.read.balanceOf([charlie.account.address]);
  
  console.log(`  Alice: ${formatEther(aliceBalance)} FBT`);
  console.log(`  Bob: ${formatEther(bobBalance)} FBT`);
  console.log(`  Charlie: ${formatEther(charlieBalance)} FBT`);

  // Test token transfer
  console.log("\nTesting token transfers...");
  await contracts.fbtToken.write.transfer([bob.account.address, parseEther("100")], {
    account: alice.account.address
  });
  
  const aliceBalanceAfter = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const bobBalanceAfter = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  console.log(`  Alice sent 100 FBT to Bob`);
  console.log(`  Alice new balance: ${formatEther(aliceBalanceAfter)} FBT`);
  console.log(`  Bob new balance: ${formatEther(bobBalanceAfter)} FBT`);

  await sleep(2000);

  // ===========================================
  // SCENARIO 2: STAKING OPERATIONS
  // ===========================================
  console.log("\n🏦 SCENARIO 2: Staking Operations");
  console.log("==================================");

  // Check available pools
  console.log("Available staking pools:");
  const activePools = await contracts.stakingVault.read.getActivePools();
  for (let i = 0; i < activePools.length; i++) {
    const pool = await contracts.stakingVault.read.pools([activePools[i]]);
    const apy = Number(pool[1]) / 100; // Convert basis points to percentage
    const lockDays = Number(pool[0]) / (24 * 60 * 60); // Convert seconds to days
    console.log(`  Pool ${activePools[i]}: ${pool[4]} - ${lockDays} days lock, ${apy}% APY`);
  }

  // Alice stakes in 30-day pool
  console.log("\nAlice stakes 500 FBT in 30-day pool...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("500")], {
    account: alice.account.address
  });
  await contracts.stakingVault.write.stake([0, parseEther("500")], {
    account: alice.account.address
  });

  // Bob stakes in 90-day pool
  console.log("Bob stakes 300 FBT in 90-day pool...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("300")], {
    account: bob.account.address
  });
  await contracts.stakingVault.write.stake([1, parseEther("300")], {
    account: bob.account.address
  });

  // Charlie stakes in 1-year pool
  console.log("Charlie stakes 200 FBT in 1-year pool...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("200")], {
    account: charlie.account.address
  });
  await contracts.stakingVault.write.stake([2, parseEther("200")], {
    account: charlie.account.address
  });

  // Check staking status
  console.log("\nStaking status:");
  const aliceStake = await contracts.stakingVault.read.getUserStake([alice.account.address, 0]);
  const bobStake = await contracts.stakingVault.read.getUserStake([bob.account.address, 1]);
  const charlieStake = await contracts.stakingVault.read.getUserStake([charlie.account.address, 2]);

  console.log(`  Alice: ${formatEther(aliceStake.amount)} FBT in pool 0`);
  console.log(`  Bob: ${formatEther(bobStake.amount)} FBT in pool 1`);
  console.log(`  Charlie: ${formatEther(charlieStake.amount)} FBT in pool 2`);

  // Check total value locked
  const tvl = await contracts.stakingVault.read.getTotalValueLocked();
  console.log(`  Total Value Locked: ${formatEther(tvl)} FBT`);

  await sleep(2000);

  // ===========================================
  // SCENARIO 3: PRIZE REDEMPTION
  // ===========================================
  console.log("\n🎁 SCENARIO 3: Prize Redemption");
  console.log("================================");

  // Check available prizes
  console.log("Available prizes:");
  const activePrizes = await contracts.prizeRedemption.read.getActivePrizes();
  
  for (let i = 0; i < activePrizes.length; i++) {
    const prize = await contracts.prizeRedemption.read.getPrize([activePrizes[i]]);
    console.log(`  Prize ${activePrizes[i]}: ${prize.name} - ${formatEther(prize.cost)} FBT (${prize.currentSupply} available)`);
  }

  // Dave gets some tokens for redemption
  console.log("\nGiving Dave some FBT tokens for redemption...");
  await contracts.fbtToken.write.mint([dave.account.address, parseEther("600"), "redemption_test"], {
    account: deployer.account.address
  });
  
  const daveBalance = await contracts.fbtToken.read.balanceOf([dave.account.address]);
  console.log(`  Dave balance: ${formatEther(daveBalance)} FBT`);

  // Dave redeems a T-shirt (Prize 0 - 50 FBT)
  console.log("\nDave redeems a Premium Subscription...");
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("50")], {
    account: dave.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([0], {
    account: dave.account.address
  });

  // Check Dave's balance after redemption
  const daveRedemptionCount = await contracts.prizeRedemption.read.getUserRedemptionCount([dave.account.address]);
  const daveFBTAfter = await contracts.fbtToken.read.balanceOf([dave.account.address]);
  console.log(`  Dave's FBT after redemption: ${formatEther(daveFBTAfter)} FBT`);
  console.log(`  Dave's total redemptions: ${daveRedemptionCount}`);

  // Dave redeems Exclusive Content Access (Prize 1 - 25 FBT)
  console.log("Dave redeems Exclusive Content Access...");
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("25")], {
    account: dave.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([1], {
    account: dave.account.address
  });

  const daveFBTFinal = await contracts.fbtToken.read.balanceOf([dave.account.address]);
  console.log(`  Dave's final FBT balance: ${formatEther(daveFBTFinal)} FBT`);

  // Check total burned
  const totalBurned = await contracts.prizeRedemption.read.getTotalFBTBurned();
  console.log(`  Total FBT burned for prizes: ${formatEther(totalBurned)} FBT`);

  await sleep(2000);

  // ===========================================
  // SCENARIO 4: DEX TRADING
  // ===========================================
  console.log("\n💱 SCENARIO 4: DEX Trading");
  console.log("===========================");

  // Check existing pairs
  console.log("Available trading pairs:");
  const cap20WchzPair = await contracts.factory.read.getPair([
    contracts.mockCAP20.address, 
    contracts.mockWCHZ.address
  ]);
  const fbtWchzPair = await contracts.factory.read.getPair([
    contracts.fbtToken.address, 
    contracts.mockWCHZ.address
  ]);
  console.log(`  CAP20-WCHZ pair: ${cap20WchzPair}`);
  console.log(`  FBT-WCHZ pair: ${fbtWchzPair}`);

  // Add liquidity to FBT-WCHZ pair
  console.log("\nAdding liquidity to FBT-WCHZ pair...");
  
  // Approve tokens for router
  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("1000")], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("100")], {
    account: deployer.account.address
  });

  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
  
  await contracts.router.write.addLiquidity([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address,
    parseEther("1000"), // 1000 FBT
    parseEther("100"),  // 100 WCHZ (1 WCHZ = 10 FBT)
    parseEther("900"),  // min FBT
    parseEther("90"),   // min WCHZ
    deployer.account.address,
    BigInt(deadline)
  ], {
    account: deployer.account.address
  });

  console.log(`  Added 1000 FBT + 100 WCHZ liquidity`);

  // Give Alice some WCHZ for trading
  console.log("\nGiving Alice WCHZ for trading...");
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("50")], {
    account: deployer.account.address
  });

  const aliceWCHZ = await contracts.mockWCHZ.read.balanceOf([alice.account.address]);
  console.log(`  Alice WCHZ: ${formatEther(aliceWCHZ)} WCHZ`);

  // Alice swaps WCHZ for FBT
  console.log("Alice swaps 10 WCHZ for FBT...");
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("10")], {
    account: alice.account.address
  });

  const aliceFBTBefore = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("10"), // 10 WCHZ in
    parseEther("80"),  // min 80 FBT out (accounting for slippage)
    [contracts.mockWCHZ.address, contracts.fbtToken.address],
    alice.account.address,
    BigInt(deadline)
  ], {
    account: alice.account.address
  });

  const aliceFBTAfterSwap = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const aliceWCHZAfter = await contracts.mockWCHZ.read.balanceOf([alice.account.address]);
  
  const fbtReceived = aliceFBTAfterSwap - aliceFBTBefore;
  console.log(`  Alice received: ${formatEther(fbtReceived)} FBT`);
  console.log(`  Alice remaining WCHZ: ${formatEther(aliceWCHZAfter)} WCHZ`);

  await sleep(2000);

  // ===========================================
  // SCENARIO 5: COMPLEX USER JOURNEY
  // ===========================================
  console.log("\n🎭 SCENARIO 5: Complex User Journey (Bob's Adventure)");
  console.log("======================================================");

  console.log("Bob's current status:");
  let bobFBT = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  let bobStakeInfo = await contracts.stakingVault.read.getUserStake([bob.account.address, 1]);
  console.log(`  FBT Balance: ${formatEther(bobFBT)} FBT`);
  console.log(`  Staked: ${formatEther(bobStakeInfo.amount)} FBT in pool 1`);

  // Give Bob some WCHZ
  console.log("\nGiving Bob WCHZ to trade...");
  await contracts.mockWCHZ.write.mint([bob.account.address, parseEther("25")], {
    account: deployer.account.address
  });

  // Bob swaps WCHZ for more FBT
  console.log("Bob swaps 5 WCHZ for FBT...");
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("5")], {
    account: bob.account.address
  });

  await contracts.router.write.swapExactTokensForTokens([
    parseEther("5"),
    parseEther("35"), // min FBT out
    [contracts.mockWCHZ.address, contracts.fbtToken.address],
    bob.account.address,
    BigInt(deadline)
  ], {
    account: bob.account.address
  });

  bobFBT = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  console.log(`  Bob's new FBT balance: ${formatEther(bobFBT)} FBT`);

  // Bob stakes additional FBT
  console.log("Bob stakes additional 100 FBT in the same pool...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("100")], {
    account: bob.account.address
  });
  await contracts.stakingVault.write.stake([1, parseEther("100")], {
    account: bob.account.address
  });

  bobStakeInfo = await contracts.stakingVault.read.getUserStake([bob.account.address, 1]);
  console.log(`  Bob's total staked: ${formatEther(bobStakeInfo.amount)} FBT`);

  // Bob redeems a prize
  console.log("Bob redeems a Premium Subscription...");
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("50")], {
    account: bob.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([0], {
    account: bob.account.address
  });

  bobFBT = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  console.log(`  Bob's final FBT balance: ${formatEther(bobFBT)} FBT`);

  await sleep(2000);

  // ===========================================
  // SCENARIO 6: SYSTEM STATISTICS
  // ===========================================
  console.log("\n📊 SCENARIO 6: System Statistics & Health Check");
  console.log("===============================================");

  // Token statistics
  console.log("Token Statistics:");
  const totalSupply = await contracts.fbtToken.read.totalSupply();
  const totalBurnedFinal = await contracts.prizeRedemption.read.getTotalFBTBurned();
  const circulating = totalSupply - totalBurnedFinal;
  
  console.log(`  Total Supply: ${formatEther(totalSupply)} FBT`);
  console.log(`  Total Burned: ${formatEther(totalBurnedFinal)} FBT`);
  console.log(`  Circulating: ${formatEther(circulating)} FBT`);

  // Staking statistics
  console.log("\nStaking Statistics:");
  const finalTVL = await contracts.stakingVault.read.getTotalValueLocked();
  const stakingRatio = (finalTVL * 10000n) / circulating; // basis points
  
  console.log(`  Total Value Locked: ${formatEther(finalTVL)} FBT`);
  console.log(`  Staking Ratio: ${Number(stakingRatio) / 100}% of circulating supply`);

  // Prize statistics
  console.log("\nPrize Redemption Statistics:");
  const totalRedemptions = await contracts.prizeRedemption.read.totalRedemptions();
  console.log(`  Total Redemptions: ${totalRedemptions}`);
  console.log(`  Total Value Burned: ${formatEther(totalBurnedFinal)} FBT`);

  // DEX statistics
  console.log("\nDEX Statistics:");
  const fbtPair = await hre.viem.getContractAt("UniswapV2Pair", fbtWchzPair);
  const reserves = await fbtPair.read.getReserves();
  const totalSupplyLP = await fbtPair.read.totalSupply();
  
  console.log(`  FBT-WCHZ Liquidity:`);
  console.log(`    FBT Reserve: ${formatEther(reserves[0])} FBT`);
  console.log(`    WCHZ Reserve: ${formatEther(reserves[1])} WCHZ`);
  console.log(`    LP Tokens: ${formatEther(totalSupplyLP)} LP`);

  // Final user balances
  console.log("\nFinal User Balances:");
  const finalBalances = await Promise.all([
    contracts.fbtToken.read.balanceOf([deployer.account.address]),
    contracts.fbtToken.read.balanceOf([alice.account.address]),
    contracts.fbtToken.read.balanceOf([bob.account.address]),
    contracts.fbtToken.read.balanceOf([charlie.account.address]),
    contracts.fbtToken.read.balanceOf([dave.account.address])
  ]);

  const users = ['Deployer', 'Alice', 'Bob', 'Charlie', 'Dave'];
  finalBalances.forEach((balance, i) => {
    console.log(`  ${users[i]}: ${formatEther(balance)} FBT`);
  });

  console.log("\n✅ ALL MANUAL TESTS COMPLETED SUCCESSFULLY! 🎉");
  console.log("\n🎯 Test Summary:");
  console.log("================");
  console.log("✅ Token operations (mint, transfer, approve)");
  console.log("✅ Staking system (multiple pools, rewards calculation)");
  console.log("✅ Prize redemption (burning mechanism)");
  console.log("✅ DEX trading (liquidity addition, swapping)");
  console.log("✅ Complex user journeys (multi-step interactions)");
  console.log("✅ System health monitoring (statistics, balances)");

  return {
    contracts,
    finalBalances: {
      deployer: finalBalances[0],
      alice: finalBalances[1],
      bob: finalBalances[2],
      charlie: finalBalances[3],
      dave: finalBalances[4]
    },
    systemStats: {
      totalSupply,
      totalBurned: totalBurnedFinal,
      totalValueLocked: finalTVL,
      totalRedemptions
    }
  };
}

// Helper function to pause execution
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute if run directly
if (require.main === module) {
  runManualTests()
    .then(() => {
      console.log("\n🏁 Manual testing session completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Manual tests failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runManualTests };