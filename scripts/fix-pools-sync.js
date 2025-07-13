const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("🔧 Fixing and Syncing Pools");
    console.log("=".repeat(40));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    const pools = [
        {
            name: "MESSI",
            token: "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1",
            pair: "0x4F4a5B546382257DA085B57C1727fe6B88eCD038",
            hasTokens: true,
            hasWCHZ: true
        },
        {
            name: "COLD",
            token: "0x0e0a27ac7c77cf5b699a0b98016fbe7bfca53503",
            pair: "0xCaD4C170173BbcF7E2a89e0Ec0b4F65b94578252", 
            hasTokens: true,
            hasWCHZ: false
        }
    ];

    const wchz = await viem.getContractAt("MockWCHZ", "0xfcb54f81d0eb426356c05a85817ab9edcbbc824c");

    for (const pool of pools) {
        console.log(`\n🔧 Fixing ${pool.name} pool...`);
        
        try {
            const pair = await viem.getContractAt("UniswapV2Pair", pool.pair);
            const token = await viem.getContractAt("FBTToken", pool.token);
            
            // Check current state
            const reserves = await pair.read.getReserves();
            const tokenBalance = await token.read.balanceOf([pool.pair]);
            const wchzBalance = await wchz.read.balanceOf([pool.pair]);
            
            console.log(`   Current reserves: ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
            console.log(`   Actual balances: ${formatEther(tokenBalance)} ${pool.name}, ${formatEther(wchzBalance)} WCHZ`);
            
            // Add missing WCHZ for COLD pool
            if (!pool.hasWCHZ && wchzBalance === 0n) {
                const wchzAmount = parseEther("500");
                console.log(`   💰 Adding ${formatEther(wchzAmount)} WCHZ to pool...`);
                await wchz.write.transfer([pool.pair, wchzAmount]);
                console.log(`   ✅ WCHZ transferred`);
            }
            
            // Now sync the pair to update reserves
            console.log(`   🔄 Syncing pair...`);
            await pair.write.sync();
            console.log(`   ✅ Pair synced`);
            
            // Check new reserves
            const newReserves = await pair.read.getReserves();
            console.log(`   📊 New reserves: ${formatEther(newReserves[0])}, ${formatEther(newReserves[1])}`);
            
            // Now try to mint LP tokens
            if (newReserves[0] > 0n && newReserves[1] > 0n) {
                console.log(`   🔨 Minting LP tokens...`);
                try {
                    await pair.write.mint([account.account.address]);
                    
                    const lpBalance = await pair.read.balanceOf([account.account.address]);
                    const totalSupply = await pair.read.totalSupply();
                    
                    console.log(`   🎫 LP tokens minted: ${formatEther(lpBalance)}`);
                    console.log(`   📈 Total LP supply: ${formatEther(totalSupply)}`);
                    console.log(`   🎉 ${pool.name} pool is now FULLY ACTIVE!`);
                    
                } catch (mintError) {
                    console.log(`   ⚠️ LP mint failed: ${mintError.message.substring(0, 60)}...`);
                    console.log(`   📊 But reserves are set, pool should work for swaps`);
                }
            } else {
                console.log(`   ❌ Still no reserves after sync`);
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message.substring(0, 80)}...`);
        }
    }

    // Final verification
    console.log(`\n🎯 FINAL VERIFICATION:`);
    console.log("=".repeat(40));
    
    for (const pool of pools) {
        try {
            const pair = await viem.getContractAt("UniswapV2Pair", pool.pair);
            const reserves = await pair.read.getReserves();
            const k = reserves[0] * reserves[1];
            
            console.log(`${pool.name}: Reserves = ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
            console.log(`${pool.name}: K constant = ${k > 0n ? '✅ ACTIVE' : '❌ INACTIVE'}`);
            
            if (k > 0n) {
                console.log(`${pool.name}: 🚀 READY FOR TRADING!`);
            }
            
        } catch (error) {
            console.log(`${pool.name}: ❌ Error checking`);
        }
        console.log();
    }

    console.log("🎯 TRADING TEST:");
    console.log("If K > 0, users can now:");
    console.log("• Swap tokens on the DEX");
    console.log("• Add/remove liquidity");
    console.log("• Earn trading fees");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Pool fixing failed:", error);
        process.exit(1);
    });