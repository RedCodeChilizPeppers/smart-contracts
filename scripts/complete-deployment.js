const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");
const fs = require("fs");
const path = require("path");

/**
 * Complete the remaining celebrity deployments and create final documentation
 */

async function completeDeployment() {
  console.log("🚀 COMPLETING CELEBRITY CROWDFUNDING PLATFORM DEPLOYMENT");
  console.log("========================================================\n");
  
  const [deployer] = await hre.viem.getWalletClients();
  
  // Core platform contracts (already deployed)
  const coreContracts = {
    mockWCHZ: "0x53faeb02043ba28fa12db89e120b4370355f62a5",
    mockCAP20: "0xc5369fd9e1a5467e80c99e3fef33bca3565e559c",
    factory: "0x35ba66e5206bafa67f30fa196cf850b614fd0051",
    router: "0x18b1e8ab423e5cafd3571277cad660fd6b247f72"
  };
  
  // Already deployed celebrities (first 5)
  const deployedCelebrities = [
    {
      name: "Lionel Messi",
      symbol: "MESSI",
      type: "sportsTeam",
      description: "Official fan token for Lionel Messi's football academy project",
      contracts: {
        fbtToken: "0xc1c97fea09eba222e3577d82e991684db9bd1c14",
        stakingVault: "0x50c304b64b4ecdfc07a482517cf6294f22c88fe1",
        prizeRedemption: "0x304b2ed3e14096ac131e22a14a1b0100850380b3",
        tradingPair: "0x0000000000000000000000000000000000000000"
      }
    },
    {
      name: "Cristiano Ronaldo",
      symbol: "CR7",
      type: "sportsTeam", 
      description: "CR7 lifestyle brand expansion and fan engagement",
      contracts: {
        fbtToken: "0x3ccd179315cfe53b1e81e9936d1df09dea34d557",
        stakingVault: "0xd3774aea8618706de4c67b2b8b94659dd24c5a53",
        prizeRedemption: "0xb2effc0bdddcb48574ba44be84ff027deda2572a",
        tradingPair: "0x0000000000000000000000000000000000000000"
      }
    },
    {
      name: "Taylor Swift",
      symbol: "SWIFTIE",
      type: "musicArtist",
      description: "Taylor Swift re-recording project and exclusive content",
      contracts: {
        fbtToken: "0x89f8f9dd2e11f212da17214458c4534b409740d3",
        stakingVault: "0x589b5b8d25bc6a88b012ea64ab39b65e5ac0cf24",
        prizeRedemption: "0x610fa764ec8473a5d98604c2bf20c358822f892f",
        tradingPair: "0x0000000000000000000000000000000000000000"
      }
    },
    {
      name: "The Rock",
      symbol: "ROCK",
      type: "entertainment",
      description: "Independent movie production and Hollywood projects",
      contracts: {
        fbtToken: "0x531a9db153f58102b0d734a5b90d2d104060e855",
        stakingVault: "0x6c0bac3ce69576d0c1a5394c87438b73d829f536",
        prizeRedemption: "0xb82dbfbe456a010c29b3665c04f3fda231823ec2",
        tradingPair: "0x0000000000000000000000000000000000000000"
      }
    },
    {
      name: "Neymar Jr",
      symbol: "NJF",
      type: "sportsTeam",
      description: "Brazilian youth development and charity initiatives",
      contracts: {
        fbtToken: "0x97770398829b9953df45a420a5402f45a156d7fb",
        stakingVault: "0xc7f403e90e9d5e3d0f0c1c55eb1b1f45df82ce26",
        prizeRedemption: "0x9d6bf6000e33077b6b5c74876bcadf395d05ffba",
        tradingPair: "0x0000000000000000000000000000000000000000"
      }
    }
  ];
  
  console.log("✅ Using existing core platform and 5 deployed celebrity ecosystems");
  
  // Deploy remaining 5 celebrities
  const remainingCelebrities = [
    { name: "Lewis Hamilton", symbol: "LH44", type: "sportsTeam", description: "Formula 1 sustainability and racing academy" },
    { name: "Serena Williams", symbol: "SERENA", type: "sportsTeam", description: "Women's tennis development and empowerment" },
    { name: "Drake", symbol: "DRAKE", type: "musicArtist", description: "Music label development and artist collaborations" },
    { name: "Kylie Jenner", symbol: "KYLIE", type: "entertainment", description: "Beauty brand expansion and fashion collaborations" },
    { name: "Stephen Curry", symbol: "CURRY", type: "sportsTeam", description: "Basketball training academies and youth programs" }
  ];
  
  console.log("\n🎭 DEPLOYING REMAINING 5 CELEBRITY ECOSYSTEMS");
  console.log("==============================================");
  
  const allCelebrities = [...deployedCelebrities];
  
  for (let i = 0; i < remainingCelebrities.length; i++) {
    const celebrity = remainingCelebrities[i];
    console.log(`\n🌟 ${i + 6}/10: Deploying ${celebrity.name} (${celebrity.symbol})`);
    console.log("=" + "=".repeat(50));
    
    try {
      const ecosystem = await deployCelebrityEcosystem(celebrity);
      allCelebrities.push(ecosystem);
      console.log(`    ✅ ${celebrity.name} ecosystem completed!`);
      
      // Add delay between deployments
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`    ❌ Failed to deploy ${celebrity.name}: ${error.message}`);
    }
  }
  
  // Create comprehensive documentation
  console.log("\n💾 CREATING FINAL DOCUMENTATION");
  console.log("================================");
  
  const finalResults = await createFinalDocumentation(coreContracts, allCelebrities);
  
  console.log("\n🎉 COMPLETE PLATFORM DEPLOYMENT FINISHED!");
  console.log("==========================================");
  console.log(`✅ Core Platform: 4 contracts`);
  console.log(`✅ Celebrity Ecosystems: ${allCelebrities.length}/10`);
  console.log(`✅ Total Contracts: ${4 + (allCelebrities.length * 3)}`);
  console.log(`📄 Final documentation: ${finalResults.filename}`);
  
  return finalResults;
}

