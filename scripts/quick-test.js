const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function quickTest() {
  console.log("⚡ Quick Test Suite - Hardhat Local Network");
  console.log("============================================\n");

  // Deploy minimal system for quick testing
  console.log("🚀 Deploying minimal system...");
  
  const [deployer, alice, bob] = await hre.viem.getWalletClients();
  console.log(`👤 Deployer: ${deployer.account.address}`);
  console.log(`👤 Alice: ${alice.account.address}`);
  console.log(`👤 Bob: ${bob.account.address}\n`);

  // Deploy core contracts
  const contracts = {};
  
  console.log("📦 Deploying contracts...");
  
  // Mock tokens
  contracts.mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
  contracts.mockCAP20 = await hre.viem.deployContract("MockCAP20", []);
  console.log(`✅ Mock tokens deployed`);
  
  // DEX
  contracts.factory = await hre.viem.deployContract("UniswapV2Factory", [
    deployer.account.address,
    contracts.mockWCHZ.address
  ]);
  contracts.router = await hre.viem.deployContract("UniswapV2Router02", [
    contracts.factory.address
  ]);
  console.log(`✅ DEX deployed`);
  
  // FBT Token
  contracts.fbtToken = await hre.viem.deployContract("FBTToken", [
    "Test Fan Token",
    "TFT",
    "Test Entity",
    "test",
    "Test token for quick testing",
    deployer.account.address
  ]);
  console.log(`✅ FBT Token deployed`);
  
  // Vault system
  contracts.stakingVault = await hre.viem.deployContract("FBTStakingVault", [
    contracts.fbtToken.address,
    deployer.account.address
  ]);
  contracts.prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
    contracts.fbtToken.address,
    deployer.account.address
  ]);
  console.log(`✅ Vault system deployed\n`);

  // Quick setup
  console.log("⚙️ Quick setup...");
  
  // Authorize contracts
  await contracts.fbtToken.write.addAuthorizedMinter([contracts.stakingVault.address], {
    account: deployer.account.address
  });
  await contracts.fbtToken.write.addAuthorizedBurner([contracts.prizeRedemption.address], {
    account: deployer.account.address
  });
  
  // Create a simple staking pool
  await contracts.stakingVault.write.createPool([
    "Quick Test Pool",
    30 * 24 * 60 * 60, // 30 days
    1000 // 10% APY
  ], { account: deployer.account.address });
  
  // Create a simple prize
  await contracts.prizeRedemption.write.createPrize([
    "Test Prize",
    "A simple test prize",
    parseEther("100"), // 100 FBT cost
    10, // 10 available
    "https://example.com/prize.jpg", // image URL
    "Merchandise" // category
  ], { account: deployer.account.address });
  
  // Mint tokens
  await contracts.fbtToken.write.mint([alice.account.address, parseEther("1000"), "test"], {
    account: deployer.account.address
  });
  await contracts.fbtToken.write.mint([bob.account.address, parseEther("500"), "test"], {
    account: deployer.account.address
  });
  
  console.log(`✅ Setup complete\n`);

  // Run quick tests
  console.log("🧪 Running Quick Tests:");
  console.log("=======================\n");

  // Test 1: Token Operations
  console.log("1️⃣ Token Operations Test");
  console.log("------------------------");
  
  let aliceBalance = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  let bobBalance = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  
  console.log(`Alice balance: ${formatEther(aliceBalance)} FBT`);
  console.log(`Bob balance: ${formatEther(bobBalance)} FBT`);
  
  // Transfer test
  await contracts.fbtToken.write.transfer([bob.account.address, parseEther("50")], {
    account: alice.account.address
  });
  
  aliceBalance = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  bobBalance = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  
  console.log(`After transfer:`);
  console.log(`Alice balance: ${formatEther(aliceBalance)} FBT`);
  console.log(`Bob balance: ${formatEther(bobBalance)} FBT`);
  console.log(`✅ Token operations working\n`);

  // Test 2: Staking
  console.log("2️⃣ Staking Test");
  console.log("---------------");
  
  await contracts.fbtToken.write.approve([contracts.stakingVault.address, parseEther("200")], {
    account: alice.account.address
  });
  await contracts.stakingVault.write.stake([0, parseEther("200")], {
    account: alice.account.address
  });
  
  const stakeInfo = await contracts.stakingVault.read.getUserStake([alice.account.address, 0]);
  const tvl = await contracts.stakingVault.read.getTotalValueLocked();
  
  console.log(`Alice staked: ${formatEther(stakeInfo.amount)} FBT`);
  console.log(`Total Value Locked: ${formatEther(tvl)} FBT`);
  console.log(`✅ Staking working\n`);

  // Test 3: Prize Redemption
  console.log("3️⃣ Prize Redemption Test");
  console.log("------------------------");
  
  bobBalance = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  console.log(`Bob balance before redemption: ${formatEther(bobBalance)} FBT`);
  
  // Bob needs to approve the contract to spend his tokens
  await contracts.fbtToken.write.approve([contracts.prizeRedemption.address, parseEther("100")], {
    account: bob.account.address
  });
  
  await contracts.prizeRedemption.write.redeemPrize([0], {
    account: bob.account.address
  });
  
  bobBalance = await contracts.fbtToken.read.balanceOf([bob.account.address]);
  const totalBurned = await contracts.prizeRedemption.read.getTotalFBTBurned();
  
  console.log(`Bob balance after redemption: ${formatEther(bobBalance)} FBT`);
  console.log(`Total burned: ${formatEther(totalBurned)} FBT`);
  console.log(`✅ Prize redemption working\n`);

  // Test 4: DEX Basic Setup
  console.log("4️⃣ DEX Setup Test");
  console.log("-----------------");
  
  // Create pair
  await contracts.factory.write.createPair([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address
  ]);
  
  const pairAddress = await contracts.factory.read.getPair([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address
  ]);
  
  console.log(`FBT-WCHZ pair created: ${pairAddress}`);
  
  // Mint tokens for liquidity
  await contracts.fbtToken.write.mint([deployer.account.address, parseEther("1000"), "dex_liquidity"], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.mint([deployer.account.address, parseEther("100")], {
    account: deployer.account.address
  });
  
  // Add liquidity
  await contracts.fbtToken.write.approve([contracts.router.address, parseEther("500")], {
    account: deployer.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("50")], {
    account: deployer.account.address
  });
  
  const deadline = Math.floor(Date.now() / 1000) + 300;
  await contracts.router.write.addLiquidity([
    contracts.fbtToken.address,
    contracts.mockWCHZ.address,
    parseEther("500"),
    parseEther("50"),
    parseEther("450"),
    parseEther("45"),
    deployer.account.address,
    BigInt(deadline)
  ], { account: deployer.account.address });
  
  console.log(`✅ Liquidity added: 500 FBT + 50 WCHZ`);
  console.log(`✅ DEX setup working\n`);

  // Test 5: Trading Test
  console.log("5️⃣ Trading Test");
  console.log("---------------");
  
  // Give Alice some WCHZ
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("20")], {
    account: deployer.account.address
  });
  
  let aliceWCHZ = await contracts.mockWCHZ.read.balanceOf([alice.account.address]);
  aliceBalance = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  
  console.log(`Alice before trade: ${formatEther(aliceBalance)} FBT, ${formatEther(aliceWCHZ)} WCHZ`);
  
  // Swap WCHZ for FBT
  await contracts.mockWCHZ.write.approve([contracts.router.address, parseEther("5")], {
    account: alice.account.address
  });
  
  await contracts.router.write.swapExactTokensForTokens([
    parseEther("5"),
    parseEther("40"), // min FBT out
    [contracts.mockWCHZ.address, contracts.fbtToken.address],
    alice.account.address,
    BigInt(deadline)
  ], { account: alice.account.address });
  
  aliceWCHZ = await contracts.mockWCHZ.read.balanceOf([alice.account.address]);
  aliceBalance = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  
  console.log(`Alice after trade: ${formatEther(aliceBalance)} FBT, ${formatEther(aliceWCHZ)} WCHZ`);
  console.log(`✅ Trading working\n`);

  // Final Summary
  console.log("📊 QUICK TEST SUMMARY");
  console.log("=====================");
  console.log("✅ Token operations (mint, transfer, approve)");
  console.log("✅ Staking vault (stake, TVL tracking)");
  console.log("✅ Prize redemption (burn mechanism)");
  console.log("✅ DEX setup (pair creation, liquidity)");
  console.log("✅ DEX trading (token swaps)");
  
  console.log("\n🎯 Contract Addresses:");
  console.log("======================");
  console.log(`FBTToken: ${contracts.fbtToken.address}`);
  console.log(`StakingVault: ${contracts.stakingVault.address}`);
  console.log(`PrizeRedemption: ${contracts.prizeRedemption.address}`);
  console.log(`UniswapV2Factory: ${contracts.factory.address}`);
  console.log(`UniswapV2Router: ${contracts.router.address}`);
  console.log(`FBT-WCHZ Pair: ${pairAddress}`);
  
  console.log("\n✨ All quick tests passed! System is working correctly!");
  
  return contracts;
}

// Execute if run directly
if (require.main === module) {
  quickTest()
    .then(() => {
      console.log("\n🏁 Quick test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Quick test failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { quickTest };