const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

/**
 * Simple Demo Scenarios
 * 
 * Quick demonstration of key platform features with working contracts
 */

async function runSimpleDemoScenarios() {
  console.log("🎬 SIMPLE DEMO SCENARIOS");
  console.log("========================\n");

  const [deployer, celebrity, alice, bob, charlie] = await hre.viem.getWalletClients();
  
  console.log("👥 Demo Participants:");
  console.log(`  🎭 Celebrity: ${celebrity.account.address}`);
  console.log(`  👤 Alice: ${alice.account.address}`);
  console.log(`  👤 Bob: ${bob.account.address}`);
  console.log(`  👤 Charlie: ${charlie.account.address}\n`);

  // Deploy basic system
  const contracts = await deployBasicSystem();
  
  await demoScenario1_BasicTokenOperations(contracts, celebrity, alice, bob);
  await demoScenario2_StakingShowcase(contracts, alice, bob, charlie);
  await demoScenario3_PrizeRedemption(contracts, alice, bob);
  await demoScenario4_DEXTrading(contracts, alice, bob);

  console.log("✅ ALL DEMO SCENARIOS COMPLETED!");
  return contracts;
}

async function demoScenario1_BasicTokenOperations(contracts, celebrity, alice, bob) {
  console.log("🎬 DEMO 1: Basic Token Operations");
  console.log("=================================");
  
  console.log("🎯 Showcasing FBT token system functionality\n");

  // Celebrity creates their branded token
  console.log("🪙 Celebrity Token Creation:");
  console.log("  Celebrity deploys MESSI fan token");
  console.log("  Initial supply: 10,000 MESSI tokens");
  console.log("  Purpose: Fan engagement and rewards\n");

  // Distribute tokens to fans
  await contracts.fbtToken.write.mint([alice.account.address, parseEther("500"), "welcome_bonus"], {
    account: (await hre.viem.getWalletClients())[0].account.address
  });
  await contracts.fbtToken.write.mint([bob.account.address, parseEther("300"), "welcome_bonus"], {
    account: (await hre.viem.getWalletClients())[0].account.address
  });

  console.log("🎁 Token Distribution:");
  console.log("  Alice received: 500 MESSI tokens");
  console.log("  Bob received: 300 MESSI tokens\n");

  // Show token transfers
  await contracts.fbtToken.write.transfer([bob.account.address, parseEther("50")], {
    account: alice.account.address
  });

  const aliceBalance = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const bobBalance = await contracts.fbtToken.read.balanceOf([bob.account.address]);

  console.log("💸 Fan-to-Fan Transfer:");
  console.log(`  Alice sent 50 MESSI to Bob`);
  console.log(`  Alice new balance: ${formatEther(aliceBalance)} MESSI`);
  console.log(`  Bob new balance: ${formatEther(bobBalance)} MESSI\n`);

  // Show token burn for utility
  await contracts.fbtToken.write.burn([parseEther("25"), "early_access"], {
    account: alice.account.address
  });

  const aliceBalanceAfterBurn = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  console.log("🔥 Token Utility Burn:");
  console.log(`  Alice burned 25 MESSI for early access`);
  console.log(`  Alice balance: ${formatEther(aliceBalanceAfterBurn)} MESSI\n`);

  console.log("✅ DEMO 1 COMPLETED: Token Operations Working!\n");
}

async function demoScenario2_StakingShowcase(contracts, alice, bob, charlie) {
  console.log("🎬 DEMO 2: Staking Showcase");
  console.log("===========================");
  
  console.log("🏦 Demonstrating multi-pool staking system\n");

  // Give participants staking tokens
  const deployer = (await hre.viem.getWalletClients())[0];
  await contracts.fbtToken.write.mint([charlie.account.address, parseEther("400"), "staking_demo"], {
    account: deployer.account.address
  });

  console.log("🎁 Staking Tokens Distributed:");
  console.log("  Charlie received: 400 MESSI for staking demo\n");

  // Show different staking strategies
  console.log("📊 Staking Pool Options:");
  console.log("  Pool 0: Monthly Lock (30 days) - 5% APY");
  console.log("  Pool 1: Quarterly Lock (90 days) - 12% APY");
  console.log("  Pool 2: Semi-Annual Lock (180 days) - 20% APY");
  console.log("  Pool 3: Annual Lock (365 days) - 30% APY\n");

  // Fans choose different strategies
  console.log("🎯 Fan Staking Strategies:");

  // Alice - cautious approach
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("200")], {
    account: alice.account.address
  });
  await contracts.stakingVault.write.stake([0, parseEther("200")], {
    account: alice.account.address
  });
  console.log("  Alice: 200 MESSI → Monthly lock (cautious)");

  // Bob - balanced approach
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("250")], {
    account: bob.account.address
  });
  await contracts.stakingVault.write.stake([1, parseEther("250")], {
    account: bob.account.address
  });
  console.log("  Bob: 250 MESSI → Quarterly lock (balanced)");

  // Charlie - aggressive approach
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("400")], {
    account: charlie.account.address
  });
  await contracts.stakingVault.write.stake([3, parseEther("400")], {
    account: charlie.account.address
  });
  console.log("  Charlie: 400 MESSI → Annual lock (max rewards)\n");

  // Show staking results
  const totalStaked = await contracts.stakingVault.read.getTotalValueLocked();
  console.log("📈 Staking Results:");
  console.log(`  Total Value Locked: ${formatEther(totalStaked)} MESSI`);
  console.log(`  Active Stakers: 3 fans with different strategies`);
  console.log(`  Platform Benefits: Long-term token commitment\n`);

  console.log("✅ DEMO 2 COMPLETED: Staking System Engaged!\n");
}

async function demoScenario3_PrizeRedemption(contracts, alice, bob) {
  console.log("🎬 DEMO 3: Prize Redemption");
  console.log("===========================");
  
  console.log("🎁 Demonstrating burn-to-redeem prize system\n");

  // Show available prizes
  console.log("🏆 Available Prizes:");
  console.log("  Prize 0: Premium Subscription - 50 MESSI");
  console.log("  Prize 1: Exclusive Content Access - 25 MESSI\n");

  // Alice redeems premium subscription
  console.log("🔥 Alice's Prize Redemption:");
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("50")], {
    account: alice.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([0], {
    account: alice.account.address
  });

  const aliceBalanceAfterRedemption = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  console.log(`  Alice redeemed: Premium Subscription`);
  console.log(`  Cost: 50 MESSI tokens (burned)`);
  console.log(`  Alice remaining: ${formatEther(aliceBalanceAfterRedemption)} MESSI\n`);

  // Bob redeems exclusive content
  console.log("🔥 Bob's Prize Redemption:");
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("25")], {
    account: bob.account.address
  });
  await contracts.prizeRedemption.write.redeemPrize([1], {
    account: bob.account.address
  });

  const bobBalanceAfterRedemption = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  console.log(`  Bob redeemed: Exclusive Content Access`);
  console.log(`  Cost: 25 MESSI tokens (burned)`);
  console.log(`  Bob remaining: ${formatEther(bobBalanceAfterRedemption)} MESSI\n`);

  // Show redemption statistics
  const totalBurned = await contracts.prizeRedemption.read.getTotalFBTBurned();
  const totalRedemptions = await contracts.prizeRedemption.read.totalRedemptions();

  console.log("📊 Redemption Statistics:");
  console.log(`  Total MESSI Burned: ${formatEther(totalBurned)} MESSI`);
  console.log(`  Total Redemptions: ${totalRedemptions}`);
  console.log(`  Deflationary Effect: Token supply reduced\n`);

  console.log("✅ DEMO 3 COMPLETED: Prize System Working!\n");
}