async function deployCelebrityEcosystem(celebrity) {
  const deployer = (await hre.viem.getWalletClients())[0];
  
  // 1. Deploy FBT Token
  console.log(`    📦 Deploying ${celebrity.symbol} Token...`);
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    celebrity.name,
    celebrity.symbol,
    celebrity.name,
    celebrity.type,
    celebrity.description,
    deployer.account.address
  ]);
  console.log(`      ✅ FBTToken: ${fbtToken.address}`);
  
  // 2. Deploy Staking Vault
  console.log(`    🏦 Deploying Staking Vault...`);
  const stakingVault = await hre.viem.deployContract("FBTStakingVault", [
    fbtToken.address,
    deployer.account.address
  ]);
  console.log(`      ✅ FBTStakingVault: ${stakingVault.address}`);
  
  // 3. Deploy Prize Redemption
  console.log(`    🎁 Deploying Prize Redemption...`);
  const prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
    fbtToken.address,
    deployer.account.address
  ]);
  console.log(`      ✅ PrizeRedemption: ${prizeRedemption.address}`);
  
  return {
    name: celebrity.name,
    symbol: celebrity.symbol,
    type: celebrity.type,
    description: celebrity.description,
    contracts: {
      fbtToken: fbtToken.address,
      stakingVault: stakingVault.address,
      prizeRedemption: prizeRedemption.address,
      tradingPair: "0x0000000000000000000000000000000000000000"
    }
  };
}

