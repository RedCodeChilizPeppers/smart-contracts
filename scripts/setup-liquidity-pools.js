const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("💧 Setting Up Liquidity Pools for Star Tokens");
    console.log("=".repeat(60));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    // Load deployment data
    const deployment = require('../deployments/5-star-focused-1752395546059.json');
    
    // Get contract instances
    const factory = await viem.getContractAt("UniswapV2Factory", deployment.coreContracts.factory);
    const router = await viem.getContractAt("UniswapV2Router02", deployment.coreContracts.router);
    const wchz = await viem.getContractAt("MockWCHZ", deployment.coreContracts.wchz);
    
    console.log("🏭 Using Core Contracts:");
    console.log(`Factory: ${deployment.coreContracts.factory}`);
    console.log(`Router: ${deployment.coreContracts.router}`);
    console.log(`WCHZ: ${deployment.coreContracts.wchz}`);
    console.log();

    // Check WCHZ balance
    const wchzBalance = await wchz.read.balanceOf([account.account.address]);
    console.log(`💰 WCHZ Balance: ${formatEther(wchzBalance)} WCHZ`);
    console.log();

    // Stars with successfully deployed tokens
    const deployedStars = [
        {
            symbol: "MESSI",
            name: "Lionel Messi",
            address: "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1",
            liquidityFBT: parseEther("100000"), // 100k tokens
            liquidityWCHZ: parseEther("1000")   // 1000 WCHZ
        },
        {
            symbol: "SWIFT", 
            name: "Taylor Swift",
            address: "0x8bb943c5e942e685f316cb02204333e53470f233",
            liquidityFBT: parseEther("100000"),
            liquidityWCHZ: parseEther("1000")
        },
        {
            symbol: "COLD",
            name: "Coldplay", 
            address: "0x0e0a27ac7c77cf5b699a0b98016fbe7bfca53503",
            liquidityFBT: parseEther("100000"),
            liquidityWCHZ: parseEther("1000")
        }
    ];

    const results = {
        timestamp: new Date().toISOString(),
        liquidityPools: {}
    };

    for (const star of deployedStars) {
        console.log(`💧 Setting up liquidity for ${star.name} (${star.symbol})...`);
        
        try {
            // Get token contract
            const token = await viem.getContractAt("FBTToken", star.address);
            
            // Check if we need to mint tokens first
            const tokenBalance = await token.read.balanceOf([account.account.address]);
            console.log(`   Current ${star.symbol} balance: ${formatEther(tokenBalance)}`);
            
            // Mint tokens if needed
            if (tokenBalance < star.liquidityFBT) {
                const mintAmount = star.liquidityFBT * 2n; // Mint double for safety
                console.log(`   🪙 Minting ${formatEther(mintAmount)} ${star.symbol} tokens...`);
                await token.write.mint([account.account.address, mintAmount, "liquidity_provision"]);
                console.log(`   ✅ Tokens minted successfully`);
            }

            // Create trading pair
            console.log(`   🏊 Creating ${star.symbol}/WCHZ trading pair...`);
            
            try {
                await factory.write.createPairWithWCHZ([star.address]);
                console.log(`   ✅ Trading pair created`);
            } catch (error) {
                if (error.message.includes("PAIR_EXISTS")) {
                    console.log(`   ✅ Trading pair already exists`);
                } else {
                    throw error;
                }
            }

            // Get pair address
            const pairAddress = await factory.read.getPairWithWCHZ([star.address]);
            console.log(`   📍 Pair address: ${pairAddress}`);

            // Approve tokens for router
            console.log(`   🔓 Approving tokens for router...`);
            await token.write.approve([router.address, star.liquidityFBT]);
            await wchz.write.approve([router.address, star.liquidityWCHZ]);
            console.log(`   ✅ Approvals completed`);

            // Add liquidity
            console.log(`   💦 Adding liquidity: ${formatEther(star.liquidityFBT)} ${star.symbol} + ${formatEther(star.liquidityWCHZ)} WCHZ`);
            
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
            const tx = await router.write.addLiquidity([
                star.address,
                wchz.address,
                star.liquidityFBT,
                star.liquidityWCHZ,
                0n, // min FBT (accept any amount)
                0n, // min WCHZ (accept any amount)
                account.account.address,
                deadline
            ]);

            console.log(`   ✅ Liquidity added successfully!`);
            console.log(`   💱 Trading pair: ${pairAddress}`);
            
            results.liquidityPools[star.symbol] = {
                name: star.name,
                tokenAddress: star.address,
                pairAddress: pairAddress,
                fbtAmount: formatEther(star.liquidityFBT),
                wchzAmount: formatEther(star.liquidityWCHZ),
                success: true
            };

            console.log(`   🎉 ${star.name} liquidity pool setup complete!\n`);

        } catch (error) {
            console.log(`   ❌ Error setting up ${star.symbol}: ${error.message.substring(0, 80)}...\n`);
            
            results.liquidityPools[star.symbol] = {
                name: star.name,
                tokenAddress: star.address,
                error: error.message,
                success: false
            };
        }
    }

    // Final summary
    console.log("📊 LIQUIDITY SETUP SUMMARY:");
    console.log("=".repeat(60));
    
    const successCount = Object.values(results.liquidityPools).filter(p => p.success).length;
    console.log(`✅ Successfully created: ${successCount}/${deployedStars.length} liquidity pools`);
    console.log();

    Object.keys(results.liquidityPools).forEach(symbol => {
        const pool = results.liquidityPools[symbol];
        if (pool.success) {
            console.log(`🌊 ${pool.name} (${symbol}):`);
            console.log(`   Token: ${pool.tokenAddress}`);
            console.log(`   Pair: ${pool.pairAddress}`);
            console.log(`   Liquidity: ${pool.fbtAmount} ${symbol} + ${pool.wchzAmount} WCHZ`);
        } else {
            console.log(`❌ ${pool.name} (${symbol}): Failed`);
        }
    });

    // Check final state
    console.log("\n🔍 Final Verification:");
    const totalPairs = await factory.read.allPairsLength();
    console.log(`Total trading pairs: ${Number(totalPairs)}`);

    // Save results
    const fs = require('fs');
    const filename = `deployments/liquidity-pools-setup-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`📝 Results saved to: ${filename}`);

    console.log("\n🎯 Next Steps:");
    console.log("• Test token swapping on DEX");
    console.log("• Verify liquidity pool balances");
    console.log("• Set up LP token staking (optional)");
    console.log("• Update DEPLOYED_ADDRESSES.md with pair addresses");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Liquidity setup failed:", error);
        process.exit(1);
    });