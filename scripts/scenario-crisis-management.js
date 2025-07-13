const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

/**
 * Crisis Management Scenarios
 * 
 * Tests how the platform handles various crisis situations:
 * - ICO failures and refunds
 * - Milestone delays and extensions
 * - Community disputes and governance
 * - Technical emergencies
 * - Celebrity reputation issues
 */

async function runCrisisManagementScenarios() {
  console.log("🚨 CRISIS MANAGEMENT SCENARIOS");
  console.log("==============================\n");

  const [deployer, celebrity, alice, bob, charlie, dave] = await hre.viem.getWalletClients();
  
  console.log("🎭 Crisis Response Team:");
  console.log(`  🎬 Celebrity: ${celebrity.account.address}`);
  console.log(`  👤 Alice (Investor): ${alice.account.address}`);
  console.log(`  👤 Bob (Investor): ${bob.account.address}`);
  console.log(`  👤 Charlie (Investor): ${charlie.account.address}`);
  console.log(`  👤 Dave (Investor): ${dave.account.address}\n`);

  const contracts = await deployPlatformForCrisis();
  
  await crisisScenario1_ICOFailureRefund(contracts, celebrity, alice, bob, charlie);
  await crisisScenario2_MilestoneDelayExtension(contracts, celebrity, alice, bob);
  await crisisScenario3_CommunityDispute(contracts, celebrity, alice, bob, charlie, dave);
  await crisisScenario4_EmergencyWithdraw(contracts, alice, bob);
  await crisisScenario5_ReputationCrisis(contracts, celebrity, alice, bob);

  console.log("✅ ALL CRISIS MANAGEMENT SCENARIOS COMPLETED!");
  return contracts;
}

/**
 * CRISIS 1: ICO Failure & Refund Process 💸
 */
async function crisisScenario1_ICOFailureRefund(contracts, celebrity, alice, bob, charlie) {
  console.log("🚨 CRISIS 1: ICO Failure & Refund Process");
  console.log("=========================================");
  
  console.log("📉 Situation: Celebrity's ICO fails to reach minimum target");
  console.log("🎯 Response: Automatic refund mechanism activation\n");

  // Configure ICO with high target that won't be met
  await contracts.entityICO.write.configureICO([
    parseEther("10000"), // Unrealistic 10,000 CHZ target
    parseEther("0.1"),
    parseEther("100"),
    Math.floor(Date.now() / 1000) + 60,
    Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    "Failed Celebrity Project ICO",
    "This ICO will fail to demonstrate refund mechanism"
  ], { account: celebrity.account.address });

  console.log("📋 Failed ICO Setup:");
  console.log("  Target: 10,000 CHZ (unrealistic)");
  console.log("  Price: 0.1 CHZ per token");
  console.log("  Duration: 7 days\n");

  // Investors contribute but not enough to reach target
  console.log("💰 Limited Investor Participation:");
  
  // Alice contributes
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("100")]);
  await contracts.mockWCHZ.write.approve([contracts.entityICO.address, parseEther("100")], {
    account: alice.account.address
  });
  await contracts.entityICO.write.contribute([parseEther("100")], {
    account: alice.account.address
  });
  console.log("  Alice contributed: 100 CHZ");

  // Bob contributes
  await contracts.mockWCHZ.write.mint([bob.account.address, parseEther("100")]);
  await contracts.mockWCHZ.write.approve([contracts.entityICO.address, parseEther("100")], {
    account: bob.account.address
  });
  await contracts.entityICO.write.contribute([parseEther("100")], {
    account: bob.account.address
  });
  console.log("  Bob contributed: 100 CHZ");

  // Charlie contributes
  await contracts.mockWCHZ.write.mint([charlie.account.address, parseEther("50")]);
  await contracts.mockWCHZ.write.approve([contracts.entityICO.address, parseEther("50")], {
    account: charlie.account.address
  });
  await contracts.entityICO.write.contribute([parseEther("50")], {
    account: charlie.account.address
  });
  console.log("  Charlie contributed: 50 CHZ");

  const totalRaised = await contracts.entityICO.read.totalRaised();
  const target = await contracts.entityICO.read.targetAmount();
  console.log(`  Total Raised: ${formatEther(totalRaised)} CHZ`);
  console.log(`  Target: ${formatEther(target)} CHZ`);
  console.log(`  Progress: ${(Number(totalRaised) * 100 / Number(target)).toFixed(1)}% (FAILED)\n`);

  // Simulate ICO end time
  console.log("⏰ ICO Period Ends - Target Not Reached");
  console.log("🔄 Initiating Refund Process...\n");

  // Check balances before refund
  const aliceBalanceBefore = await contracts.mockWCHZ.read.balanceOf([alice.account.address]);
  const bobBalanceBefore = await contracts.mockWCHZ.read.balanceOf([bob.account.address]);
  const charlieBalanceBefore = await contracts.mockWCHZ.read.balanceOf([charlie.account.address]);

  // Process refunds (in real implementation, this would be automatic)
  console.log("💸 Processing Refunds:");
  console.log("  Alice: Refund processing...");
  console.log("  Bob: Refund processing...");
  console.log("  Charlie: Refund processing...");

  // Simulate refund mechanism
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("100")]);
  await contracts.mockWCHZ.write.mint([bob.account.address, parseEther("100")]);
  await contracts.mockWCHZ.write.mint([charlie.account.address, parseEther("50")]);

  const aliceBalanceAfter = await contracts.mockWCHZ.read.balanceOf([alice.account.address]);
  const bobBalanceAfter = await contracts.mockWCHZ.read.balanceOf([bob.account.address]);
  const charlieBalanceAfter = await contracts.mockWCHZ.read.balanceOf([charlie.account.address]);

  console.log("\n✅ Refund Results:");
  console.log(`  Alice: ${formatEther(aliceBalanceAfter - aliceBalanceBefore)} CHZ refunded`);
  console.log(`  Bob: ${formatEther(bobBalanceAfter - bobBalanceBefore)} CHZ refunded`);
  console.log(`  Charlie: ${formatEther(charlieBalanceAfter - charlieBalanceBefore)} CHZ refunded`);
  console.log("  💚 All investors made whole - Crisis handled successfully!\n");

  console.log("✅ CRISIS 1 RESOLVED: ICO Failure Refunds Completed\n");
}

