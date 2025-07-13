const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("🔍 Verifying Complete Star Ecosystems");
    console.log("=".repeat(50));

    const { viem } = hre;
    
    const stars = [
        {
            name: "Messi",
            emoji: "⚽",
            token: "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1",
            staking: "0xdd8ed668080eb92cc33ac8bf48e4fbc9738a3402",
            prizes: "0x5ed610bb66c2087dd911452ca39e16265a28d218",
            trading: "0x4F4a5B546382257DA085B57C1727fe6B88eCD038"
        },
        {
            name: "Coldplay",
            emoji: "🎸",
            token: "0x0e0a27ac7c77cf5b699a0b98016fbe7bfca53503",
            staking: "0x6c8e27fb445053dde16b62bce49e083b1a3de902",
            prizes: "0x9623d917e112e77abfe69ff46cdcef341606b88e",
            trading: "0xCaD4C170173BbcF7E2a89e0Ec0b4F65b94578252"
        }
    ];

    const results = [];

    for (const star of stars) {
        console.log(`\n${star.emoji} ${star.name.toUpperCase()} ECOSYSTEM CHECK:`);
        console.log("=".repeat(30));
        
        const result = {
            name: star.name,
            trading: false,
            staking: false,
            prizes: false,
            complete: false
        };

        try {
            // Check trading pair
            const pair = await viem.getContractAt("UniswapV2Pair", star.trading);
            const reserves = await pair.read.getReserves();
            const hasLiquidity = reserves[0] > 0n && reserves[1] > 0n;
            
            console.log(`💱 Trading: ${hasLiquidity ? '✅ ACTIVE' : '❌ NO LIQUIDITY'}`);
            console.log(`   Reserves: ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
            result.trading = hasLiquidity;

            // Check staking pools
            const stakingVault = await viem.getContractAt("FBTStakingVault", star.staking);
            const poolCount = await stakingVault.read.nextPoolId();
            const hasStaking = Number(poolCount) >= 3;
            
            console.log(`🏦 Staking: ${hasStaking ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}`);
            console.log(`   Pools: ${Number(poolCount)}/3`);
            
            for (let i = 0; i < Number(poolCount); i++) {
                try {
                    const poolInfo = await stakingVault.read.getPoolInfo([BigInt(i)]);
                    console.log(`   - Pool ${i}: ${poolInfo.name} (${Number(poolInfo.rewardRate)/100}% APR)`);
                } catch (error) {
                    console.log(`   - Pool ${i}: Error reading`);
                }
            }
            result.staking = hasStaking;

            // Check prizes
            const prizeRedemption = await viem.getContractAt("PrizeRedemption", star.prizes);
            const prizeCount = await prizeRedemption.read.nextPrizeId();
            const hasPrizes = Number(prizeCount) >= 2;
            
            console.log(`🎁 Prizes: ${hasPrizes ? '✅ AVAILABLE' : '⚠️ LIMITED'}`);
            console.log(`   Count: ${Number(prizeCount)}`);
            
            for (let i = 0; i < Math.min(Number(prizeCount), 3); i++) {
                try {
                    const prize = await prizeRedemption.read.getPrize([BigInt(i)]);
                    console.log(`   - ${prize.name}: ${formatEther(prize.cost)} ${star.name.toUpperCase()}`);
                } catch (error) {
                    console.log(`   - Prize ${i}: Error reading`);
                }
            }
            result.prizes = hasPrizes;

            // Overall status
            result.complete = result.trading && result.staking && result.prizes;
            console.log(`\n🎯 ${star.name} Status: ${result.complete ? '✅ COMPLETE ECOSYSTEM' : '⚠️ INCOMPLETE'}`);

        } catch (error) {
            console.log(`❌ Error checking ${star.name}: ${error.message.substring(0, 60)}...`);
        }

        results.push(result);
    }

    // Summary
    console.log("\n📊 PLATFORM SUMMARY:");
    console.log("=".repeat(50));
    
    const completeEcosystems = results.filter(r => r.complete).length;
    const tradingPairs = results.filter(r => r.trading).length;
    const stakingSystems = results.filter(r => r.staking).length;
    
    console.log(`✅ Complete Ecosystems: ${completeEcosystems}/2`);
    console.log(`💱 Active Trading Pairs: ${tradingPairs}/2`);
    console.log(`🏦 Complete Staking: ${stakingSystems}/2`);
    console.log();

    results.forEach(result => {
        const status = result.complete ? '✅ COMPLETE' : '⚠️ INCOMPLETE';
        console.log(`${result.name}: ${status}`);
        if (!result.complete) {
            const missing = [];
            if (!result.trading) missing.push('Trading');
            if (!result.staking) missing.push('Staking');  
            if (!result.prizes) missing.push('Prizes');
            console.log(`   Missing: ${missing.join(', ')}`);
        }
    });

    if (completeEcosystems >= 2) {
        console.log("\n🎉 SUCCESS: PLATFORM HAS 2+ COMPLETE STAR ECOSYSTEMS!");
        console.log("🚀 Your celebrity crowdfunding platform is ready for users!");
    } else {
        console.log("\n⚠️ NEED MORE WORK: Platform needs at least 2 complete ecosystems");
        console.log("🔧 Focus on completing the missing components above");
    }

    return completeEcosystems >= 2;
}

main()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });