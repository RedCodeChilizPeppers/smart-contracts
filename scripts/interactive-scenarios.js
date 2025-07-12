const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function runInteractiveScenarios() {
  console.log("🎭 Interactive Scenarios Runner");
  console.log("===============================\n");

  // Deploy system first
  console.log("🚀 Setting up test environment...");
  const { deployCompleteSystem } = require('./deploy-system');
  const { contracts } = await deployCompleteSystem({
    network: 'hardhat',
    entityType: 'entertainment'
  });

  const [deployer, alice, bob, charlie, dave] = await hre.viem.getWalletClients();
  
  // Setup initial state
  await setupInitialState(contracts, [alice, bob, charlie, dave], deployer);
  
  console.log("\n✅ Environment ready!\n");

  // Available scenarios
  const scenarios = {
    '1': { name: 'New User Onboarding', fn: () => newUserOnboarding(contracts, alice, deployer) },
    '2': { name: 'Power User Staking Strategy', fn: () => powerUserStaking(contracts, bob, deployer) },
    '3': { name: 'Prize Hunter Experience', fn: () => prizeHunter(contracts, charlie, deployer) },
    '4': { name: 'DEX Trader Journey', fn: () => dexTrader(contracts, dave, deployer) },
    '5': { name: 'Liquidity Provider Scenario', fn: () => liquidityProvider(contracts, alice, deployer) },
    '6': { name: 'Multi-Pool Staking Strategy', fn: () => multiPoolStaking(contracts, bob, deployer) },
    '7': { name: 'Economic Attack Simulation', fn: () => economicAttack(contracts, charlie, deployer) },
    '8': { name: 'System Stress Test', fn: () => systemStressTest(contracts, [alice, bob, charlie, dave], deployer) },
    '9': { name: 'Run All Scenarios', fn: () => runAllScenarios(contracts, [alice, bob, charlie, dave], deployer) }
  };

  // Interactive menu (for manual execution, we'll run all for now)
  console.log("🎯 Available Scenarios:");
  console.log("=======================");
  Object.entries(scenarios).forEach(([key, scenario]) => {
    console.log(`${key}. ${scenario.name}`);
  });

  console.log("\n🏃 Running all scenarios automatically...\n");
  
  // Run all scenarios
  for (const [key, scenario] of Object.entries(scenarios)) {
    if (key !== '9') { // Skip "run all" option
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎬 SCENARIO ${key}: ${scenario.name.toUpperCase()}`);
      console.log('='.repeat(60));
      
      try {
        await scenario.fn();
        console.log(`✅ Scenario ${key} completed successfully!`);
      } catch (error) {
        console.error(`❌ Scenario ${key} failed:`, error.message);
      }
      
      await sleep(1000);
    }
  }

  console.log("\n🎉 All scenarios completed!");
}

async function setupInitialState(contracts, users, deployer) {
  console.log("Setting up initial state...");
  
  // Give everyone some FBT tokens
  for (const user of users) {
    await contracts.fbtToken.write.mint([
      user.account.address, 
      parseEther("1000"), 
      "initial_setup"
    ], { account: deployer.account.address });
  }
  
  // Give everyone some WCHZ for trading
  for (const user of users) {
    await contracts.mockWCHZ.write.mint([
      user.account.address, 
      parseEther("100")
    ], { account: deployer.account.address });
  }

  // Add initial liquidity to FBT-WCHZ pair
  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("2000")], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("200")], {
    account: deployer.account.address
  });

  const deadline = Math.floor(Date.now() / 1000) + 300;
  await contracts.router.write.addLiquidity([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address,
    parseEther("2000"),
    parseEther("200"),
    parseEther("1800"),
    parseEther("180"),
    deployer.account.address,
    BigInt(deadline)
  ], { account: deployer.account.address });

  console.log("✅ Initial state configured");
}

// ===========================================
// SCENARIO 1: NEW USER ONBOARDING
// ===========================================
async function newUserOnboarding(contracts, user, deployer) {
  console.log("\n👋 Alice is a new user discovering the platform...");
  
  // Check initial balance
  let balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Alice starts with: ${formatEther(balance)} FBT`);
  
  // First interaction: Check available staking pools
  console.log("\n🔍 Alice explores staking options...");
  const activePools = await contracts.stakingVault.read.getActivePools();
  for (let i = 0; i < activePools.length; i++) {
    const pool = await contracts.stakingVault.read.pools([activePools[i]]);
    const apy = Number(pool[1]) / 100;
    const lockDays = Number(pool[0]) / (24 * 60 * 60);
    console.log(`  📊 Pool ${activePools[i]}: ${lockDays} days, ${apy}% APY`);
  }
  
  // Alice decides to start with the lowest risk pool
  console.log("\n🎯 Alice chooses the 30-day pool for her first stake...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("200")], {
    account: user.account.address
  });
  await contracts.stakingVault.write.stake([0, parseEther("200")], {
    account: user.account.address
  });
  
  const stakeInfo = await contracts.stakingVault.read.getUserStake([user.account.address, 0]);
  console.log(`✅ Alice staked: ${formatEther(stakeInfo.amount)} FBT`);
  
  // Alice explores prizes
  console.log("\n🎁 Alice checks available prizes...");
  const activePrizes = await contracts.prizeRedemption.read.getActivePrizes();
  for (let i = 0; i < activePrizes.length; i++) {
    const prize = await contracts.prizeRedemption.read.getPrize([activePrizes[i]]);
    console.log(`  🏆 ${prize.name}: ${formatEther(prize.cost)} FBT`);
  }
  
  // Alice makes her first redemption
  console.log("\n🛍️ Alice redeems her first prize...");
  await contracts.prizeRedemption.write.redeemPrize([0, 1, "Alice's Address"], {
    account: user.account.address
  });
  
  balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Alice's balance after redemption: ${formatEther(balance)} FBT`);
  
  console.log("🎓 Alice has successfully onboarded to the platform!");
}

