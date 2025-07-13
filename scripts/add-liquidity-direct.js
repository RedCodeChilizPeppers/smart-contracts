const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("💦 Adding Liquidity to Existing Pools");
    console.log("=".repeat(50));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    // Exact addresses from our deployment
    const pools = [
        {
            name: "MESSI",
            token: "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1",
            pair: "0x4F4a5B546382257DA085B57C1727fe6B88eCD038",
            fbtAmount: parseEther("50000"), // 50k tokens
            wchzAmount: parseEther("500")   // 500 WCHZ
        },
        {
            name: "COLD", 
            token: "0x0e0a27ac7c77cf5b699a0b98016fbe7bfca53503",
            pair: "0xCaD4C170173BbcF7E2a89e0Ec0b4F65b94578252",
            fbtAmount: parseEther("50000"),
            wchzAmount: parseEther("500")
        }
    ];

    const wchz = await viem.getContractAt("MockWCHZ", "0xfcb54f81d0eb426356c05a85817ab9edcbbc824c");
    
    console.log("💰 Initial Balances:");
    const wchzBalance = await wchz.read.balanceOf([account.account.address]);
    console.log(`WCHZ: ${formatEther(wchzBalance)}`);
    console.log();

    const results = [];

    for (const pool of pools) {
        console.log(`💧 Adding liquidity to ${pool.name} pool...`);
        
        try {
            // Get contracts
            const token = await viem.getContractAt("FBTToken", pool.token);
            const pair = await viem.getContractAt("UniswapV2Pair", pool.pair);
            
            // Check current state
            console.log(`   📍 Pool: ${pool.pair}`);
            
            // Check current reserves
            const reserves = await pair.read.getReserves();
            console.log(`   📊 Current reserves: ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
            
            // Check token balances
            const tokenBalance = await token.read.balanceOf([account.account.address]);
            console.log(`   💰 Your ${pool.name}: ${formatEther(tokenBalance)}`);
            
            // Mint more tokens if needed
            if (tokenBalance < pool.fbtAmount) {
                const mintAmount = pool.fbtAmount * 2n;
                console.log(`   🪙 Minting ${formatEther(mintAmount)} ${pool.name} tokens...`);
                await token.write.mint([account.account.address, mintAmount, "liquidity"]);
                console.log(`   ✅ Tokens minted`);
            }

            // If reserves are empty, add initial liquidity
            if (reserves[0] === 0n && reserves[1] === 0n) {
                console.log(`   💦 Adding initial liquidity: ${formatEther(pool.fbtAmount)} ${pool.name} + ${formatEther(pool.wchzAmount)} WCHZ`);
                
                // Transfer tokens to pair contract
                console.log(`   📤 Transferring tokens to pair...`);
                await token.write.transfer([pool.pair, pool.fbtAmount]);
                await wchz.write.transfer([pool.pair, pool.wchzAmount]);
                
                // Call mint to create LP tokens
                console.log(`   🔨 Minting LP tokens...`);
                const tx = await pair.write.mint([account.account.address]);
                console.log(`   ✅ LP tokens minted!`);
                
                // Verify new reserves
                const newReserves = await pair.read.getReserves();
                console.log(`   📊 New reserves: ${formatEther(newReserves[0])}, ${formatEther(newReserves[1])}`);
                
                // Check LP token balance
                const lpBalance = await pair.read.balanceOf([account.account.address]);
                console.log(`   🎫 LP tokens received: ${formatEther(lpBalance)}`);
                
                results.push({
                    name: pool.name,
                    success: true,
                    pairAddress: pool.pair,
                    liquidityAdded: {
                        fbt: formatEther(pool.fbtAmount),
                        wchz: formatEther(pool.wchzAmount)
                    },
                    lpTokens: formatEther(lpBalance)
                });
                
                console.log(`   🎉 ${pool.name} pool is now active for trading!\n`);
                
            } else {
                console.log(`   ✅ Pool already has liquidity\n`);
                results.push({
                    name: pool.name,
                    success: true,
                    pairAddress: pool.pair,
                    note: "Already had liquidity"
                });
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message.substring(0, 100)}...\n`);
            results.push({
                name: pool.name,
                success: false,
                error: error.message
            });
        }
    }

    // Final summary
    console.log("🎯 LIQUIDITY ADDITION SUMMARY:");
    console.log("=".repeat(50));
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Successful: ${successCount}/${pools.length} pools`);
    console.log();

    results.forEach(result => {
        if (result.success) {
            console.log(`🌊 ${result.name}:`);
            console.log(`   Pair: ${result.pairAddress}`);
            if (result.liquidityAdded) {
                console.log(`   Liquidity: ${result.liquidityAdded.fbt} ${result.name} + ${result.liquidityAdded.wchz} WCHZ`);
                console.log(`   LP Tokens: ${result.lpTokens}`);
            } else {
                console.log(`   Status: ${result.note || 'Active'}`);
            }
        } else {
            console.log(`❌ ${result.name}: Failed`);
        }
    });

    // Test trading capability
    console.log("\n🔍 Testing Trading Capability:");
    for (const result of results.filter(r => r.success)) {
        try {
            const pair = await viem.getContractAt("UniswapV2Pair", result.pairAddress);
            const reserves = await pair.read.getReserves();
            const k = reserves[0] * reserves[1];
            console.log(`${result.name}: Reserves = ${formatEther(reserves[0])}, ${formatEther(reserves[1])}, K = ${k > 0n ? '✅' : '❌'}`);
        } catch (error) {
            console.log(`${result.name}: Error checking reserves`);
        }
    }

    console.log("\n🚀 READY FOR TRADING!");
    console.log("Users can now:");
    console.log("• Swap WCHZ for star tokens");
    console.log("• Swap star tokens for WCHZ");
    console.log("• Provide liquidity to earn fees");
    console.log("• Stake tokens for additional rewards");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Liquidity addition failed:", error);
        process.exit(1);
    });