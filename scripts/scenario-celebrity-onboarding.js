const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

/**
 * Celebrity Onboarding Scenario
 * 
 * This scenario demonstrates how different types of celebrities
 * can onboard to the platform with different strategies and goals.
 */

async function runCelebrityOnboardingScenario() {
  console.log("🎭 CELEBRITY ONBOARDING SCENARIOS");
  console.log("=================================\n");

  const [deployer, messi, ronaldo, taylorSwift, theRock, neymar] = await hre.viem.getWalletClients();
  
  console.log("🌟 Celebrity Cast:");
  console.log(`  ⚽ Messi (Football): ${messi.account.address}`);
  console.log(`  ⚽ Ronaldo (Football): ${ronaldo.account.address}`);
  console.log(`  🎵 Taylor Swift (Music): ${taylorSwift.account.address}`);
  console.log(`  🎬 The Rock (Movies): ${theRock.account.address}`);
  console.log(`  ⚽ Neymar (Football): ${neymar.account.address}\n`);

  // Deploy platform
  const contracts = await deployPlatformInfrastructure();
  
  // Run different celebrity onboarding strategies
  await onboardingScenario1_MessiAcademy(contracts, messi);
  await onboardingScenario2_RonaldoBrand(contracts, ronaldo);
  await onboardingScenario3_TaylorMusicProject(contracts, taylorSwift);
  await onboardingScenario4_RockMovieProduction(contracts, theRock);
  await onboardingScenario5_NeymarCharity(contracts, neymar);

  console.log("✅ ALL CELEBRITY ONBOARDING SCENARIOS COMPLETED!");
  return contracts;
}