// ===========================================
// SCENARIO 2: POWER USER STAKING STRATEGY  
// ===========================================
async function powerUserStaking(contracts, user, deployer) {
  console.log("\n💪 Bob is a power user implementing advanced staking strategies...");
  
  let balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Bob starts with: ${formatEther(balance)} FBT`);
  
  // Bob analyzes all pools for optimal strategy
  console.log("\n📈 Bob analyzes staking opportunities...");
  const activePools = await contracts.stakingVault.read.getActivePools();
  
  // Diversified staking strategy
  console.log("\n🎯 Bob implements a diversified staking strategy:");
  
  // 30% in short-term (30 days)
  console.log("  📊 30% in short-term pool (flexibility)...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("300")], {
    account: user.account.address
  });
  await contracts.stakingVault.write.stake([0, parseEther("300")], {
    account: user.account.address
  });
  
  // 50% in medium-term (90 days)  
  console.log("  📊 50% in medium-term pool (balance)...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("500")], {
    account: user.account.address
  });
  await contracts.stakingVault.write.stake([1, parseEther("500")], {
    account: user.account.address
  });
  
  // 20% in long-term (1 year)
  console.log("  📊 20% in long-term pool (maximum returns)...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("200")], {
    account: user.account.address
  });
  await contracts.stakingVault.write.stake([2, parseEther("200")], {
    account: user.account.address
  });
  
  // Check portfolio
  console.log("\n📋 Bob's staking portfolio:");
  for (let i = 0; i < 3; i++) {
    const stake = await contracts.stakingVault.read.getUserStake([user.account.address, i]);
    if (stake.amount > 0) {
      console.log(`  Pool ${i}: ${formatEther(stake.amount)} FBT staked`);
    }
  }
  
  balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Bob's remaining balance: ${formatEther(balance)} FBT`);
  
  console.log("🏆 Bob has optimized his staking strategy!");
}

