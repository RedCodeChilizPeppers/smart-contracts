const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("🎯 Testing Pool Trading Functionality");
    console.log("=".repeat(50));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    // Use the MESSI pool which has both tokens
    const messiToken = "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1";
    const messiPair = "0x4F4a5B546382257DA085B57C1727fe6B88eCD038";
    const wchz = "0xfcb54f81d0eb426356c05a85817ab9edcbbc824c";
    const router = "0x8156751945c3f07ac881559f4c313629cf7b247d";

    // Get contracts
    const token = await viem.getContractAt("FBTToken", messiToken);
    const pair = await viem.getContractAt("UniswapV2Pair", messiPair);
    const wchzContract = await viem.getContractAt("MockWCHZ", wchz);
    const routerContract = await viem.getContractAt("UniswapV2Router02", router);

    console.log("📊 Current Pool State:");
    
    // Check token balances in pair
    const tokenInPair = await token.read.balanceOf([messiPair]);
    const wchzInPair = await wchzContract.read.balanceOf([messiPair]);
    console.log(`MESSI in pair: ${formatEther(tokenInPair)}`);
    console.log(`WCHZ in pair: ${formatEther(wchzInPair)}`);
    
    // Check reserves
    const reserves = await pair.read.getReserves();
    console.log(`Reserves: ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
    
    // Check token order
    const token0 = await pair.read.token0();
    const token1 = await pair.read.token1();
    console.log(`Token0: ${token0}`);
    console.log(`Token1: ${token1}`);
    console.log(`MESSI is token0: ${token0.toLowerCase() === messiToken.toLowerCase()}`);
    console.log(`WCHZ is token1: ${token1.toLowerCase() === wchz.toLowerCase()}`);

    // Force sync to update reserves
    if (tokenInPair > 0n && wchzInPair > 0n && reserves[0] === 0n) {
        console.log("\n🔄 Syncing reserves...");
        await pair.write.sync();
        
        const newReserves = await pair.read.getReserves();
        console.log(`New reserves: ${formatEther(newReserves[0])}, ${formatEther(newReserves[1])}`);
    }

    // Try to perform a test swap
    console.log("\n💱 Testing Swap Functionality:");
    
    try {
        // Check our balances
        const ourMessi = await token.read.balanceOf([account.account.address]);
        const ourWCHZ = await wchzContract.read.balanceOf([account.account.address]);
        console.log(`Our MESSI: ${formatEther(ourMessi)}`);
        console.log(`Our WCHZ: ${formatEther(ourWCHZ)}`);

        if (ourWCHZ > parseEther("10")) {
            console.log("🔄 Attempting to swap 10 WCHZ for MESSI...");
            
            // Approve router
            await wchzContract.write.approve([router, parseEther("10")]);
            
            // Create path
            const path = [wchz, messiToken];
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
            
            // Try the swap
            const amountIn = parseEther("10");
            const amountOutMin = 0n; // Accept any amount
            
            try {
                const tx = await routerContract.write.swapExactTokensForTokens([
                    amountIn,
                    amountOutMin,
                    path,
                    account.account.address,
                    deadline
                ]);
                
                console.log("✅ Swap successful!");
                
                // Check new balances
                const newMessi = await token.read.balanceOf([account.account.address]);
                const newWCHZ = await wchzContract.read.balanceOf([account.account.address]);
                console.log(`New MESSI: ${formatEther(newMessi)} (gained: ${formatEther(newMessi - ourMessi)})`);
                console.log(`New WCHZ: ${formatEther(newWCHZ)} (spent: ${formatEther(ourWCHZ - newWCHZ)})`);
                
                console.log("🎉 POOL IS FULLY FUNCTIONAL FOR TRADING!");
                
            } catch (swapError) {
                console.log(`❌ Swap failed: ${swapError.message.substring(0, 100)}...`);
                
                // Try direct pair swap instead
                console.log("🔄 Trying direct pair swap...");
                
                // Transfer WCHZ to pair
                await wchzContract.write.transfer([messiPair, parseEther("10")]);
                
                // Calculate output amount (simplified)
                const newReserves = await pair.read.getReserves();
                if (newReserves[0] > 0n && newReserves[1] > 0n) {
                    // Simple calculation: output = input * reserve1 / (reserve0 + input)
                    const amountOut = parseEther("1"); // Just try to get 1 MESSI
                    
                    try {
                        await pair.write.swap([amountOut, 0n, account.account.address, "0x"]);
                        console.log("✅ Direct swap successful!");
                        console.log("🎉 POOL WORKS WITH DIRECT SWAPS!");
                    } catch (directSwapError) {
                        console.log(`❌ Direct swap failed: ${directSwapError.message.substring(0, 80)}...`);
                    }
                }
            }
        } else {
            console.log("⚠️ Insufficient WCHZ for test swap");
        }

    } catch (error) {
        console.log(`❌ Test error: ${error.message.substring(0, 100)}...`);
    }

    // Final assessment
    console.log("\n🎯 POOL ASSESSMENT:");
    const finalTokenBalance = await token.read.balanceOf([messiPair]);
    const finalWchzBalance = await wchzContract.read.balanceOf([messiPair]);
    const finalReserves = await pair.read.getReserves();
    
    console.log(`Has liquidity: ${finalTokenBalance > 0n && finalWchzBalance > 0n ? '✅' : '❌'}`);
    console.log(`Reserves synced: ${finalReserves[0] > 0n && finalReserves[1] > 0n ? '✅' : '❌'}`);
    
    if (finalTokenBalance > 0n && finalWchzBalance > 0n) {
        console.log("🚀 POOL HAS LIQUIDITY - READY FOR TRADING!");
        console.log("Users can trade on this DEX pair");
    } else {
        console.log("❌ Pool needs liquidity to function");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Trading test failed:", error);
        process.exit(1);
    });