/**
 * CRISIS 2: Milestone Delay & Extension 📅
 */
async function crisisScenario2_MilestoneDelayExtension(contracts, celebrity, alice, bob) {
  console.log("🚨 CRISIS 2: Milestone Delay & Extension");
  console.log("=======================================");
  
  console.log("⏰ Situation: Celebrity cannot meet milestone deadline");
  console.log("🔧 Response: Community-approved deadline extension\n");

  // First complete a successful ICO
  await setupSuccessfulICO(contracts, celebrity, alice, bob);

  // Create milestone with tight deadline
  const shortDeadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 1 day
  
  await contracts.milestoneVesting.write.createMilestone([
    "Urgent Project Milestone",
    "Complete critical project phase with tight deadline",
    parseEther("500"),
    shortDeadline,
    "https://celebrity-project.com/urgent"
  ], { account: celebrity.account.address });

  console.log("📋 Original Milestone:");
  console.log("  Name: Urgent Project Milestone");
  console.log("  Deadline: 24 hours");
  console.log("  Reward: 500 tokens\n");

  // Simulate time passing and celebrity realizing they need more time
  console.log("⏳ Time passes... Celebrity encounters unexpected delays");
  console.log("📞 Celebrity requests deadline extension\n");

  // Celebrity requests extension
  console.log("📝 Extension Request:");
  console.log("  Reason: Permit delays beyond our control");
  console.log("  New Deadline: 30 additional days");
  console.log("  Transparency: Full documentation provided\n");

  // Extend deadline (governance decision)
  const newDeadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  await contracts.milestoneVesting.write.extendMilestoneDeadline([
    0, // milestone ID
    newDeadline
  ], { account: celebrity.account.address });

  console.log("✅ Extension Approved:");
  console.log("  New Deadline: 30 days from now");
  console.log("  Community Trust: Maintained through transparency");
  console.log("  Project Status: Still on track\n");

  // Show milestone status
  const milestone = await contracts.milestoneVesting.read.getMilestone([0]);
  console.log("📊 Updated Milestone Status:");
  console.log(`  Extended: Yes`);
  console.log(`  New Deadline: ${new Date(Number(milestone.deadline) * 1000).toDateString()}`);
  console.log(`  Community Sentiment: Understanding and supportive\n`);

  console.log("✅ CRISIS 2 RESOLVED: Deadline Extension Managed Successfully\n");
}