async function demoScenario4_DEXTrading(contracts, alice, bob) {
  console.log("🎬 DEMO 4: DEX Trading");
  console.log("======================");
  
  console.log("💱 Demonstrating decentralized exchange functionality\n");

  const deployer = (await hre.viem.getWalletClients())[0];

  // Setup DEX liquidity
  console.log("💧 Setting Up DEX Liquidity:");
  
  // Create the trading pair first
  await contracts.factory.write.createPair([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address
  ]);
  
  // Add initial liquidity
  await contracts.fbtToken.write.mint([deployer.account.address, parseEther("1000"), "dex_liquidity"], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.mint([deployer.account.address, parseEther("100")]);

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

  console.log("  Added: 1000 MESSI + 100 CHZ liquidity");
  console.log("  Exchange Rate: 1 CHZ = 10 MESSI\n");

  // Alice trades CHZ for MESSI
  console.log("📈 Alice's Trading Activity:");
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("20")]);
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("10")], {
    account: alice.account.address
  });

  const aliceBalanceBefore = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("10"),
    parseEther("80"), // min MESSI out
    [contracts.mockWCHZ.address, contracts.fbtToken.address],
    alice.account.address,
    BigInt(deadline)
  ], { account: alice.account.address });

  const aliceBalanceAfter = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const aliceGain = aliceBalanceAfter - aliceBalanceBefore;

  console.log(`  Alice traded: 10 CHZ → ${formatEther(aliceGain)} MESSI`);
  console.log(`  Alice's strategy: Accumulate more fan tokens\n`);

  // Bob trades MESSI for CHZ (give him more tokens first since he used some for staking/prizes)
  console.log("📉 Bob's Trading Activity:");
  await contracts.fbtToken.write.mint([bob.account.address, parseEther("100"), "trading_balance"], {
    account: deployer.account.address
  });
  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("100")], {
    account: bob.account.address
  });

  const bobCHZBefore = await contracts.mockWCHZ.read.balanceOf([bob.account.address]);
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("100"),
    parseEther("8"), // min CHZ out
    [contracts.fbtToken.address, contracts.mockWCHZ.address],
    bob.account.address,
    BigInt(deadline)
  ], { account: bob.account.address });

  const bobCHZAfter = await contracts.mockWCHZ.read.balanceOf([bob.account.address]);
  const bobGain = bobCHZAfter - bobCHZBefore;

  console.log(`  Bob traded: 100 MESSI → ${formatEther(bobGain)} CHZ`);
  console.log(`  Bob's strategy: Take some profits\n`);

  // Show DEX statistics
  const pairAddress = await contracts.factory.read.getPair([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address
  ]);
  const pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);
  const reserves = await pair.read.getReserves();

  console.log("📊 DEX Trading Results:");
  console.log(`  Current MESSI Reserve: ${formatEther(reserves[0])} MESSI`);
  console.log(`  Current CHZ Reserve: ${formatEther(reserves[1])} CHZ`);
  console.log(`  Trading Volume: Active and healthy`);
  console.log(`  Price Discovery: Market-driven pricing\n`);

  console.log("✅ DEMO 4 COMPLETED: DEX Trading Functional!\n");
}

async function deployBasicSystem() {
  const [deployer] = await hre.viem.getWalletClients();
  
  console.log("🚀 Deploying Basic Demo System...");
  
  // Deploy mock tokens
  const mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
  const mockCAP20 = await hre.viem.deployContract("MockCAP20", []);
  
  // Deploy DEX
  const factory = await hre.viem.deployContract("UniswapV2Factory", [
    deployer.account.address,
    mockWCHZ.address
  ]);
  const router = await hre.viem.deployContract("UniswapV2Router02", [
    factory.address
  ]);
  
  // Deploy FBT Token
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    "Demo Fan Token",
    "DEMO",
    "Demo Celebrity",
    "entertainment",
    "Demo token for showcase",
    deployer.account.address
  ]);
  
  // Deploy vault system
  const stakingVault = await hre.viem.deployContract("FBTStakingVault", [
    fbtToken.address,
    deployer.account.address
  ]);
  const prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
    fbtToken.address,
    deployer.account.address
  ]);
  
  // Configure permissions
  await fbtToken.write.addAuthorizedMinter([stakingVault.address], {
    account: deployer.account.address
  });
  await fbtToken.write.addAuthorizedBurner([prizeRedemption.address], {
    account: deployer.account.address
  });
  
  // Create staking pools
  const pools = [
    { name: "Monthly Lock", duration: 30 * 24 * 60 * 60, apy: 500 },
    { name: "Quarterly Lock", duration: 90 * 24 * 60 * 60, apy: 1200 },
    { name: "Semi-Annual Lock", duration: 180 * 24 * 60 * 60, apy: 2000 },
    { name: "Annual Lock", duration: 365 * 24 * 60 * 60, apy: 3000 }
  ];
  
  for (const pool of pools) {
    await stakingVault.write.createPool([pool.name, pool.duration, pool.apy], {
      account: deployer.account.address
    });
  }
  
  // Create prizes
  await prizeRedemption.write.createPrize([
    "Premium Subscription",
    "1-year premium platform subscription",
    parseEther("50"),
    0, // unlimited
    "https://demo.com/premium.jpg",
    "Subscription"
  ], { account: deployer.account.address });
  
  await prizeRedemption.write.createPrize([
    "Exclusive Content Access",
    "Access to exclusive behind-the-scenes content",
    parseEther("25"),
    0, // unlimited
    "https://demo.com/exclusive.jpg",
    "Content"
  ], { account: deployer.account.address });
  
  console.log("✅ Basic Demo System Deployed!\n");
  
  return {
    mockWCHZ,
    mockCAP20,
    factory,
    router,
    fbtToken,
    stakingVault,
    prizeRedemption
  };
}

// Execute if run directly
if (require.main === module) {
  runSimpleDemoScenarios()
    .then(() => {
      console.log("\n🎬 ALL DEMO SCENARIOS COMPLETED SUCCESSFULLY!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Demo scenarios failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runSimpleDemoScenarios };