async function onboardingScenario1_MessiAcademy(contracts, messi) {
  console.log("⚽ SCENARIO 1: Messi's Football Academy");
  console.log("======================================");
  
  console.log("🎯 Project: Youth Football Academy in Argentina");
  console.log("💰 Goal: Raise 2000 CHZ for academy construction");
  console.log("📅 Timeline: 6 months with 3 milestones\n");

  // Use platform token for Messi's campaign
  console.log("🪙 Using platform token for Messi's campaign");

  // Configure ICO (deployer configures it for the celebrity)
  const deployer = (await hre.viem.getWalletClients())[0];
  await contracts.entityICO.write.configureICO([
    parseEther("2000"), // 2000 CHZ target
    parseEther("0.1"),  // 0.1 CHZ per token
    parseEther("10"),   // 10 CHZ min contribution  
    parseEther("200"),  // 200 CHZ max per investor
    BigInt(Math.floor(Date.now() / 1000) + 60),
    BigInt(Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)),
    false // KYC not required
  ], { account: deployer.account.address });

  console.log("📋 ICO Configuration:");
  console.log("  Target: 2000 CHZ");
  console.log("  Price: 0.1 CHZ per MESSI");
  console.log("  Max Investment: 200 CHZ");
  console.log("  Duration: 30 days\n");

  // Create milestone roadmap
  const baseTime = Math.floor(Date.now() / 1000);
  
  await contracts.milestoneVesting.write.createMilestone([
    "Land Acquisition & Permits",
    "Secure land and obtain all necessary permits for academy construction",
    0, // ProjectDeliverable
    parseEther("500"),
    parseEther("50"), // FBT reward amount
    BigInt(baseTime + (60 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1000 // minimum vote quorum (10%)
  ], { account: deployer.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Academy Construction",
    "Complete main buildings, training fields, and facilities",
    0, // ProjectDeliverable
    parseEther("700"),
    parseEther("70"), // FBT reward amount
    BigInt(baseTime + (120 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1000 // minimum vote quorum (10%)
  ], { account: messi.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Program Launch",
    "Recruit first 100 students and launch training programs",
    0, // ProjectDeliverable
    parseEther("300"),
    parseEther("30"), // FBT reward amount
    BigInt(baseTime + (180 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1000 // minimum vote quorum (10%)
  ], { account: messi.account.address });

  console.log("🗺️ Milestone Roadmap:");
  console.log("  1. Land & Permits: 500 MESSI (60 days)");
  console.log("  2. Construction: 700 MESSI (120 days)");
  console.log("  3. Program Launch: 300 MESSI (180 days)");
  console.log("  Total Vesting: 1500 MESSI\n");

  console.log("✅ Messi's Academy Project Successfully Configured!\n");
}

async function onboardingScenario2_RonaldoBrand(contracts, ronaldo) {
  console.log("⚽ SCENARIO 2: Ronaldo's Lifestyle Brand");
  console.log("=======================================");
  
  console.log("🎯 Project: CR7 Global Lifestyle Brand Expansion");
  console.log("💰 Goal: Raise 1500 CHZ for brand development");
  console.log("📅 Timeline: 4 months with brand milestones\n");

  console.log("🪙 Using platform token for Ronaldo's campaign");

  // More aggressive ICO strategy
  await contracts.entityICO.write.configureICO([
    parseEther("1500"),
    parseEther("0.05"), // Lower price for broader access
    parseEther("5"),    // 5 CHZ min contribution
    parseEther("100"),  // Lower max investment for inclusivity
    BigInt(Math.floor(Date.now() / 1000) + 60),
    BigInt(Math.floor(Date.now() / 1000) + (21 * 24 * 60 * 60)), // Shorter campaign
    false // KYC not required
  ], { account: ronaldo.account.address });

  console.log("📋 ICO Strategy:");
  console.log("  Target: 1500 CHZ");
  console.log("  Price: 0.05 CHZ per CR7 (affordable)");
  console.log("  Max Investment: 100 CHZ (inclusive)");
  console.log("  Duration: 21 days (fast campaign)\n");

  // Create brand expansion milestones
  const baseTime = Math.floor(Date.now() / 1000);
  
  await contracts.milestoneVesting.write.createMilestone([
    "Product Line Development",
    "Develop new clothing and accessories collections",
    0, // ProjectDeliverable
    parseEther("400"),
    parseEther("40"), // FBT reward amount
    BigInt(baseTime + (45 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1000 // minimum vote quorum (10%)
  ], { account: ronaldo.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Global Market Entry",
    "Launch in 10 new international markets",
    1, // PerformanceMetric
    parseEther("600"),
    parseEther("60"), // FBT reward amount
    BigInt(baseTime + (90 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1500 // minimum vote quorum (15%)
  ], { account: ronaldo.account.address });

  console.log("🗺️ Brand Milestones:");
  console.log("  1. Product Development: 400 CR7 (45 days)");
  console.log("  2. Global Expansion: 600 CR7 (90 days)");
  console.log("  Total Vesting: 1000 CR7\n");

  console.log("✅ Ronaldo's Brand Expansion Successfully Configured!\n");
}

async function onboardingScenario3_TaylorMusicProject(contracts, taylorSwift) {
  console.log("🎵 SCENARIO 3: Taylor Swift's Music Project");
  console.log("==========================================");
  
  console.log("🎯 Project: Re-recording Classic Albums");
  console.log("💰 Goal: Raise 3000 CHZ for production costs");
  console.log("📅 Timeline: 12 months with album releases\n");

  console.log("🪙 Using platform token for Taylor's campaign");

  // Premium strategy for exclusive content
  await contracts.entityICO.write.configureICO([
    parseEther("3000"),
    parseEther("0.25"), // Higher price for exclusive access
    parseEther("25"),   // 25 CHZ min contribution
    parseEther("500"),  // Higher max for dedicated fans
    BigInt(Math.floor(Date.now() / 1000) + 60),
    BigInt(Math.floor(Date.now() / 1000) + (45 * 24 * 60 * 60)), // Longer campaign
    false // KYC not required
  ], { account: taylorSwift.account.address });

  console.log("📋 Music Project ICO:");
  console.log("  Target: 3000 CHZ");
  console.log("  Price: 0.25 CHZ per SWIFTIE (premium)");
  console.log("  Max Investment: 500 CHZ (dedicated fans)");
  console.log("  Duration: 45 days (build anticipation)\n");

  // Create album milestone releases
  const baseTime = Math.floor(Date.now() / 1000);
  
  await contracts.milestoneVesting.write.createMilestone([
    "Fearless (Taylor's Version)",
    "Complete re-recording and release of Fearless album",
    0, // ProjectDeliverable
    parseEther("800"),
    parseEther("80"), // FBT reward amount
    BigInt(baseTime + (90 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    2000 // minimum vote quorum (20%)
  ], { account: taylorSwift.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Red (Taylor's Version)",
    "Complete re-recording and release of Red album",
    0, // ProjectDeliverable
    parseEther("900"),
    parseEther("90"), // FBT reward amount
    BigInt(baseTime + (180 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    2000 // minimum vote quorum (20%)
  ], { account: taylorSwift.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Exclusive Content Drop",
    "Release exclusive behind-the-scenes content and unreleased tracks",
    0, // ProjectDeliverable
    parseEther("500"),
    parseEther("50"), // FBT reward amount
    BigInt(baseTime + (270 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1500 // minimum vote quorum (15%)
  ], { account: taylorSwift.account.address });

  console.log("🗺️ Album Release Milestones:");
  console.log("  1. Fearless Re-recording: 800 SWIFTIE (90 days)");
  console.log("  2. Red Re-recording: 900 SWIFTIE (180 days)");
  console.log("  3. Exclusive Content: 500 SWIFTIE (270 days)");
  console.log("  Total Vesting: 2200 SWIFTIE\n");

  console.log("✅ Taylor's Music Project Successfully Configured!\n");
}

async function onboardingScenario4_RockMovieProduction(contracts, theRock) {
  console.log("🎬 SCENARIO 4: The Rock's Movie Production");
  console.log("=========================================");
  
  console.log("🎯 Project: Independent Action Movie Production");
  console.log("💰 Goal: Raise 5000 CHZ for film production");
  console.log("📅 Timeline: 18 months from pre-production to release\n");

  console.log("🪙 Using platform token for The Rock's campaign");

  // Large-scale production strategy
  await contracts.entityICO.write.configureICO([
    parseEther("5000"),
    parseEther("0.2"),  // Moderate price
    parseEther("20"),   // 20 CHZ min contribution
    parseEther("1000"), // High max for serious investors
    BigInt(Math.floor(Date.now() / 1000) + 60),
    BigInt(Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60)), // Longer raise period
    false // KYC not required
  ], { account: theRock.account.address });

  console.log("📋 Film Production ICO:");
  console.log("  Target: 5000 CHZ");
  console.log("  Price: 0.2 CHZ per ROCK");
  console.log("  Max Investment: 1000 CHZ (serious investors)");
  console.log("  Duration: 60 days (professional timeline)\n");

  // Create film production milestones
  const baseTime = Math.floor(Date.now() / 1000);
  
  await contracts.milestoneVesting.write.createMilestone([
    "Pre-Production Complete",
    "Finalize script, cast, and crew. Complete location scouting.",
    0, // ProjectDeliverable
    parseEther("1000"),
    parseEther("100"), // FBT reward amount
    BigInt(baseTime + (120 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    2500 // minimum vote quorum (25%)
  ], { account: theRock.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Principal Photography Wrap",
    "Complete all principal photography and begin post-production",
    0, // ProjectDeliverable
    parseEther("1500"),
    parseEther("150"), // FBT reward amount
    BigInt(baseTime + (240 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    2500 // minimum vote quorum (25%)
  ], { account: theRock.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Post-Production Complete",
    "Complete editing, VFX, sound design, and color grading",
    0, // ProjectDeliverable
    parseEther("1200"),
    parseEther("120"), // FBT reward amount
    BigInt(baseTime + (360 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    2000 // minimum vote quorum (20%)
  ], { account: theRock.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Theatrical Release",
    "Secure distribution and complete theatrical release",
    1, // PerformanceMetric
    parseEther("800"),
    parseEther("80"), // FBT reward amount
    BigInt(baseTime + (450 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    3000 // minimum vote quorum (30%)
  ], { account: theRock.account.address });

  console.log("🗺️ Film Production Milestones:");
  console.log("  1. Pre-Production: 1000 ROCK (120 days)");
  console.log("  2. Principal Photography: 1500 ROCK (240 days)");
  console.log("  3. Post-Production: 1200 ROCK (360 days)");
  console.log("  4. Theatrical Release: 800 ROCK (450 days)");
  console.log("  Total Vesting: 4500 ROCK\n");

  console.log("✅ The Rock's Film Production Successfully Configured!\n");
}

async function onboardingScenario5_NeymarCharity(contracts, neymar) {
  console.log("⚽ SCENARIO 5: Neymar's Charity Initiative");
  console.log("=========================================");
  
  console.log("🎯 Project: Brazilian Youth Sports Programs");
  console.log("💰 Goal: Raise 1000 CHZ for charity programs");
  console.log("📅 Timeline: 6 months with community impact milestones\n");

  console.log("🪙 Using platform token for Neymar's campaign");

  // Charity-focused strategy (lower prices, community access)
  await contracts.entityICO.write.configureICO([
    parseEther("1000"),
    parseEther("0.02"), // Very low price for accessibility
    parseEther("1"),    // 1 CHZ min contribution for accessibility
    parseEther("50"),   // Low max to allow broader participation
    BigInt(Math.floor(Date.now() / 1000) + 60),
    BigInt(Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)), // Longer campaign for awareness
    false // KYC not required
  ], { account: neymar.account.address });

  console.log("📋 Charity ICO Strategy:");
  console.log("  Target: 1000 CHZ");
  console.log("  Price: 0.02 CHZ per NJF (accessible)");
  console.log("  Max Investment: 50 CHZ (community focused)");
  console.log("  Duration: 90 days (awareness building)\n");

  // Create charity impact milestones
  const baseTime = Math.floor(Date.now() / 1000);
  
  await contracts.milestoneVesting.write.createMilestone([
    "Program Setup",
    "Establish 5 community centers in underserved areas",
    0, // ProjectDeliverable
    parseEther("200"),
    parseEther("20"), // FBT reward amount
    BigInt(baseTime + (60 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1000 // minimum vote quorum (10%)
  ], { account: neymar.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Youth Enrollment",
    "Enroll 500 youth in sports and education programs",
    1, // PerformanceMetric
    parseEther("300"),
    parseEther("30"), // FBT reward amount
    BigInt(baseTime + (120 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    1500 // minimum vote quorum (15%)
  ], { account: neymar.account.address });

  await contracts.milestoneVesting.write.createMilestone([
    "Impact Assessment",
    "Complete 6-month impact report showing community benefits",
    1, // PerformanceMetric
    parseEther("150"),
    parseEther("15"), // FBT reward amount
    BigInt(baseTime + (180 * 24 * 60 * 60)),
    false, // requires oracle
    "0x0000000000000000000000000000000000000000", // oracle verifier (none)
    2000 // minimum vote quorum (20%)
  ], { account: neymar.account.address });

  console.log("🗺️ Charity Impact Milestones:");
  console.log("  1. Program Setup: 200 NJF (60 days)");
  console.log("  2. Youth Enrollment: 300 NJF (120 days)");
  console.log("  3. Impact Assessment: 150 NJF (180 days)");
  console.log("  Total Vesting: 650 NJF\n");

  console.log("✅ Neymar's Charity Initiative Successfully Configured!\n");
}

// Helper functions
async function deployPlatformInfrastructure() {
  const [deployer] = await hre.viem.getWalletClients();
  
  console.log("🚀 Deploying Platform Infrastructure...");
  
  // Deploy core contracts (simplified for demo)
  const mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
  const factory = await hre.viem.deployContract("UniswapV2Factory", [
    deployer.account.address,
    mockWCHZ.address
  ]);
  const router = await hre.viem.deployContract("UniswapV2Router02", [factory.address]);
  
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    "Platform Token",
    "PLT",
    "Platform",
    "platform",
    "Base platform token",
    deployer.account.address
  ]);
  
  const entityICO = await hre.viem.deployContract("EntityICO", [
    fbtToken.address,
    "Platform Entity",
    "entertainment", 
    "Celebrity onboarding platform",
    deployer.account.address,
    deployer.account.address
  ]);
  
  const milestoneVesting = await hre.viem.deployContract("MilestoneVesting", [
    fbtToken.address,
    deployer.account.address, // beneficiary
    deployer.account.address  // owner
  ]);
  
  const fanDAO = await hre.viem.deployContract("FanDAO", [
    fbtToken.address,
    deployer.account.address
  ]);
  
  // Configure contracts
  await fbtToken.write.addAuthorizedMinter([entityICO.address]);
  await entityICO.write.setVestingContract([milestoneVesting.address]);
  await milestoneVesting.write.setDAOContract([fanDAO.address]);
  await milestoneVesting.write.authorizeInitializer([entityICO.address]);
  
  console.log("✅ Platform Infrastructure Ready!\n");
  
  return {
    mockWCHZ,
    factory,
    router,
    fbtToken,
    entityICO,
    milestoneVesting,
    fanDAO
  };
}

// Note: Using shared platform token for all celebrities in this demo

// Execute if run directly
if (require.main === module) {
  runCelebrityOnboardingScenario()
    .then(() => {
      console.log("\n🎭 CELEBRITY ONBOARDING SCENARIOS COMPLETED!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Celebrity onboarding failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runCelebrityOnboardingScenario };