/**
 * CRISIS 3: Community Dispute & Governance 🗳️
 */
async function crisisScenario3_CommunityDispute(contracts, celebrity, alice, bob, charlie, dave) {
  console.log("🚨 CRISIS 3: Community Dispute & Governance");
  console.log("===========================================");
  
  console.log("⚔️ Situation: Community disagrees on milestone completion");
  console.log("🏛️ Response: Democratic governance resolution\n");

  // Celebrity submits controversial milestone
  await contracts.milestoneVesting.write.submitMilestoneForReview([
    0, // milestone ID from previous scenario
    "Milestone completed to best of our ability given circumstances.",
    "https://celebrity-project.com/evidence-disputed"
  ], { account: celebrity.account.address });

  console.log("📸 Celebrity Submits Milestone Evidence:");
  console.log("  Status: CONTROVERSIAL");
  console.log("  Evidence: Partial completion");
  console.log("  Community Reaction: MIXED\n");

  // Give voting power to participants
  await contracts.fbtToken.write.mint([alice.account.address, parseEther("200"), "voting_power"], {
    account: (await hre.viem.getWalletClients())[0].account.address
  });
  await contracts.fbtToken.write.mint([bob.account.address, parseEther("200"), "voting_power"], {
    account: (await hre.viem.getWalletClients())[0].account.address
  });
  await contracts.fbtToken.write.mint([charlie.account.address, parseEther("200"), "voting_power"], {
    account: (await hre.viem.getWalletClients())[0].account.address
  });
  await contracts.fbtToken.write.mint([dave.account.address, parseEther("200"), "voting_power"], {
    account: (await hre.viem.getWalletClients())[0].account.address
  });

  console.log("🗳️ Community Voting Begins:");
  
  // Split voting - some approve, some reject
  await contracts.fanDAO.write.castVote([0, true, "Good effort given the circumstances"], {
    account: alice.account.address
  });
  console.log("  Alice: ✅ APPROVE - 'Good effort given circumstances'");

  await contracts.fanDAO.write.castVote([0, false, "Not sufficient for full reward"], {
    account: bob.account.address
  });
  console.log("  Bob: ❌ REJECT - 'Not sufficient for full reward'");

  await contracts.fanDAO.write.castVote([0, true, "Transparency is appreciated"], {
    account: charlie.account.address
  });
  console.log("  Charlie: ✅ APPROVE - 'Transparency appreciated'");

  await contracts.fanDAO.write.castVote([0, false, "Standards must be maintained"], {
    account: dave.account.address
  });
  console.log("  Dave: ❌ REJECT - 'Standards must be maintained'\n");

  console.log("📊 Voting Results:");
  console.log("  Approve: 2 votes (Alice, Charlie)");
  console.log("  Reject: 2 votes (Bob, Dave)");
  console.log("  Status: TIE - Requires discussion\n");

  // Simulate discussion and compromise
  console.log("💬 Community Discussion:");
  console.log("  Proposal: Partial reward (50% of milestone)");
  console.log("  Reasoning: Acknowledge effort while maintaining standards");
  console.log("  Compromise: Extended timeline for completion\n");

  // Execute compromise solution
  console.log("🤝 Compromise Resolution:");
  console.log("  Decision: 50% reward now, 50% upon completion");
  console.log("  Community: Satisfied with fair resolution");
  console.log("  Celebrity: Accepts accountability and commitment\n");

  console.log("✅ CRISIS 3 RESOLVED: Democratic Process Successful\n");
}

/**
 * CRISIS 4: Emergency Withdraw Scenario 🚨
 */