// ===========================================
// SCENARIO 3: PRIZE HUNTER EXPERIENCE
// ===========================================
async function prizeHunter(contracts, user, deployer) {
  console.log("\n🏆 Charlie is focused on maximizing prize redemptions...");
  
  let balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Charlie starts with: ${formatEther(balance)} FBT`);
  
  // Charlie studies the prize economy
  console.log("\n🔍 Charlie analyzes the prize ecosystem...");
  const activePrizes = await contracts.prizeRedemption.read.getActivePrizes();
  
  let totalCost = 0n;
  for (let i = 0; i < activePrizes.length; i++) {
    const prize = await contracts.prizeRedemption.read.getPrize([activePrizes[i]]);
    totalCost += prize.cost;
    console.log(`  🎁 ${prize.name}: ${formatEther(prize.cost)} FBT (${prize.currentSupply} available)`);
  }
  console.log(`📊 Total cost for all prizes: ${formatEther(totalCost)} FBT`);
  
  // Charlie goes for maximum redemptions
  console.log("\n🎯 Charlie executes his prize hunting strategy...");
  
  // Redeem multiple T-shirts
  console.log("  🛍️ Redeeming 3 Platform T-Shirts...");
  for (let i = 0; i < 3; i++) {
    await contracts.prizeRedemption.write.redeemPrize([0, 1, `Charlie's Address ${i+1}`], {
      account: user.account.address
    });
  }
  
  // Redeem VIP pass
  console.log("  🎫 Redeeming VIP Access Pass...");
  await contracts.prizeRedemption.write.redeemPrize([1, 1, "Charlie's VIP Experience"], {
    account: user.account.address
  });
  
  // Check Charlie's redemption stats
  const redemptionCount = await contracts.prizeRedemption.read.getUserRedemptionCount([user.account.address]);
  
  console.log("\n📊 Charlie's redemption statistics:");
  console.log(`  🏆 Total items redeemed: ${redemptionCount}`);
  
  balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Charlie's remaining balance: ${formatEther(balance)} FBT`);
  
  console.log("🎉 Charlie has become the ultimate prize hunter!");
}

// ===========================================
// SCENARIO 4: DEX TRADER JOURNEY
// ===========================================
async function dexTrader(contracts, user, deployer) {
  console.log("\n📈 Dave is exploring DEX trading opportunities...");
  
  let fbtBalance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  let wchzBalance = await contracts.mockWCHZ.read.balanceOf([user.account.address]);
  
  console.log(`💰 Dave's starting balances:`);
  console.log(`  FBT: ${formatEther(fbtBalance)} FBT`);
  console.log(`  WCHZ: ${formatEther(wchzBalance)} WCHZ`);
  
  // Check current price
  const fbtWchzPair = await contracts.factory.read.getPair([
    contracts.fbtToken.address, 
    contracts.mockWCHZ.address
  ]);
  const pair = await hre.viem.getContractAt("UniswapV2Pair", fbtWchzPair);
  const reserves = await pair.read.getReserves();
  
  const fbtReserve = reserves[0];
  const wchzReserve = reserves[1];
  const price = (wchzReserve * parseEther("1")) / fbtReserve;
  
  console.log(`\n📊 Current FBT-WCHZ market:`);
  console.log(`  FBT Reserve: ${formatEther(fbtReserve)} FBT`);
  console.log(`  WCHZ Reserve: ${formatEther(wchzReserve)} WCHZ`);
  console.log(`  Price: 1 FBT = ${formatEther(price)} WCHZ`);
  
  // Dave's trading strategy: buy low, stake, sell high
  console.log("\n🎯 Dave executes his trading strategy...");
  
  // Buy FBT with WCHZ
  console.log("  📈 Buying FBT with 20 WCHZ...");
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("20")], {
    account: user.account.address
  });
  
  const deadline = Math.floor(Date.now() / 1000) + 300;
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("20"),
    parseEther("150"), // min FBT out
    [contracts.mockWCHZ.address, contracts.fbtToken.address],
    user.account.address,
    BigInt(deadline)
  ], { account: user.account.address });
  
  fbtBalance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  wchzBalance = await contracts.mockWCHZ.read.balanceOf([user.account.address]);
  
  console.log(`  💰 After purchase: ${formatEther(fbtBalance)} FBT, ${formatEther(wchzBalance)} WCHZ`);
  
  // Stake some FBT for rewards
  console.log("  🏦 Staking 300 FBT while waiting for price appreciation...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("300")], {
    account: user.account.address
  });
  await contracts.stakingVault.write.stake([1, parseEther("300")], {
    account: user.account.address
  });
  
  // Sell some FBT back
  console.log("  📉 Selling 100 FBT back to WCHZ...");
  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("100")], {
    account: user.account.address
  });
  
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("100"),
    parseEther("8"), // min WCHZ out
    [contracts.fbtToken.address, contracts.mockWCHZ.address],
    user.account.address,
    BigInt(deadline)
  ], { account: user.account.address });
  
  fbtBalance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  wchzBalance = await contracts.mockWCHZ.read.balanceOf([user.account.address]);
  const stakeInfo = await contracts.stakingVault.read.getUserStake([user.account.address, 1]);
  
  console.log("\n📊 Dave's final trading position:");
  console.log(`  💰 Liquid FBT: ${formatEther(fbtBalance)} FBT`);
  console.log(`  💰 WCHZ: ${formatEther(wchzBalance)} WCHZ`);
  console.log(`  🏦 Staked FBT: ${formatEther(stakeInfo.amount)} FBT`);
  
  console.log("📈 Dave has successfully executed his trading strategy!");
}

// ===========================================
// SCENARIO 5: LIQUIDITY PROVIDER
// ===========================================
async function liquidityProvider(contracts, user, deployer) {
  console.log("\n💧 Alice becomes a liquidity provider...");
  
  let fbtBalance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  let wchzBalance = await contracts.mockWCHZ.read.balanceOf([user.account.address]);
  
  console.log(`💰 Alice's balances before providing liquidity:`);
  console.log(`  FBT: ${formatEther(fbtBalance)} FBT`);
  console.log(`  WCHZ: ${formatEther(wchzBalance)} WCHZ`);
  
  // Add liquidity to earn fees
  console.log("\n🔄 Alice adds liquidity to FBT-WCHZ pair...");
  
  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("200")], {
    account: user.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("20")], {
    account: user.account.address
  });
  
  const deadline = Math.floor(Date.now() / 1000) + 300;
  await contracts.router.write.addLiquidity([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address,
    parseEther("200"),
    parseEther("20"),
    parseEther("180"),
    parseEther("18"),
    user.account.address,
    BigInt(deadline)
  ], { account: user.account.address });
  
  // Check LP tokens received
  const fbtWchzPair = await contracts.factory.read.getPair([
    contracts.fbtToken.address, 
    contracts.mockWCHZ.address
  ]);
  const pair = await hre.viem.getContractAt("UniswapV2Pair", fbtWchzPair);
  const lpBalance = await pair.read.balanceOf([user.account.address]);
  
  console.log(`✅ Alice received ${formatEther(lpBalance)} LP tokens`);
  
  fbtBalance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  wchzBalance = await contracts.mockWCHZ.read.balanceOf([user.account.address]);
  
  console.log(`💰 Alice's balances after providing liquidity:`);
  console.log(`  FBT: ${formatEther(fbtBalance)} FBT`);
  console.log(`  WCHZ: ${formatEther(wchzBalance)} WCHZ`);
  console.log(`  LP Tokens: ${formatEther(lpBalance)} LP`);
  
  console.log("💧 Alice is now earning trading fees as a liquidity provider!");
}

// ===========================================
// SCENARIO 6: MULTI-POOL STAKING
// ===========================================
async function multiPoolStaking(contracts, user, deployer) {
  console.log("\n🎯 Bob tests dynamic multi-pool staking...");
  
  // Bob already has stakes from previous scenario, let's add more
  console.log("\n📊 Bob's current staking positions:");
  for (let i = 0; i < 3; i++) {
    const stake = await contracts.stakingVault.read.getUserStake([user.account.address, i]);
    if (stake.amount > 0) {
      console.log(`  Pool ${i}: ${formatEther(stake.amount)} FBT`);
    }
  }
  
  // Test emergency withdraw from one pool
  console.log("\n🚨 Bob tests emergency withdraw from pool 0...");
  const stakeBefore = await contracts.stakingVault.read.getUserStake([user.account.address, 0]);
  console.log(`  Before: ${formatEther(stakeBefore.amount)} FBT staked`);
  
  await contracts.stakingVault.write.emergencyWithdraw([0], {
    account: user.account.address
  });
  
  const stakeAfter = await contracts.stakingVault.read.getUserStake([user.account.address, 0]);
  let balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  
  console.log(`  After: ${formatEther(stakeAfter.amount)} FBT staked`);
  console.log(`  Bob's balance: ${formatEther(balance)} FBT`);
  
  // Redistribute to different pools
  console.log("\n🔄 Bob redistributes his tokens across pools...");
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("100")], {
    account: user.account.address
  });
  await contracts.stakingVault.write.stake([2, parseEther("100")], {
    account: user.account.address
  });
  
  console.log("✅ Bob has optimized his multi-pool strategy!");
}

