const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("💧 Manual Liquidity Pool Setup");
    console.log("=".repeat(50));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    // Contract addresses from deployment
    const contracts = {
        factory: "0x0d1bf679630a640e87291977a46085852e066dde",
        router: "0x8156751945c3f07ac881559f4c313629cf7b247d",
        wchz: "0xfcb54f81d0eb426356c05a85817ab9edcbbc824c",
        stars: {
            MESSI: "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1",
            SWIFT: "0x8bb943c5e942e685f316cb02204333e53470f233", 
            COLD: "0x0e0a27ac7c77cf5b699a0b98016fbe7bfca53503"
        }
    };

    // Get contract instances
    const factory = await viem.getContractAt("UniswapV2Factory", contracts.factory);
    const wchz = await viem.getContractAt("MockWCHZ", contracts.wchz);
    
    console.log("🏭 Core Contracts:");
    console.log(`Factory: ${contracts.factory}`);
    console.log(`WCHZ: ${contracts.wchz}`);
    console.log();

    const results = {
        timestamp: new Date().toISOString(),
        liquidityPools: {}
    };

    // Process each star
    for (const [symbol, tokenAddress] of Object.entries(contracts.stars)) {
        console.log(`💧 Setting up ${symbol} liquidity pool...`);
        
        try {
            // Get token contract
            const token = await viem.getContractAt("FBTToken", tokenAddress);
            
            // Check current balances
            const tokenBalance = await token.read.balanceOf([account.account.address]);
            const wchzBalance = await wchz.read.balanceOf([account.account.address]);
            
            console.log(`   ${symbol} balance: ${formatEther(tokenBalance)}`);
            console.log(`   WCHZ balance: ${formatEther(wchzBalance)}`);
            
            // Mint tokens if needed
            const liquidityAmount = parseEther("100000");
            const wchzAmount = parseEther("1000");
            
            if (tokenBalance < liquidityAmount) {
                console.log(`   🪙 Minting ${formatEther(liquidityAmount)} ${symbol} tokens...`);
                await token.write.mint([account.account.address, liquidityAmount, "liquidity"]);
                console.log(`   ✅ Tokens minted`);
            }

            // Create pair
            console.log(`   🏊 Creating trading pair...`);
            let pairAddress;
            
            try {
                // Try to create pair
                await factory.write.createPairWithWCHZ([tokenAddress]);
                console.log(`   ✅ Pair created`);
            } catch (error) {
                if (error.message.includes("PAIR_EXISTS")) {
                    console.log(`   ✅ Pair already exists`);
                } else {
                    console.log(`   ⚠️ Pair creation failed: ${error.message.substring(0, 50)}`);
                }
            }

            // Get pair address using mapping
            try {
                pairAddress = await factory.read.getPairWithWCHZ([tokenAddress]);
                console.log(`   📍 Pair address: ${pairAddress}`);
                
                if (pairAddress === "0x0000000000000000000000000000000000000000") {
                    throw new Error("Pair address is zero - pair not created properly");
                }
                
                // Get pair contract
                const pair = await viem.getContractAt("UniswapV2Pair", pairAddress);
                
                // Check current reserves
                const reserves = await pair.read.getReserves();
                console.log(`   Current reserves: ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
                
                // If no liquidity, add some manually
                if (reserves[0] === 0n && reserves[1] === 0n) {
                    console.log(`   💦 Adding initial liquidity manually...`);
                    
                    // Transfer tokens to pair
                    await token.write.transfer([pairAddress, liquidityAmount]);
                    await wchz.write.transfer([pairAddress, wchzAmount]);
                    
                    // Mint LP tokens
                    await pair.write.mint([account.account.address]);
                    
                    console.log(`   ✅ Liquidity added: ${formatEther(liquidityAmount)} ${symbol} + ${formatEther(wchzAmount)} WCHZ`);
                } else {
                    console.log(`   ✅ Liquidity already exists`);
                }

                results.liquidityPools[symbol] = {
                    tokenAddress: tokenAddress,
                    pairAddress: pairAddress,
                    fbtAmount: formatEther(liquidityAmount),
                    wchzAmount: formatEther(wchzAmount),
                    success: true
                };

            } catch (error) {
                console.log(`   ❌ Failed to get pair address: ${error.message.substring(0, 60)}`);
                results.liquidityPools[symbol] = {
                    tokenAddress: tokenAddress,
                    error: error.message,
                    success: false
                };
            }

            console.log(`   🎉 ${symbol} setup complete!\n`);

        } catch (error) {
            console.log(`   ❌ Error with ${symbol}: ${error.message.substring(0, 80)}...\n`);
            results.liquidityPools[symbol] = {
                tokenAddress: tokenAddress,
                error: error.message,
                success: false
            };
        }
    }

    // Final verification
    console.log("📊 FINAL SUMMARY:");
    console.log("=".repeat(50));
    
    const totalPairs = await factory.read.allPairsLength();
    console.log(`Total pairs created: ${Number(totalPairs)}`);
    
    const successCount = Object.values(results.liquidityPools).filter(p => p.success).length;
    console.log(`Successful setups: ${successCount}/${Object.keys(contracts.stars).length}`);
    console.log();

    // List successful pools
    Object.keys(results.liquidityPools).forEach(symbol => {
        const pool = results.liquidityPools[symbol];
        if (pool.success) {
            console.log(`✅ ${symbol}:`);
            console.log(`   Token: ${pool.tokenAddress}`);
            console.log(`   Pair: ${pool.pairAddress}`);
            console.log(`   Liquidity: ${pool.fbtAmount} ${symbol} + ${pool.wchzAmount} WCHZ`);
        } else {
            console.log(`❌ ${symbol}: Failed`);
        }
    });

    // Save results
    const fs = require('fs');
    const filename = `deployments/manual-liquidity-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n📝 Results saved to: ${filename}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Manual liquidity setup failed:", error);
        process.exit(1);
    });