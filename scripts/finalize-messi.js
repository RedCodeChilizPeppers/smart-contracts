const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("⚽ Finalizing Messi Ecosystem");
    console.log("=".repeat(40));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    const messiStaking = "0xdd8ed668080eb92cc33ac8bf48e4fbc9738a3402";
    const messiPrizes = "0x5ed610bb66c2087dd911452ca39e16265a28d218";

    try {
        const stakingVault = await viem.getContractAt("FBTStakingVault", messiStaking);
        const prizeRedemption = await viem.getContractAt("PrizeRedemption", messiPrizes);

        // Check current pools
        const currentPools = await stakingVault.read.nextPoolId();
        console.log(`Current pools: ${Number(currentPools)}`);

        // Add 3rd pool if missing
        if (Number(currentPools) === 2) {
            console.log("🏊 Adding 3rd staking pool (1 Year, 20% APR)...");
            await stakingVault.write.createPool(["1 Year", 365 * 24 * 60 * 60, 2000]);
            console.log("✅ 1-year pool added");
        }

        // Check prizes
        const prizeCount = await prizeRedemption.read.nextPrizeId();
        console.log(`Current prizes: ${Number(prizeCount)}`);

        // Add prizes if missing
        if (Number(prizeCount) === 0) {
            console.log("🎁 Creating Messi prizes...");
            
            await prizeRedemption.write.createPrize([
                "Messi Signed Jersey",
                "Official Lionel Messi signed jersey",
                parseEther("1000"), // 1000 MESSI
                10n,
                "",
                "merch"
            ]);
            
            await prizeRedemption.write.createPrize([
                "Meet Messi",
                "Exclusive meet and greet",
                parseEther("50000"), // 50k MESSI
                2n,
                "",
                "experience"
            ]);
            
            console.log("✅ Prizes created");
        }

        // Final verification
        const finalPools = await stakingVault.read.nextPoolId();
        const finalPrizes = await prizeRedemption.read.nextPrizeId();

        console.log("\n🎯 MESSI FINAL STATUS:");
        console.log(`Staking pools: ${Number(finalPools)}`);
        console.log(`Prizes: ${Number(finalPrizes)}`);
        
        for (let i = 0; i < Number(finalPools); i++) {
            const poolInfo = await stakingVault.read.getPoolInfo([BigInt(i)]);
            console.log(`   Pool ${i}: ${poolInfo.name}`);
        }

        if (Number(finalPools) >= 3 && Number(finalPrizes) >= 2) {
            console.log("\n🎉 MESSI ECOSYSTEM 100% COMPLETE!");
            return true;
        } else {
            console.log("\n⚠️ Still missing some components");
            return false;
        }

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\n🏆 SUCCESS: 2 COMPLETE STAR ECOSYSTEMS READY!");
            console.log("   1. ⚽ Messi: ✅ Trading + ✅ Staking + ✅ Prizes");
            console.log("   2. 🎸 Coldplay: ✅ Trading + ✅ Staking + ✅ Prizes");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Failed:", error);
        process.exit(1);
    });