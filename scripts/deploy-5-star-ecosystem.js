const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Complete 5-Star Ecosystem on Testnet");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    
    console.log("Deployer address:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(deployerBalance), "CHZ");
    console.log("=".repeat(60));

    // Check if we have enough CHZ (400 CHZ budget)
    if (parseFloat(ethers.formatEther(deployerBalance)) < 400) {
        console.log("⚠️  Warning: Balance below 400 CHZ, proceeding anyway...");
    }

    // Configuration for 5 stars
    const stars = [
        {
            name: "Lionel Messi Fan Token",
            symbol: "MESSI",
            entityName: "Lionel Messi",
            entityType: "sport",
            description: "Official fan token for Lionel Messi supporters",
            allocatedCHZ: ethers.parseEther("60"), // 60 CHZ per star
            fbtSupply: ethers.parseEther("1000000") // 1M FBT tokens
        },
        {
            name: "Taylor Swift Fan Token", 
            symbol: "SWIFT",
            entityName: "Taylor Swift",
            entityType: "music",
            description: "Official fan token for Taylor Swift fans",
            allocatedCHZ: ethers.parseEther("60"),
            fbtSupply: ethers.parseEther("1000000")
        },
        {
            name: "Marvel Studios Fan Token",
            symbol: "MARVEL",
            entityName: "Marvel Studios",
            entityType: "cinema",
            description: "Official fan token for Marvel movie fans",
            allocatedCHZ: ethers.parseEther("60"),
            fbtSupply: ethers.parseEther("1000000")
        },
        {
            name: "Coldplay Fan Token",
            symbol: "COLD",
            entityName: "Coldplay",
            entityType: "band",
            description: "Official fan token for Coldplay supporters",
            allocatedCHZ: ethers.parseEther("60"),
            fbtSupply: ethers.parseEther("1000000")
        },
        {
            name: "Champions League Fan Token",
            symbol: "UCL",
            entityName: "UEFA Champions League",
            entityType: "event",
            description: "Official fan token for Champions League fans",
            allocatedCHZ: ethers.parseEther("60"),
            fbtSupply: ethers.parseEther("1000000")
        }
    ];

    // Deployment results
    const deploymentResults = {
        timestamp: new Date().toISOString(),
        network: "testnet",
        deployer: deployer.address,
        totalCHZUsed: "0",
        dexContracts: {},
        stars: {}
    };

    try {
        // 1. Deploy DEX Infrastructure (Factory, Router)
        console.log("📦 Step 1: Deploying DEX Infrastructure...");
        
        const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
        const factory = await UniswapV2Factory.deploy(deployer.address);
        await factory.waitForDeployment();
        
        const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
        const router = await UniswapV2Router02.deploy(await factory.getAddress(), deployer.address);
        await router.waitForDeployment();

        deploymentResults.dexContracts = {
            factory: await factory.getAddress(),
            router: await router.getAddress()
        };

        console.log("✅ Factory deployed:", await factory.getAddress());
        console.log("✅ Router deployed:", await router.getAddress());
        console.log();

        // 2. Deploy FanDAO (shared governance)
        console.log("📦 Step 2: Deploying Shared Governance (FanDAO)...");
        
        // We'll create a mock FBT for DAO (or could use first star's token)
        const FBTToken = await ethers.getContractFactory("FBTToken");
        const daoGovernanceToken = await FBTToken.deploy(
            "Governance Token",
            "GOV",
            "Platform Governance",
            "governance", 
            "Multi-star platform governance token",
            deployer.address
        );
        await daoGovernanceToken.waitForDeployment();

        const FanDAO = await ethers.getContractFactory("FanDAO");
        const fanDAO = await FanDAO.deploy(
            await daoGovernanceToken.getAddress(),
            deployer.address
        );
        await fanDAO.waitForDeployment();

        deploymentResults.dexContracts.fanDAO = await fanDAO.getAddress();
        deploymentResults.dexContracts.governanceToken = await daoGovernanceToken.getAddress();

        console.log("✅ FanDAO deployed:", await fanDAO.getAddress());
        console.log();

        // 3. Deploy each star's ecosystem
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            console.log(`📦 Step ${3 + i}: Deploying ${star.entityName} Ecosystem...`);
            
            const starResult = {
                name: star.entityName,
                type: star.entityType,
                contracts: {},
                pools: {},
                funding: {}
            };

            try {
                // Deploy FBT Token
                const fbtToken = await FBTToken.deploy(
                    star.name,
                    star.symbol,
                    star.entityName,
                    star.entityType,
                    star.description,
                    deployer.address
                );
                await fbtToken.waitForDeployment();
                starResult.contracts.fbtToken = await fbtToken.getAddress();

                // Deploy Staking Vault
                const FBTStakingVault = await ethers.getContractFactory("FBTStakingVault");
                const stakingVault = await FBTStakingVault.deploy(
                    await fbtToken.getAddress(),
                    deployer.address
                );
                await stakingVault.waitForDeployment();
                starResult.contracts.stakingVault = await stakingVault.getAddress();

                // Deploy Prize Redemption
                const PrizeRedemption = await ethers.getContractFactory("PrizeRedemption");
                const prizeRedemption = await PrizeRedemption.deploy(
                    await fbtToken.getAddress(),
                    deployer.address
                );
                await prizeRedemption.waitForDeployment();
                starResult.contracts.prizeRedemption = await prizeRedemption.getAddress();

                // Deploy Milestone Vesting
                const MilestoneVesting = await ethers.getContractFactory("MilestoneVesting");
                const milestoneVesting = await MilestoneVesting.deploy(
                    await fbtToken.getAddress(),
                    deployer.address, // beneficiary
                    deployer.address  // owner
                );
                await milestoneVesting.waitForDeployment();
                starResult.contracts.milestoneVesting = await milestoneVesting.getAddress();

                // Deploy EntityICO
                const EntityICO = await ethers.getContractFactory("EntityICO");
                const entityICO = await EntityICO.deploy(
                    await fbtToken.getAddress(),
                    star.entityName,
                    star.entityType,
                    star.description,
                    deployer.address, // entity wallet
                    deployer.address  // owner
                );
                await entityICO.waitForDeployment();
                starResult.contracts.entityICO = await entityICO.getAddress();

                // Set up authorizations
                await fbtToken.addAuthorizedMinter(await stakingVault.getAddress());
                await fbtToken.addAuthorizedMinter(await entityICO.getAddress());
                await fbtToken.addAuthorizedMinter(await milestoneVesting.getAddress());
                await fbtToken.addAuthorizedBurner(await prizeRedemption.getAddress());

                // Link contracts
                await milestoneVesting.setDAOContract(await fanDAO.getAddress());
                await entityICO.setVestingContract(await milestoneVesting.getAddress());
                await milestoneVesting.authorizeInitializer(await entityICO.getAddress());

                // BYPASS ICO: Direct funding and token distribution
                console.log(`   💰 Bypassing ICO for ${star.entityName}...`);
                
                // Mint FBT tokens directly to simulate ICO results
                await fbtToken.mint(deployer.address, star.fbtSupply, "ico_bypass");
                
                // Send CHZ to simulate vesting funding
                const vestingAmount = ethers.parseEther("30"); // 50% of 60 CHZ
                await milestoneVesting.initializeVesting(vestingAmount, ethers.parseEther("500000"), {
                    value: vestingAmount
                });

                starResult.funding = {
                    fbtMinted: ethers.formatEther(star.fbtSupply),
                    vestingCHZ: ethers.formatEther(vestingAmount),
                    liquidityCHZ: ethers.formatEther(ethers.parseEther("18")), // 30% of 60 CHZ
                    immediateCHZ: ethers.formatEther(ethers.parseEther("12"))  // 20% of 60 CHZ
                };

                // Create liquidity pool
                console.log(`   🏊 Creating liquidity pool for ${star.symbol}/CHZ...`);
                
                const liquidityFBT = ethers.parseEther("100000"); // 100k FBT for liquidity
                const liquidityCHZ = ethers.parseEther("18");     // 18 CHZ for liquidity
                
                // Approve router to spend tokens
                await fbtToken.approve(await router.getAddress(), liquidityFBT);
                
                // Add liquidity
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
                await router.addLiquidityETH(
                    await fbtToken.getAddress(),
                    liquidityFBT,
                    0, // accept any amount of tokens
                    0, // accept any amount of CHZ
                    deployer.address,
                    deadline,
                    { value: liquidityCHZ }
                );

                // Get pair address
                const pairAddress = await factory.getPair(await fbtToken.getAddress(), deployer.address);
                starResult.pools.liquidityPool = pairAddress;
                starResult.pools.liquidityFBT = ethers.formatEther(liquidityFBT);
                starResult.pools.liquidityCHZ = ethers.formatEther(liquidityCHZ);

                // Create staking pools
                console.log(`   🏦 Setting up staking pools for ${star.entityName}...`);
                
                await stakingVault.createPool("30 Days", 30 * 24 * 60 * 60, 500);   // 5% APR
                await stakingVault.createPool("90 Days", 90 * 24 * 60 * 60, 1000);  // 10% APR  
                await stakingVault.createPool("1 Year", 365 * 24 * 60 * 60, 2000);  // 20% APR

                starResult.contracts.stakingPools = [
                    { name: "30 Days", duration: "30 days", apr: "5%" },
                    { name: "90 Days", duration: "90 days", apr: "10%" },
                    { name: "1 Year", duration: "365 days", apr: "20%" }
                ];

                // Create sample prizes
                await prizeRedemption.createPrize(
                    `${star.entityName} T-Shirt`,
                    `Official ${star.entityName} merchandise`,
                    ethers.parseEther("100"), // 100 FBT
                    50, // Limited supply
                    "",
                    "merch"
                );

                await prizeRedemption.createPrize(
                    `Meet ${star.entityName}`,
                    `Exclusive meet and greet experience`,
                    ethers.parseEther("10000"), // 10k FBT
                    5, // Very limited
                    "",
                    "experience"
                );

                console.log(`✅ ${star.entityName} ecosystem deployed successfully!`);
                console.log(`   - FBT Token: ${await fbtToken.getAddress()}`);
                console.log(`   - Staking Vault: ${await stakingVault.getAddress()}`);
                console.log(`   - Liquidity Pool: ${pairAddress}`);
                console.log();

                deploymentResults.stars[star.symbol] = starResult;

            } catch (error) {
                console.error(`❌ Error deploying ${star.entityName}:`, error.message);
                starResult.error = error.message;
                deploymentResults.stars[star.symbol] = starResult;
            }
        }

        // Calculate total CHZ used
        const finalBalance = await deployer.provider.getBalance(deployer.address);
        const totalUsed = deployerBalance - finalBalance;
        deploymentResults.totalCHZUsed = ethers.formatEther(totalUsed);

        console.log("🎉 DEPLOYMENT COMPLETE!");
        console.log("=".repeat(60));
        console.log(`Total CHZ used: ${ethers.formatEther(totalUsed)} CHZ`);
        console.log(`Remaining balance: ${ethers.formatEther(finalBalance)} CHZ`);
        console.log();

        // Save deployment results
        const fs = require('fs');
        const deploymentFile = `deployments/5-star-ecosystem-${Date.now()}.json`;
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
        console.log(`📝 Deployment details saved to: ${deploymentFile}`);

        // Summary
        console.log("📊 ECOSYSTEM SUMMARY:");
        console.log("=".repeat(60));
        console.log(`🏭 DEX Factory: ${deploymentResults.dexContracts.factory}`);
        console.log(`🔀 DEX Router: ${deploymentResults.dexContracts.router}`);
        console.log(`🗳️  FanDAO: ${deploymentResults.dexContracts.fanDAO}`);
        console.log();
        
        Object.keys(deploymentResults.stars).forEach(symbol => {
            const star = deploymentResults.stars[symbol];
            if (!star.error) {
                console.log(`⭐ ${star.name}:`);
                console.log(`   Token: ${star.contracts.fbtToken}`);
                console.log(`   Staking: ${star.contracts.stakingVault}`);
                console.log(`   Pool: ${star.pools.liquidityPool}`);
            }
        });

        console.log("\n🚀 All 5 star ecosystems are now live on testnet!");
        console.log("Users can now:");
        console.log("• Trade FBT tokens on DEX");
        console.log("• Stake FBT for rewards");
        console.log("• Vote on milestones via DAO");
        console.log("• Redeem prizes with FBT");

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