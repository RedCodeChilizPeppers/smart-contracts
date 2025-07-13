const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("🚀 Deploying 5-Star Ecosystem (Focused Version)");
    console.log("=".repeat(60));

    const { viem } = hre;
    
    // Get wallet client
    const [account] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();
    
    console.log("Deployer address:", account.account.address);
    const balance = await publicClient.getBalance({ address: account.account.address });
    console.log("Deployer balance:", formatEther(balance), "CHZ");
    console.log("=".repeat(60));

    // Configuration for 5 stars
    const stars = [
        {
            name: "Lionel Messi Fan Token",
            symbol: "MESSI", 
            entityName: "Lionel Messi",
            entityType: "sport",
            description: "Official fan token for Lionel Messi supporters"
        },
        {
            name: "Taylor Swift Fan Token",
            symbol: "SWIFT",
            entityName: "Taylor Swift", 
            entityType: "music",
            description: "Official fan token for Taylor Swift fans"
        },
        {
            name: "Marvel Studios Fan Token",
            symbol: "MARVEL",
            entityName: "Marvel Studios",
            entityType: "cinema", 
            description: "Official fan token for Marvel movie fans"
        },
        {
            name: "Coldplay Fan Token",
            symbol: "COLD",
            entityName: "Coldplay",
            entityType: "band",
            description: "Official fan token for Coldplay supporters"
        },
        {
            name: "Champions League Fan Token", 
            symbol: "UCL",
            entityName: "UEFA Champions League",
            entityType: "event",
            description: "Official fan token for Champions League fans"
        }
    ];

    const deploymentResults = {
        timestamp: new Date().toISOString(),
        network: "spicy",
        deployer: account.account.address,
        coreContracts: {},
        stars: {}
    };

    try {
        // 1. Deploy Core DEX Infrastructure
        console.log("📦 Step 1: Deploying DEX Infrastructure...");
        
        // Deploy MockWCHZ first (needed for factory)
        const wchz = await viem.deployContract("MockWCHZ", []);
        console.log("✅ MockWCHZ deployed:", wchz.address);
        
        const factory = await viem.deployContract("UniswapV2Factory", [account.account.address, wchz.address]);
        console.log("✅ Factory deployed:", factory.address);
        
        const router = await viem.deployContract("UniswapV2Router02", [factory.address]);
        console.log("✅ Router deployed:", router.address);

        deploymentResults.coreContracts.factory = factory.address;
        deploymentResults.coreContracts.router = router.address;
        deploymentResults.coreContracts.wchz = wchz.address;

        // 2. Deploy Shared DAO Token for governance
        console.log("\n📦 Step 2: Deploying Governance Infrastructure...");
        
        const daoToken = await viem.deployContract("FBTToken", [
            "Platform Governance Token",
            "PGOV", 
            "Platform Governance",
            "governance",
            "Multi-star platform governance token",
            account.account.address
        ]);
        console.log("✅ DAO Token deployed:", daoToken.address);

        const fanDAO = await viem.deployContract("FanDAO", [daoToken.address, account.account.address]);
        console.log("✅ FanDAO deployed:", fanDAO.address);

        deploymentResults.coreContracts.daoToken = daoToken.address;
        deploymentResults.coreContracts.fanDAO = fanDAO.address;

        // 3. Deploy each star ecosystem
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            console.log(`\n⭐ Step ${3 + i}: Deploying ${star.entityName} Ecosystem...`);
            
            const starData = {
                name: star.entityName,
                contracts: {},
                liquidity: {},
                staking: {}
            };

            try {
                // Deploy FBT Token
                const fbtToken = await viem.deployContract("FBTToken", [
                    star.name,
                    star.symbol,
                    star.entityName,
                    star.entityType,
                    star.description,
                    account.account.address
                ]);
                starData.contracts.token = fbtToken.address;
                console.log(`   🪙 ${star.symbol} Token: ${fbtToken.address}`);

                // Deploy Staking Vault
                const stakingVault = await viem.deployContract("FBTStakingVault", [
                    fbtToken.address,
                    account.account.address
                ]);
                starData.contracts.staking = stakingVault.address;
                console.log(`   🏦 Staking Vault: ${stakingVault.address}`);

                // Deploy Prize Redemption
                const prizeRedemption = await viem.deployContract("PrizeRedemption", [
                    fbtToken.address,
                    account.account.address
                ]);
                starData.contracts.prizes = prizeRedemption.address;
                console.log(`   🎁 Prize System: ${prizeRedemption.address}`);

                // Set up authorizations
                await fbtToken.write.addAuthorizedMinter([stakingVault.address]);
                await fbtToken.write.addAuthorizedBurner([prizeRedemption.address]);
                console.log(`   ✅ Token permissions configured`);

                // Create staking pools
                await stakingVault.write.createPool(["30 Days", 30 * 24 * 60 * 60, 500]);    // 5% APR
                await stakingVault.write.createPool(["90 Days", 90 * 24 * 60 * 60, 1000]);   // 10% APR
                await stakingVault.write.createPool(["1 Year", 365 * 24 * 60 * 60, 2000]);   // 20% APR
                
                starData.staking.pools = [
                    { name: "30 Days", apr: "5%" },
                    { name: "90 Days", apr: "10%" },
                    { name: "1 Year", apr: "20%" }
                ];
                console.log(`   🏊 Staking pools created (3 pools)`);

                // Mint initial token supply and create liquidity
                const initialSupply = parseEther("1000000"); // 1M tokens
                const liquidityTokens = parseEther("100000"); // 100k for liquidity
                const liquidityWCHZ = parseEther("1000"); // 1000 WCHZ for liquidity

                // Mint tokens
                await fbtToken.write.mint([account.account.address, initialSupply, "initial_supply"]);
                console.log(`   💰 Minted ${formatEther(initialSupply)} ${star.symbol} tokens`);

                // Create trading pair with WCHZ
                try {
                    await factory.write.createPairWithWCHZ([fbtToken.address]);
                    const pairAddress = await factory.read.getPairWithWCHZ([fbtToken.address]);
                    
                    // Approve tokens for router
                    await fbtToken.write.approve([router.address, liquidityTokens]);
                    await wchz.write.approve([router.address, liquidityWCHZ]);
                    
                    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
                    await router.write.addLiquidity([
                        fbtToken.address,
                        wchz.address,
                        liquidityTokens,
                        liquidityWCHZ,
                        0n, // min FBT
                        0n, // min WCHZ
                        account.account.address,
                        deadline
                    ]);

                    starData.liquidity = {
                        pairAddress: pairAddress,
                        fbtAmount: formatEther(liquidityTokens),
                        wchzAmount: formatEther(liquidityWCHZ)
                    };
                    console.log(`   💱 Liquidity pool created: ${pairAddress}`);
                    console.log(`   💧 Added ${formatEther(liquidityTokens)} ${star.symbol} + ${formatEther(liquidityWCHZ)} WCHZ`);
                } catch (error) {
                    console.log(`   ⚠️ Liquidity creation skipped: ${error.message.substring(0, 50)}...`);
                    starData.liquidity = { error: "Failed to create liquidity" };
                }

                // Create sample prizes
                await prizeRedemption.write.createPrize([
                    `${star.entityName} T-Shirt`,
                    `Official ${star.entityName} merchandise`,
                    parseEther("100"), // 100 FBT
                    50n, // Limited supply
                    "",
                    "merch"
                ]);

                await prizeRedemption.write.createPrize([
                    `Meet ${star.entityName}`,
                    `Exclusive meet and greet experience`,
                    parseEther("5000"), // 5k FBT
                    5n, // Very limited
                    "",
                    "experience"
                ]);
                console.log(`   🎁 Sample prizes created`);

                console.log(`✅ ${star.entityName} ecosystem deployed successfully!`);
                deploymentResults.stars[star.symbol] = starData;

            } catch (error) {
                console.error(`❌ Error deploying ${star.entityName}:`, error.message.substring(0, 100));
                starData.error = error.message;
                deploymentResults.stars[star.symbol] = starData;
            }
        }

        // Calculate gas used
        const finalBalance = await publicClient.getBalance({ address: account.account.address });
        const totalUsed = balance - finalBalance;
        deploymentResults.totalCHZUsed = formatEther(totalUsed);

        console.log("\n🎉 DEPLOYMENT COMPLETE!");
        console.log("=".repeat(60));
        console.log(`Total CHZ used: ${formatEther(totalUsed)} CHZ`);
        console.log(`Remaining balance: ${formatEther(finalBalance)} CHZ`);

        // Save deployment
        const fs = require('fs');
        const deploymentFile = `deployments/5-star-focused-${Date.now()}.json`;
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
        console.log(`📝 Deployment saved to: ${deploymentFile}`);

        // Summary
        console.log("\n📊 ECOSYSTEM SUMMARY:");
        console.log("=".repeat(60));
        console.log(`🏭 DEX Factory: ${deploymentResults.coreContracts.factory}`);
        console.log(`🔀 DEX Router: ${deploymentResults.coreContracts.router}`);
        console.log(`🗳️ FanDAO: ${deploymentResults.coreContracts.fanDAO}`);
        console.log();
        
        Object.keys(deploymentResults.stars).forEach(symbol => {
            const star = deploymentResults.stars[symbol];
            if (!star.error) {
                console.log(`⭐ ${star.name} (${symbol}):`);
                console.log(`   Token: ${star.contracts.token}`);
                console.log(`   Staking: ${star.contracts.staking}`);
                if (star.liquidity.pairAddress) {
                    console.log(`   Pool: ${star.liquidity.pairAddress}`);
                }
            }
        });

        console.log("\n🚀 Platform is ready! Users can now:");
        console.log("• Trade star tokens on the DEX");
        console.log("• Stake tokens for yield rewards");
        console.log("• Redeem exclusive prizes");
        console.log("• Participate in governance");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });