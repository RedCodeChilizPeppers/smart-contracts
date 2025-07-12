const { deployCompleteSystem } = require('./deploy-system');

async function main() {
  console.log("🚀 Starting Complete System Deployment\n");
  
  const result = await deployCompleteSystem({
    // Use default configuration for current network
    // You can customize these options:
    // entityType: 'sportsTeam', // or 'musicArtist', 'entertainment'
    // skipInitialSetup: false,
    // skipLiquidityMinting: false
  });
  
  console.log("\n🎯 Quick Start Guide:");
  console.log("=====================");
  console.log("1. Test token transfers and approvals");
  console.log("2. Add liquidity to DEX pairs using the Router");
  console.log("3. Stake FBT tokens in the StakingVault");
  console.log("4. Redeem prizes using PrizeRedemption contract");
  console.log("5. Trade tokens on the DEX");
  
  return result;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });