const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("🧪 Testing 5-Star Ecosystem");
    console.log("=".repeat(50));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    // Load deployment data
    const deployment = require('../deployments/5-star-focused-1752395546059.json');
    
    console.log("🏭 Core Contracts:");
    console.log(`Factory: ${deployment.coreContracts.factory}`);
    console.log(`Router: ${deployment.coreContracts.router}`);
    console.log(`WCHZ: ${deployment.coreContracts.wchz}`);
    console.log(`FanDAO: ${deployment.coreContracts.fanDAO}`);
    console.log();

    // Test each deployed star
    const deployedStars = Object.keys(deployment.stars).filter(symbol => 
        deployment.stars[symbol].contracts.token && !deployment.stars[symbol].error
    );

    console.log(`🌟 Testing ${deployedStars.length} Successfully Deployed Stars:`);
    
    for (const symbol of deployedStars) {
        const star = deployment.stars[symbol];
        console.log(`\n⭐ ${star.name} (${symbol}):`);
        
        try {
            // Get contract instances
            const token = await viem.getContractAt("FBTToken", star.contracts.token);
            const stakingVault = await viem.getContractAt("FBTStakingVault", star.contracts.staking);
            const prizeRedemption = await viem.getContractAt("PrizeRedemption", star.contracts.prizes);

            // Test token info
            const [name, symbol_contract, totalSupply] = await Promise.all([
                token.read.name(),
                token.read.symbol(),
                token.read.totalSupply()
            ]);

            console.log(`   Token: ${name} (${symbol_contract})`);
            console.log(`   Total Supply: ${formatEther(totalSupply)} tokens`);

            // Test user balance
            const userBalance = await token.read.balanceOf([account.account.address]);
            console.log(`   Your Balance: ${formatEther(userBalance)} ${symbol_contract}`);

            // Test staking vault
            try {
                const poolCount = await stakingVault.read.nextPoolId();
                console.log(`   Staking Pools: ${Number(poolCount)} pools available`);

                // Get pool info for first pool
                if (Number(poolCount) > 0) {
                    const poolInfo = await stakingVault.read.getPoolInfo([0n]);
                    console.log(`   - Pool 0: ${poolInfo.name} (APR: ${Number(poolInfo.rewardRate)/100}%)`);
                }
            } catch (error) {
                console.log(`   Staking: Error reading pools - ${error.message.substring(0, 30)}...`);
            }

            // Test prize system
            try {
                const prizeCount = await prizeRedemption.read.nextPrizeId();
                console.log(`   Prizes: ${Number(prizeCount)} prizes available`);

                // Get first prize info
                if (Number(prizeCount) > 0) {
                    const prize = await prizeRedemption.read.getPrize([0n]);
                    console.log(`   - Prize 0: ${prize.name} (Cost: ${formatEther(prize.cost)} ${symbol_contract})`);
                }
            } catch (error) {
                console.log(`   Prizes: Error reading prizes - ${error.message.substring(0, 30)}...`);
            }

        } catch (error) {
            console.log(`   ❌ Error testing ${symbol}: ${error.message.substring(0, 50)}...`);
        }
    }

    // Test WCHZ and DEX
    console.log(`\n💱 DEX Testing:`);
    try {
        const wchz = await viem.getContractAt("MockWCHZ", deployment.coreContracts.wchz);
        const factory = await viem.getContractAt("UniswapV2Factory", deployment.coreContracts.factory);
        
        const wchzBalance = await wchz.read.balanceOf([account.account.address]);
        console.log(`   WCHZ Balance: ${formatEther(wchzBalance)} WCHZ`);
        
        const pairCount = await factory.read.allPairsLength();
        console.log(`   Trading Pairs: ${Number(pairCount)} pairs created`);
        
    } catch (error) {
        console.log(`   ❌ DEX Error: ${error.message.substring(0, 50)}...`);
    }

    console.log(`\n✅ Ecosystem Test Complete!`);
    console.log("\n🎯 Next Steps:");
    console.log("• Complete staking pool setup for failed deployments");
    console.log("• Add liquidity to trading pairs");
    console.log("• Test token minting and burning");
    console.log("• Test DAO governance functionality");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });