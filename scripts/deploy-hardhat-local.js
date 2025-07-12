const hre = require("hardhat");
const { deployCompleteSystem } = require('./deploy-system');

async function main() {
  console.log("🚀 Starting Complete System Deployment on Local Hardhat Node");
  console.log("=============================================================\n");
  
  // Verify we're connected to the right network
  const network = hre.network.name;
  console.log(`📡 Connected to network: ${network}`);
  
  if (network !== 'hardhat' && network !== 'localhost') {
    console.warn(`⚠️  WARNING: Expected 'hardhat' or 'localhost' network, but got '${network}'`);
    console.warn(`⚠️  Make sure your hardhat node is running and configured correctly`);
  }
  
  // Get network info
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  console.log(`🔗 Chain ID: ${chainId}`);
  
  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  console.log(`👤 Deployer address: ${deployer.account.address}`);
  
  // Check initial balance
  const initialBalance = await publicClient.getBalance({
    address: deployer.account.address
  });
  console.log(`💰 Initial balance: ${(initialBalance / BigInt(1e18)).toString()} CHZ\n`);
  
  if (initialBalance < BigInt(1e18)) {
    console.error("❌ ERROR: Insufficient balance for deployment");
    console.error("💡 Make sure your hardhat node has funded accounts");
    process.exit(1);
  }
  
  console.log("🏗️ Starting deployment process...\n");
  
  try {
    // Deploy complete system with hardhat-optimized configuration
    const result = await deployCompleteSystem({
      network: 'hardhat',
      entityType: 'entertainment', // Use entertainment entity type for local testing
      skipInitialSetup: false,     // Include initial setup for complete local testing
      skipLiquidityMinting: false  // Include liquidity minting for DEX testing
    });
    
    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("====================================\n");
    
    // Display important contract addresses for easy copy-paste
    console.log("📋 CONTRACT ADDRESSES (copy these for your frontend/testing):");
    console.log("-------------------------------------------------------------");
    console.log(`FBTToken:           ${result.deploymentInfo.contracts.FBTToken}`);
    console.log(`FBTStakingVault:    ${result.deploymentInfo.contracts.FBTStakingVault}`);
    console.log(`PrizeRedemption:    ${result.deploymentInfo.contracts.PrizeRedemption}`);
    console.log(`UniswapV2Factory:   ${result.deploymentInfo.contracts.UniswapV2Factory}`);
    console.log(`UniswapV2Router02:  ${result.deploymentInfo.contracts.UniswapV2Router02}`);
    console.log(`MockWCHZ:           ${result.deploymentInfo.contracts.MockWCHZ}`);
    console.log(`MockPSG:            ${result.deploymentInfo.contracts.MockPSG}`);
    console.log(`MockFCB:            ${result.deploymentInfo.contracts.MockFCB}`);
    console.log(`MockOG:             ${result.deploymentInfo.contracts.MockOG}`);
    console.log(`MockUFC:            ${result.deploymentInfo.contracts.MockUFC}`);
    if (result.deploymentInfo.contracts.CAP20_WCHZ_Pair) {
      console.log(`CAP20-WCHZ Pair:    ${result.deploymentInfo.contracts.CAP20_WCHZ_Pair}`);
    }
    if (result.deploymentInfo.contracts.FBT_WCHZ_Pair) {
      console.log(`FBT-WCHZ Pair:      ${result.deploymentInfo.contracts.FBT_WCHZ_Pair}`);
    }
    
    console.log("\n🚀 QUICK START GUIDE:");
    console.log("=====================");
    console.log("1. 🪙 FBT tokens have been minted to your deployer account");
    console.log("2. 🏦 Staking pools are configured (30 days, 90 days, 1 year)");
    console.log("3. 🎁 Sample prizes are available for redemption");
    console.log("4. 🔄 DEX pairs are created and ready for trading");
    console.log("5. 💧 Liquidity tokens are minted for DEX testing");
    
    console.log("\n💡 TEST SCENARIOS:");
    console.log("==================");
    console.log("• Test FBT token transfers and approvals");
    console.log("• Add liquidity to DEX pairs using the Router");
    console.log("• Stake FBT tokens in different pools");
    console.log("• Redeem prizes using accumulated FBT");
    console.log("• Trade tokens on the DEX");
    
    console.log("\n🔧 USEFUL COMMANDS:");
    console.log("===================");
    console.log("• Run interactive scenarios: npx hardhat run scripts/interactive-scenarios.js");
    console.log("• Run manual tests: npx hardhat run scripts/manual-tests.js");
    console.log("• Run quick tests: npx hardhat run scripts/quick-test.js");
    
    // Final balance check
    const finalBalance = await publicClient.getBalance({
      address: deployer.account.address
    });
    const deploymentCost = initialBalance - finalBalance;
    console.log(`\n💸 Deployment cost: ${(deploymentCost / BigInt(1e18)).toString()} CHZ`);
    console.log(`💰 Remaining balance: ${(finalBalance / BigInt(1e18)).toString()} CHZ`);
    
    return result;
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("=====================");
    console.error("Error details:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.error("\n💡 TROUBLESHOOTING:");
      console.error("• Make sure your hardhat node is running");
      console.error("• Verify accounts are properly funded");
      console.error("• Check hardhat.config.js network configuration");
    } else if (error.message.includes("contract not found")) {
      console.error("\n💡 TROUBLESHOOTING:");
      console.error("• Run 'npx hardhat compile' to compile contracts");
      console.error("• Check that all contract files are present");
    } else if (error.message.includes("network")) {
      console.error("\n💡 TROUBLESHOOTING:");
      console.error("• Make sure hardhat node is running on the correct port");
      console.error("• Check hardhat.config.js network configuration");
      console.error("• Verify you're connecting to the right network");
    }
    
    throw error;
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { main }; 