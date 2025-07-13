const hre = require("hardhat");
const { parseEther } = require("viem");

async function main() {
    console.log("🎁 Adding Coldplay Prizes");
    console.log("=".repeat(30));

    const { viem } = hre;
    
    const coldplayPrizes = "0x9623d917e112e77abfe69ff46cdcef341606b88e";

    try {
        const prizeRedemption = await viem.getContractAt("PrizeRedemption", coldplayPrizes);

        console.log("🎸 Creating Coldplay prizes...");
        
        // Prize 1: Coldplay Concert Ticket
        await prizeRedemption.write.createPrize([
            "Coldplay Concert Ticket",
            "VIP ticket to Coldplay concert",
            parseEther("500"), // 500 COLD tokens
            20n, // 20 available
            "",
            "experience"
        ]);
        console.log("✅ Concert ticket prize created");

        // Prize 2: Signed Album
        await prizeRedemption.write.createPrize([
            "Signed Coldplay Album",
            "Official signed album by all band members",
            parseEther("200"), // 200 COLD tokens
            50n, // 50 available
            "",
            "merch"
        ]);
        console.log("✅ Signed album prize created");

        // Prize 3: Meet & Greet
        await prizeRedemption.write.createPrize([
            "Meet Coldplay",
            "Exclusive backstage meet and greet",
            parseEther("10000"), // 10k COLD tokens
            5n, // Very limited
            "",
            "experience"
        ]);
        console.log("✅ Meet & greet prize created");

        // Verify prizes
        const prizeCount = await prizeRedemption.read.nextPrizeId();
        console.log(`\n🎯 Total Coldplay prizes: ${Number(prizeCount)}`);

        for (let i = 0; i < Number(prizeCount); i++) {
            const prize = await prizeRedemption.read.getPrize([BigInt(i)]);
            console.log(`   ${i}: ${prize.name} - ${hre.viem.formatEther(prize.cost)} COLD`);
        }

        console.log("\n🎉 COLDPLAY PRIZES COMPLETE!");
        console.log("🚀 Both ecosystems should now be 100% complete!");

        return true;

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

main()
    .then((success) => {
        if (success) {
            console.log("\n🏆 SUCCESS: COLDPLAY ECOSYSTEM COMPLETED!");
            console.log("🎯 Run verification script to confirm 2 complete ecosystems");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Failed to add prizes:", error);
        process.exit(1);
    });