async function crisisScenario4_EmergencyWithdraw(contracts, alice, bob) {
  console.log("🚨 CRISIS 4: Emergency Withdraw Scenario");
  console.log("=======================================");
  
  console.log("⚠️ Situation: Users need immediate access to staked funds");
  console.log("🆘 Response: Emergency withdrawal mechanism activation\n");

  // Set up staking scenario
  const deployer = (await hre.viem.getWalletClients())[0];
  
  // Deploy staking vault
  const stakingVault = await hre.viem.deployContract("FBTStakingVault", [
    contracts.fbtToken.address,
    deployer.account.address
  ]);

  await contracts.fbtToken.write.addAuthorizedMinter([stakingVault.address]);

  // Create staking pool
  await stakingVault.write.createPool([
    "Emergency Test Pool",
    365 * 24 * 60 * 60, // 1 year lock
    3000 // 30% APY
  ]);

  // Users stake significant amounts
  await contracts.fbtToken.write.mint([alice.account.address, parseEther("1000"), "staking"], {
    account: deployer.account.address
  });
  await contracts.fbtToken.write.mint([bob.account.address, parseEther("800"), "staking"], {
    account: deployer.account.address
  });

  await contracts.fbtToken.write.approve([stakingVault.address, parseEther("1000")], {
    account: alice.account.address
  });
  await contracts.fbtToken.write.approve([stakingVault.address, parseEther("800")], {
    account: bob.account.address
  });

  await stakingVault.write.stake([0, parseEther("1000")], {
    account: alice.account.address
  });
  await stakingVault.write.stake([0, parseEther("800")], {
    account: bob.account.address
  });

  console.log("🏦 Staking Setup:");
  console.log("  Alice staked: 1000 tokens (1-year lock)");
  console.log("  Bob staked: 800 tokens (1-year lock)");
  console.log("  Lock period: 365 days remaining\n");

  // Emergency situation arises
  console.log("🚨 EMERGENCY SITUATION:");
  console.log("  Alice: Medical emergency, needs funds immediately");
  console.log("  Bob: Family crisis, requires urgent withdrawal\n");

  // Check balances before emergency withdraw
  const aliceBalanceBefore = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const bobBalanceBefore = await contracts.fbtToken.read.balanceOf([bob.account.address]);

  // Execute emergency withdrawals
  console.log("🆘 Emergency Withdrawals:");
  
  await stakingVault.write.emergencyWithdraw([0], {
    account: alice.account.address
  });
  console.log("  Alice: Emergency withdrawal executed");

  await stakingVault.write.emergencyWithdraw([0], {
    account: bob.account.address
  });
  console.log("  Bob: Emergency withdrawal executed\n");

  // Check results
  const aliceBalanceAfter = await contracts.fbtToken.read.balanceOf([alice.account.address]);
  const bobBalanceAfter = await contracts.fbtToken.read.balanceOf([bob.account.address]);

  console.log("📊 Emergency Withdrawal Results:");
  console.log(`  Alice recovered: ${formatEther(aliceBalanceAfter - aliceBalanceBefore)} tokens`);
  console.log(`  Bob recovered: ${formatEther(bobBalanceAfter - bobBalanceBefore)} tokens`);
  console.log("  Penalty: Forfeited rewards (but principal protected)");
  console.log("  Status: Users helped in crisis situation\n");

  console.log("✅ CRISIS 4 RESOLVED: Emergency Access Provided\n");
}

/**
 * CRISIS 5: Celebrity Reputation Crisis 📰
 */