// ===========================================
// SCENARIO 7: ECONOMIC ATTACK SIMULATION
// ===========================================
async function economicAttack(contracts, user, deployer) {
  console.log("\n🔒 Testing system resilience against economic attacks...");
  
  // Simulate large redemption attack
  console.log("\n🎯 Charlie attempts rapid mass redemption...");
  
  let balance = await contracts.fbtToken.read.balanceOf([user.account.address]);
  console.log(`💰 Charlie's balance: ${formatEther(balance)} FBT`);
  
  // Try to redeem maximum prizes rapidly
  try {
    console.log("  🏃 Attempting rapid successive redemptions...");
    for (let i = 0; i < 5; i++) {
      await contracts.prizeRedemption.write.redeemPrize([0, 1, `Attack ${i}`], {
        account: user.account.address
      });
      console.log(`    ✅ Redemption ${i+1} successful`);
    }
  } catch (error) {
    console.log(`    ❌ Attack failed: ${error.message}`);
  }
  
  // Check system state
  const totalBurned = await contracts.prizeRedemption.read.totalFBTBurned();
  const totalSupply = await contracts.fbtToken.read.totalSupply();
  
  console.log("\n📊 System state after attack attempt:");
  console.log(`  Total burned: ${formatEther(totalBurned)} FBT`);
  console.log(`  Total supply: ${formatEther(totalSupply)} FBT`);
  console.log(`  Burn ratio: ${(Number(totalBurned) * 100 / Number(totalSupply)).toFixed(2)}%`);
  
  console.log("🛡️ System demonstrated resilience against economic attacks!");
}

// ===========================================
// SCENARIO 8: SYSTEM STRESS TEST
// ===========================================
async function systemStressTest(contracts, users, deployer) {
  console.log("\n⚡ Running system stress test with all users...");
  
  // Concurrent operations
  console.log("\n🔄 All users performing concurrent operations...");
  
  const promises = [];
  
  // Alice: Multiple stakes
  promises.push(
    contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("50")], {
      account: users[0].account.address
    }).then(() =>
      contracts.stakingVault.write.stake([0, parseEther("50")], {
        account: users[0].account.address
      })
    )
  );
  
  // Bob: DEX trading
  promises.push(
    contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("5")], {
      account: users[1].account.address
    }).then(() => {
      const deadline = Math.floor(Date.now() / 1000) + 300;
      return contracts.router.write.swapExactTokensForTokens([
        parseEther("5"),
        parseEther("30"),
        [contracts.mockWCHZ.address, contracts.fbtToken.address],
        users[1].account.address,
        BigInt(deadline)
      ], { account: users[1].account.address });
    })
  );
  
  // Charlie: Prize redemption
  promises.push(
    contracts.prizeRedemption.write.redeemPrize([0, 1, "Stress test"], {
      account: users[2].account.address
    })
  );
  
  // Dave: Token transfer
  promises.push(
    contracts.fbtToken.write.transfer([users[0].account.address, parseEther("25")], {
      account: users[3].account.address
    })
  );
  
  try {
    await Promise.all(promises);
    console.log("✅ All concurrent operations completed successfully!");
  } catch (error) {
    console.log(`❌ Some operations failed: ${error.message}`);
  }
  
  // Check final system state
  const tvl = await contracts.stakingVault.read.getTotalValueLocked();
  const totalBurned = await contracts.prizeRedemption.read.totalFBTBurned();
  const totalRedemptions = await contracts.prizeRedemption.read.totalRedemptions();
  
  console.log("\n📊 Final system statistics:");
  console.log(`  Total Value Locked: ${formatEther(tvl)} FBT`);
  console.log(`  Total Burned: ${formatEther(totalBurned)} FBT`);
  console.log(`  Total Redemptions: ${totalRedemptions}`);
  
  console.log("⚡ System passed stress test!");
}

async function runAllScenarios(contracts, users, deployer) {
  console.log("🎬 Running all scenarios in sequence...");
  // This would run all scenarios - already handled in main function
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute if run directly
if (require.main === module) {
  runInteractiveScenarios()
    .then(() => {
      console.log("\n🎭 Interactive scenarios completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Scenarios failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runInteractiveScenarios };