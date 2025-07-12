const hre = require("hardhat");
const { parseEther } = require("viem");

async function main() {
  console.log("🚀 Complete System Deployment Script");
  console.log("=====================================\n");

  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  console.log(`📋 Deployer Account: ${deployer.account.address}`);
  
  // Get initial balance
  const publicClient = await hre.viem.getPublicClient();
  const initialBalance = await publicClient.getBalance({
    address: deployer.account.address
  });
  console.log(`💰 Initial Balance: ${(initialBalance / BigInt(1e18)).toString()} CHZ\n`);

  const deployedContracts = {};
  const deploymentInfo = {
    network: hre.network.name,
    chainId: await publicClient.getChainId(),
    deployer: deployer.account.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // ===========================================
    // 1. DEPLOY MOCK TOKENS
    // ===========================================
    console.log("📦 STEP 1: Deploying Mock Tokens");
    console.log("----------------------------------");

    console.log("Deploying MockWCHZ...");
    deployedContracts.mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
    console.log(`✅ MockWCHZ 1 deployed: ${deployedContracts.mockWCHZ.address}`);
    deploymentInfo.contracts.MockWCHZ = {
      address: deployedContracts.mockWCHZ.address,
      name: "Mock WCHZ",
      symbol: "MWCHZ"
    };

    console.log("Deploying MockPSG...");
    deployedContracts.mockPSG = await hre.viem.deployContract("MockPSG", []);
    console.log(`✅ MockPSG deployed: ${deployedContracts.mockPSG.address}`);
    deploymentInfo.contracts.MockPSG = {
      address: deployedContracts.mockPSG.address,
      name: "Mock PSG",
      symbol: "MPSG"
    };

    console.log("Deploying MockFCB...");
    deployedContracts.mockFCB = await hre.viem.deployContract("MockFCB", []);
    console.log(`✅ MockFCB deployed: ${deployedContracts.mockFCB.address}`);
    deploymentInfo.contracts.MockFCB = {
      address: deployedContracts.mockFCB.address,
      name: "Mock FCB",
      symbol: "MFCB"
    };

    console.log("Deploying MockOG...");
    deployedContracts.mockOG = await hre.viem.deployContract("MockOG", []);
    console.log(`✅ MockOG deployed: ${deployedContracts.mockOG.address}`);
    deploymentInfo.contracts.MockOG = {
      address: deployedContracts.mockOG.address,
      name: "Mock OG",
      symbol: "MOG"
    };

    console.log("Deploying MockUFC...");
    deployedContracts.mockUFC = await hre.viem.deployContract("MockUFC", []);
    console.log(`✅ MockUFC deployed: ${deployedContracts.mockUFC.address}`);
    deploymentInfo.contracts.MockUFC = {
      address: deployedContracts.mockUFC.address,
      name: "Mock UFC",
      symbol: "MUFC"
    };

    // ===========================================
    // 2. DEPLOY DEX SYSTEM (UNISWAP V2)
    // ===========================================
    console.log("\n🏪 STEP 2: Deploying DEX System (Uniswap V2)");
    console.log("----------------------------------------------");

    console.log("Deploying UniswapV2Factory...");
    deployedContracts.factory = await hre.viem.deployContract("UniswapV2Factory", [
      deployer.account.address, // feeToSetter
      deployedContracts.mockWCHZ.address // WCHZ address
    ]);
    console.log(`✅ UniswapV2Factory deployed: ${deployedContracts.factory.address}`);
    deploymentInfo.contracts.UniswapV2Factory = {
      address: deployedContracts.factory.address,
      feeToSetter: deployer.account.address,
      wchzToken: deployedContracts.mockWCHZ.address
    };

    console.log("Deploying UniswapV2Router02...");
    deployedContracts.router = await hre.viem.deployContract("UniswapV2Router02", [
      deployedContracts.factory.address
    ]);
    console.log(`✅ UniswapV2Router02 deployed: ${deployedContracts.router.address}`);
    deploymentInfo.contracts.UniswapV2Router02 = {
      address: deployedContracts.router.address,
      factory: deployedContracts.factory.address
    };

    // Create a test pair
    console.log("Creating CAP20-WCHZ pair...");
    await deployedContracts.factory.write.createPair([
      deployedContracts.mockCAP20.address,
      deployedContracts.mockWCHZ.address
    ]);
    const pairAddress = await deployedContracts.factory.read.getPair([
      deployedContracts.mockCAP20.address,
      deployedContracts.mockWCHZ.address
    ]);
    console.log(`✅ CAP20-WCHZ pair created: ${pairAddress}`);
    deploymentInfo.contracts.CAP20_WCHZ_Pair = {
      address: pairAddress,
      token0: deployedContracts.mockCAP20.address,
      token1: deployedContracts.mockWCHZ.address
    };

    // ===========================================
    // 3. DEPLOY FBT TOKEN SYSTEM
    // ===========================================
    console.log("\n🪙 STEP 3: Deploying FBT Token System");
    console.log("-------------------------------------");

    console.log("Deploying FBTToken...");
    deployedContracts.fbtToken = await hre.viem.deployContract("FBTToken", [
      "Platform Fan Base Token", // name
      "PFBT", // symbol
      "Platform Entity", // entityName
      "entertainment", // entityType
      "Official platform fan token for entertainment entities", // entityDescription
      deployer.account.address // owner
    ]);
    console.log(`✅ FBTToken deployed: ${deployedContracts.fbtToken.address}`);
    deploymentInfo.contracts.FBTToken = {
      address: deployedContracts.fbtToken.address,
      name: "Platform Fan Base Token",
      symbol: "PFBT",
      entityName: "Platform Entity",
      entityType: "entertainment"
    };

    // ===========================================
    // 4. DEPLOY VAULT SYSTEM
    // ===========================================
    console.log("\n🏦 STEP 4: Deploying Vault System");
    console.log("----------------------------------");

    console.log("Deploying FBTStakingVault...");
    deployedContracts.stakingVault = await hre.viem.deployContract("FBTStakingVault", [
      deployedContracts.fbtToken.address,
      deployer.account.address // owner
    ]);
    console.log(`✅ FBTStakingVault deployed: ${deployedContracts.stakingVault.address}`);
    deploymentInfo.contracts.FBTStakingVault = {
      address: deployedContracts.stakingVault.address,
      fbtToken: deployedContracts.fbtToken.address
    };

    console.log("Deploying PrizeRedemption...");
    deployedContracts.prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
      deployedContracts.fbtToken.address,
      deployer.account.address // owner
    ]);
    console.log(`✅ PrizeRedemption deployed: ${deployedContracts.prizeRedemption.address}`);
    deploymentInfo.contracts.PrizeRedemption = {
      address: deployedContracts.prizeRedemption.address,
      fbtToken: deployedContracts.fbtToken.address
    };

    // ===========================================
    // 5. CONFIGURE SYSTEM PERMISSIONS
    // ===========================================
    console.log("\n🔧 STEP 5: Configuring System Permissions");
    console.log("------------------------------------------");

    console.log("Adding authorized minters to FBTToken...");
    await deployedContracts.fbtToken.write.addAuthorizedMinter([
      deployedContracts.stakingVault.address
    ], {
      account: deployer.account.address
    });
    console.log(`✅ StakingVault authorized as FBT minter`);

    await deployedContracts.fbtToken.write.addAuthorizedBurner([
      deployedContracts.prizeRedemption.address
    ], {
      account: deployer.account.address
    });
    console.log(`✅ PrizeRedemption authorized as FBT burner`);

    // ===========================================
    // 6. INITIAL SYSTEM SETUP
    // ===========================================
    console.log("\n⚙️ STEP 6: Initial System Setup");
    console.log("--------------------------------");

    // Create default staking pools
    console.log("Creating default staking pools...");
    await deployedContracts.stakingVault.write.createPool([
      "30 Days Lock", // name
      30 * 24 * 60 * 60, // 30 days in seconds
      500 // 5% APY (500 basis points)
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Created 30-day staking pool (5% APY)`);

    await deployedContracts.stakingVault.write.createPool([
      "90 Days Lock", // name
      90 * 24 * 60 * 60, // 90 days in seconds
      1500 // 15% APY (1500 basis points)
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Created 90-day staking pool (15% APY)`);

    await deployedContracts.stakingVault.write.createPool([
      "1 Year Lock", // name
      365 * 24 * 60 * 60, // 1 year in seconds
      3000 // 30% APY (3000 basis points)
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Created 1-year staking pool (30% APY)`);

    // Create sample prizes
    console.log("Creating sample prizes...");
    await deployedContracts.prizeRedemption.write.createPrize([
      "Platform T-Shirt",
      "Official platform branded t-shirt",
      0, // Merchandise category
      parseEther("50"), // 50 FBT cost
      100, // 100 available
      false, // not unlimited
      true // active
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Created Platform T-Shirt prize (50 FBT)`);

    await deployedContracts.prizeRedemption.write.createPrize([
      "VIP Access Pass",
      "VIP access to exclusive platform events",
      1, // Experience category
      parseEther("500"), // 500 FBT cost
      50, // 50 available
      false, // not unlimited
      true // active
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Created VIP Access Pass prize (500 FBT)`);

    // Mint initial tokens for testing
    console.log("Minting initial FBT tokens for testing...");
    await deployedContracts.fbtToken.write.mint([
      deployer.account.address,
      parseEther("10000"),
      "initial_mint"
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Minted 10,000 FBT tokens to deployer`);

    // Mint test tokens for DEX liquidity
    console.log("Minting tokens for DEX liquidity...");
    await deployedContracts.mockCAP20.write.mint([
      deployer.account.address,
      parseEther("1000000")
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Minted 1,000,000 MockCAP20 to deployer`);

    await deployedContracts.mockWCHZ.write.mint([
      deployer.account.address,
      parseEther("1000000")
    ], {
      account: deployer.account.address
    });
    console.log(`✅ Minted 1,000,000 MockWCHZ to deployer`);

    // ===========================================
    // 7. DEPLOYMENT SUMMARY
    // ===========================================
    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("======================");

    const finalBalance = await publicClient.getBalance({
      address: deployer.account.address
    });
    const deploymentCost = initialBalance - finalBalance;

    console.log(`Network: ${deploymentInfo.network} (Chain ID: ${deploymentInfo.chainId})`);
    console.log(`Deployer: ${deploymentInfo.deployer}`);
    console.log(`Deployment Cost: ${(deploymentCost / BigInt(1e18)).toString()} CHZ\n`);

    console.log("📦 DEPLOYED CONTRACTS:");
    console.log("----------------------");
    Object.entries(deploymentInfo.contracts).forEach(([name, info]) => {
      console.log(`${name}: ${info.address}`);
    });

    console.log("\n🔗 CONTRACT INTERACTIONS:");
    console.log("-------------------------");
    console.log(`• FBTToken is connected to StakingVault and PrizeRedemption`);
    console.log(`• UniswapV2Factory is connected to Router with WCHZ integration`);
    console.log(`• CAP20-WCHZ trading pair is available for liquidity`);
    console.log(`• 3 staking pools created (30d/5%, 90d/15%, 1y/30%)`);
    console.log(`• 2 sample prizes created for redemption testing`);

    console.log("\n🎯 NEXT STEPS:");
    console.log("---------------");
    console.log(`• Add liquidity to DEX pairs using UniswapV2Router`);
    console.log(`• Distribute FBT tokens to users for testing`);
    console.log(`• Create additional prizes and staking pools as needed`);
    console.log(`• Set up frontend integration with deployed contracts`);

    // Save deployment information to file
    deploymentInfo.deploymentCost = deploymentCost.toString();
    deploymentInfo.finalBalance = finalBalance.toString();
    
    const fs = require('fs');
    const deploymentFile = `deployment-${deploymentInfo.network}-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

    console.log("\n✅ DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉");

    return deploymentInfo;

  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error("----------------------");
    console.error(error);
    
    // Save partial deployment info on failure
    if (Object.keys(deployedContracts).length > 0) {
      const failureFile = `deployment-failed-${Date.now()}.json`;
      const fs = require('fs');
      fs.writeFileSync(failureFile, JSON.stringify({
        ...deploymentInfo,
        error: error.message,
        partialDeployment: deployedContracts
      }, null, 2));
      console.log(`\n💾 Partial deployment info saved to: ${failureFile}`);
    }
    
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;