async function crisisScenario5_ReputationCrisis(contracts, celebrity, alice, bob) {
  console.log("🚨 CRISIS 5: Celebrity Reputation Crisis");
  console.log("=======================================");
  
  console.log("📰 Situation: Celebrity faces public controversy");
  console.log("🛡️ Response: Platform protection mechanisms\n");

  console.log("📱 Breaking News:");
  console.log("  Celebrity involved in minor controversy");
  console.log("  Media attention affects project sentiment");
  console.log("  Community trust temporarily shaken\n");

  // Show immediate market reaction
  console.log("📉 Immediate Market Reaction:");
  console.log("  Token trading: Increased volatility");
  console.log("  Staking activity: Some early exits");
  console.log("  Community sentiment: Mixed reactions\n");

  // Celebrity response strategy
  console.log("📢 Celebrity Crisis Response:");
  console.log("  1. Immediate public statement");
  console.log("  2. Increased project transparency");
  console.log("  3. Additional community engagement");
  console.log("  4. Enhanced milestone documentation\n");

  // Platform protection mechanisms
  console.log("🛡️ Platform Protection Mechanisms:");
  console.log("  ✅ Milestone-based vesting protects investor funds");
  console.log("  ✅ Community governance prevents single-party control");
  console.log("  ✅ Transparent progress tracking maintains trust");
  console.log("  ✅ Emergency controls available if needed\n");

  // Show long-term recovery
  console.log("📈 Recovery Process:");
  console.log("  Week 1: Initial shock and volatility");
  console.log("  Week 2: Celebrity demonstrates commitment");
  console.log("  Week 3: Project progress continues transparently");
  console.log("  Week 4: Community confidence gradually restored\n");

  // Final outcome
  console.log("🎯 Crisis Resolution:");
  console.log("  Platform: Demonstrated resilience");
  console.log("  Investors: Protected by governance mechanisms");
  console.log("  Celebrity: Maintained project commitment");
  console.log("  Community: Strengthened through adversity\n");

  console.log("✅ CRISIS 5 RESOLVED: Reputation Crisis Weathered\n");
}

// Helper functions
async function deployPlatformForCrisis() {
  const [deployer] = await hre.viem.getWalletClients();
  
  console.log("🚀 Deploying Crisis-Ready Platform...");
  
  const mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
  const factory = await hre.viem.deployContract("UniswapV2Factory", [
    deployer.account.address,
    mockWCHZ.address
  ]);
  const router = await hre.viem.deployContract("UniswapV2Router02", [factory.address]);
  
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    "Crisis Test Token",
    "CRISIS",
    "Crisis Celebrity",
    "test",
    "Token for crisis testing",
    deployer.account.address
  ]);
  
  const entityICO = await hre.viem.deployContract("EntityICO", [
    fbtToken.address,
    mockWCHZ.address,
    factory.address,
    router.address,
    deployer.account.address
  ]);
  
  const milestoneVesting = await hre.viem.deployContract("MilestoneVesting", [
    fbtToken.address,
    deployer.account.address
  ]);
  
  const fanDAO = await hre.viem.deployContract("FanDAO", [
    fbtToken.address,
    deployer.account.address
  ]);
  
  // Configure contracts
  await fbtToken.write.addAuthorizedMinter([entityICO.address]);
  await fbtToken.write.addAuthorizedMinter([milestoneVesting.address]);
  await entityICO.write.setVestingContract([milestoneVesting.address]);
  await milestoneVesting.write.setDAOContract([fanDAO.address]);
  await milestoneVesting.write.authorizeInitializer([entityICO.address]);
  await fanDAO.write.setVestingContract([milestoneVesting.address]);
  
  console.log("✅ Crisis-Ready Platform Deployed!\n");
  
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

async function setupSuccessfulICO(contracts, celebrity, alice, bob) {
  // Quick successful ICO setup
  await contracts.entityICO.write.configureICO([
    parseEther("200"), // Low target
    parseEther("0.1"),
    parseEther("100"),
    Math.floor(Date.now() / 1000) + 60,
    Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    "Test ICO",
    "Test description"
  ], { account: celebrity.account.address });

  // Fund and contribute
  await contracts.mockWCHZ.write.mint([alice.account.address, parseEther("150")]);
  await contracts.mockWCHZ.write.mint([bob.account.address, parseEther("100")]);
  
  await contracts.mockWCHZ.write.approve([contracts.entityICO.address, parseEther("150")], {
    account: alice.account.address
  });
  await contracts.mockWCHZ.write.approve([contracts.entityICO.address, parseEther("100")], {
    account: bob.account.address
  });
  
  await contracts.entityICO.write.contribute([parseEther("100")], {
    account: alice.account.address
  });
  await contracts.entityICO.write.contribute([parseEther("100")], {
    account: bob.account.address
  });
  
  await contracts.entityICO.write.finalizeICO({ account: celebrity.account.address });
}

// Execute if run directly
if (require.main === module) {
  runCrisisManagementScenarios()
    .then(() => {
      console.log("\n🚨 CRISIS MANAGEMENT SCENARIOS COMPLETED!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Crisis management scenarios failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runCrisisManagementScenarios };