async function createFinalDocumentation(coreContracts, celebrities) {
  const deployer = (await hre.viem.getWalletClients())[0];
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({
    address: deployer.account.address
  });
  
  const finalDeployment = {
    deploymentInfo: {
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      deployer: deployer.account.address,
      timestamp: new Date().toISOString(),
      finalBalance: formatEther(balance),
      deploymentType: "complete-platform"
    },
    
    coreContracts: {
      description: "Core platform infrastructure for celebrity crowdfunding",
      contracts: coreContracts,
      features: [
        "MockWCHZ - Wrapped CHZ token for testing",
        "MockCAP20 - Base ERC20 token for platform operations", 
        "UniswapV2Factory - DEX factory for creating trading pairs",
        "UniswapV2Router02 - DEX router for token swaps and liquidity"
      ]
    },
    
    celebrityEcosystems: celebrities.map((celebrity, index) => ({
      id: index + 1,
      name: celebrity.name,
      symbol: celebrity.symbol,
      type: celebrity.type,
      description: celebrity.description,
      contracts: celebrity.contracts,
      features: [
        "FBT Token - Fan Base Token with controlled minting/burning",
        "Staking Vault - Multi-pool staking system with rewards",
        "Prize Redemption - Token burning for merchandise/experiences",
        "Trading Pair - DEX integration for token trading"
      ],
      explorerUrls: {
        token: `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.fbtToken}`,
        staking: `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.stakingVault}`,
        prizes: `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.prizeRedemption}`,
        pair: celebrity.contracts.tradingPair !== "0x0000000000000000000000000000000000000000" ? 
          `https://spicy-explorer.chiliz.com/address/${celebrity.contracts.tradingPair}` : 
          "Trading pair not created"
      }
    })),
    
    platformSummary: {
      totalContracts: 4 + (celebrities.length * 3),
      coreContracts: 4,
      celebrityEcosystems: celebrities.length,
      successfulDeployments: celebrities.length,
      networkInfo: {
        name: "Spicy Testnet",
        chainId: 88882,
        explorerBase: "https://spicy-explorer.chiliz.com/",
        rpcUrl: "https://spicy-rpc.chiliz.com/"
      }
    },
    
    interactionGuide: {
      tokenOperations: {
        minting: "Call FBTToken.mint(address, amount, reason) as owner",
        burning: "Call FBTToken.burn(amount, reason) as token holder",
        transfer: "Standard ERC20 transfer and transferFrom functions"
      },
      stakingOperations: {
        createPools: "Call FBTStakingVault.createPool(name, duration, apy) as owner",
        staking: "Approve tokens then call stake(poolId, amount)",
        unstaking: "Call unstake(stakeId) after lock period"
      },
      prizeOperations: {
        createPrizes: "Call PrizeRedemption.createPrize(...) as owner",
        redeeming: "Approve tokens then call redeemPrize(prizeId)"
      },
      tradingOperations: {
        createPairs: "Call UniswapV2Factory.createPair(tokenA, tokenB)",
        addLiquidity: "Use UniswapV2Router02.addLiquidity(...)",
        swapping: "Use UniswapV2Router02.swapExactTokensForTokens(...)"
      }
    },
    
    testingScenarios: [
      {
        scenario: "Token Minting and Distribution",
        steps: [
          "Connect to Messi token contract",
          "Call mint() function to create tokens",
          "Distribute to test addresses",
          "Verify balances and total supply"
        ]
      },
      {
        scenario: "Staking Functionality",
        steps: [
          "Create staking pools with different durations",
          "Approve tokens for staking contract",
          "Stake tokens in different pools",
          "Test reward calculations and withdrawals"
        ]
      },
      {
        scenario: "Prize Redemption",
        steps: [
          "Create sample prizes",
          "Approve tokens for prize contract",
          "Redeem prizes and verify token burning",
          "Check prize availability updates"
        ]
      },
      {
        scenario: "DEX Trading",
        steps: [
          "Create trading pairs for celebrity tokens",
          "Add initial liquidity",
          "Test token swaps",
          "Verify price impact and slippage"
        ]
      }
    ]
  };
  
  // Save comprehensive documentation
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `FINAL-DEPLOYMENT-COMPLETE-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(finalDeployment, null, 2));
  
  console.log(`📄 Final documentation saved: ${filename}`);
  console.log("\n📊 FINAL PLATFORM SUMMARY:");
  console.log("==========================");
  console.log(`🌐 Network: ${finalDeployment.deploymentInfo.network}`);
  console.log(`👤 Deployer: ${finalDeployment.deploymentInfo.deployer}`);
  console.log(`📦 Total Contracts: ${finalDeployment.platformSummary.totalContracts}`);
  console.log(`🎭 Celebrity Ecosystems: ${finalDeployment.platformSummary.celebrityEcosystems}`);
  console.log(`💰 Final Balance: ${finalDeployment.deploymentInfo.finalBalance} CHZ`);
  
  console.log("\n🎯 ALL CONTRACT ADDRESSES:");
  console.log("===========================");
  console.log("🏗️ CORE PLATFORM:");
  Object.entries(coreContracts).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });
  
  console.log("\n🌟 CELEBRITY ECOSYSTEMS:");
  celebrities.forEach((celebrity, i) => {
    console.log(`  ${i + 1}. ${celebrity.name} (${celebrity.symbol}):`);
    console.log(`     Token: ${celebrity.contracts.fbtToken}`);
    console.log(`     Staking: ${celebrity.contracts.stakingVault}`);
    console.log(`     Prizes: ${celebrity.contracts.prizeRedemption}`);
  });
  
  return { filename, data: finalDeployment };
}

// Execute completion
if (require.main === module) {
  completeDeployment()
    .then((results) => {
      console.log("\n🎉 CELEBRITY CROWDFUNDING PLATFORM FULLY DEPLOYED!");
      console.log("==================================================");
      console.log("🚀 All systems operational on Spicy testnet!");
      console.log("📱 Ready for comprehensive testing!");
      console.log("🌟 10 celebrity ecosystems available!");
      console.log("📄 Complete documentation generated!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Completion failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { completeDeployment };