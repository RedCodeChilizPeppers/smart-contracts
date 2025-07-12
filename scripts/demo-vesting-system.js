const hre = require("hardhat");
const { parseEther } = require("viem");

async function main() {
  console.log("🎬 Celebrity Crowdfunding Vesting System Demo\n");
  
  // Get signers
  const [owner, taylorSwift, fan1, fan2, fan3] = await hre.viem.getWalletClients();
  
  console.log("👥 Demo Participants:");
  console.log(`  Owner: ${owner.account.address}`);
  console.log(`  Taylor Swift: ${taylorSwift.account.address}`);
  console.log(`  Fan 1: ${fan1.account.address}`);
  console.log(`  Fan 2: ${fan2.account.address}`);
  console.log(`  Fan 3: ${fan3.account.address}\n`);

  // Deploy MockWCHZ for liquidity operations
  console.log("📦 Deploying Mock WCHZ...");
  const mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);
  console.log(`  MockWCHZ deployed at: ${mockWCHZ.address}\n`);

  // Deploy FBT Token
  console.log("🪙 Deploying Taylor Swift Fan Token (TSFT)...");
  const fbtToken = await hre.viem.deployContract("FBTToken", [
    "Taylor Swift Fan Token",
    "TSFT",
    "Taylor Swift",
    "music",
    "Official fan token for Taylor Swift supporters",
    owner.account.address
  ]);
  console.log(`  FBT Token deployed at: ${fbtToken.address}\n`);

  // Deploy Milestone Vesting
  console.log("📅 Deploying Milestone Vesting Contract...");
  const milestoneVesting = await hre.viem.deployContract("MilestoneVesting", [
    fbtToken.address,
    taylorSwift.account.address,
    owner.account.address
  ]);
  console.log(`  MilestoneVesting deployed at: ${milestoneVesting.address}\n`);

  // Deploy Fan DAO
  console.log("🗳️ Deploying Fan DAO...");
  const fanDAO = await hre.viem.deployContract("FanDAO", [
    fbtToken.address,
    owner.account.address
  ]);
  console.log(`  FanDAO deployed at: ${fanDAO.address}\n`);

  // Deploy Entity ICO
  console.log("🚀 Deploying Taylor Swift ICO Contract...");
  const entityICO = await hre.viem.deployContract("EntityICO", [
    fbtToken.address,
    "Taylor Swift",
    "music",
    "Crowdfunding for Taylor Swift's next world tour",
    taylorSwift.account.address,
    owner.account.address
  ]);
  console.log(`  EntityICO deployed at: ${entityICO.address}\n`);

  // Setup connections
  console.log("🔗 Setting up contract connections...");
  await milestoneVesting.write.setDAOContract([fanDAO.address], {
    account: owner.account.address,
  });
  await fanDAO.write.setVestingContract([milestoneVesting.address], {
    account: owner.account.address,
  });
  await entityICO.write.setVestingContract([milestoneVesting.address], {
    account: owner.account.address,
  });
  await milestoneVesting.write.authorizeInitializer([entityICO.address], {
    account: owner.account.address,
  });

  // Authorize minters
  await fbtToken.write.addAuthorizedMinter([entityICO.address], {
    account: owner.account.address,
  });
  await fbtToken.write.addAuthorizedMinter([fanDAO.address], {
    account: owner.account.address,
  });
  await fbtToken.write.addAuthorizedMinter([milestoneVesting.address], {
    account: owner.account.address,
  });
  console.log("  ✅ Contract connections established\n");

  // Configure ICO
  console.log("⚙️ Configuring ICO Parameters:");
  const icoTarget = parseEther("1000"); // 1000 CHZ target
  const tokenPrice = parseEther("0.1"); // 0.1 CHZ per TSFT
  const minContribution = parseEther("10"); // 10 CHZ minimum
  const maxContribution = parseEther("500"); // 500 CHZ maximum
  
  const currentTime = Math.floor(Date.now() / 1000);
  const startTime = currentTime + 60; // Start in 1 minute
  const endTime = startTime + 7 * 24 * 60 * 60; // 7 days duration

  await entityICO.write.configureICO([
    icoTarget,
    tokenPrice,
    minContribution,
    maxContribution,
    BigInt(startTime),
    BigInt(endTime),
    false // KYC not required for demo
  ], {
    account: owner.account.address,
  });
  
  console.log(`  Target: 1,000 CHZ`);
  console.log(`  Token Price: 0.1 CHZ per TSFT`);
  console.log(`  Min Contribution: 10 CHZ`);
  console.log(`  Max Contribution: 500 CHZ`);
  console.log(`  Duration: 7 days\n`);

  // Wait for ICO to start
  console.log("⏳ Waiting for ICO to start...");
  await new Promise(resolve => setTimeout(resolve, 61000));
  console.log("  ✅ ICO is now live!\n");

  // Fans contribute to ICO
  console.log("💰 Fans Contributing to ICO:");
  
  await entityICO.write.contribute({
    account: fan1.account.address,
    value: parseEther("400")
  });
  console.log(`  Fan 1 contributed: 400 CHZ → 4,000 TSFT`);

  await entityICO.write.contribute({
    account: fan2.account.address,
    value: parseEther("300")
  });
  console.log(`  Fan 2 contributed: 300 CHZ → 3,000 TSFT`);

  await entityICO.write.contribute({
    account: fan3.account.address,
    value: parseEther("300")
  });
  console.log(`  Fan 3 contributed: 300 CHZ → 3,000 TSFT`);
  
  console.log(`  ✅ ICO Target Reached: 1,000 CHZ raised!\n`);

  // Check fund distribution
  console.log("💸 Automatic Fund Distribution:");
  console.log(`  20% Immediate (200 CHZ) → Taylor Swift Wallet`);
  console.log(`  30% Liquidity (300 CHZ) → Reserved for DEX`);
  console.log(`  50% Vesting (500 CHZ) → Milestone Contract\n`);

  // Fans claim their tokens
  console.log("🎫 Fans Claiming FBT Tokens:");
  await entityICO.write.claimTokens({ account: fan1.account.address });
  await entityICO.write.claimTokens({ account: fan2.account.address });
  await entityICO.write.claimTokens({ account: fan3.account.address });
  console.log("  ✅ All fans have claimed their TSFT tokens\n");

  // Create milestones
  console.log("📋 Creating Project Milestones:");
  
  // Milestone 1: Album Recording
  const deadline1 = currentTime + 90 * 24 * 60 * 60; // 90 days
  await milestoneVesting.write.createMilestone([
    "Album Recording Complete",
    "Complete recording of 15 new songs for the upcoming album",
    0, // ProjectDeliverable
    parseEther("150"), // 150 CHZ release
    parseEther("500"), // 500 TSFT reward
    BigInt(deadline1),
    false,
    "0x0000000000000000000000000000000000000000",
    1000 // 10% quorum
  ], {
    account: owner.account.address,
  });
  console.log("  ✅ Milestone 1: Album Recording (150 CHZ)");

  // Milestone 2: Music Video Production
  const deadline2 = currentTime + 180 * 24 * 60 * 60; // 180 days
  await milestoneVesting.write.createMilestone([
    "Music Video Production",
    "Produce and release 3 music videos for lead singles",
    0, // ProjectDeliverable
    parseEther("200"), // 200 CHZ release
    parseEther("750"), // 750 TSFT reward
    BigInt(deadline2),
    false,
    "0x0000000000000000000000000000000000000000",
    1000
  ], {
    account: owner.account.address,
  });
  console.log("  ✅ Milestone 2: Music Video Production (200 CHZ)");

  // Milestone 3: World Tour Launch
  const deadline3 = currentTime + 365 * 24 * 60 * 60; // 365 days
  await milestoneVesting.write.createMilestone([
    "World Tour Launch",
    "Successfully launch world tour with first 10 concerts",
    0, // ProjectDeliverable
    parseEther("150"), // 150 CHZ release
    parseEther("1000"), // 1000 TSFT reward
    BigInt(deadline3),
    false,
    "0x0000000000000000000000000000000000000000",
    1000
  ], {
    account: owner.account.address,
  });
  console.log("  ✅ Milestone 3: World Tour Launch (150 CHZ)\n");

  // Simulate milestone completion
  console.log("🎵 Fast Forward: Album Recording Complete!");
  console.log("  Taylor Swift submits evidence of completion...");
  
  await milestoneVesting.write.submitMilestoneForReview([
    0, // Milestone ID
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Evidence hash (IPFS)
    "Album recording complete with 15 tracks. Studio session photos and track list available on IPFS."
  ], {
    account: owner.account.address,
  });
  console.log("  ✅ Milestone submitted for DAO review\n");

  // DAO Voting
  console.log("🗳️ DAO Voting on Milestone Completion:");
  console.log("  Vote created automatically by vesting contract");
  
  // Fans vote
  await fanDAO.write.castVote([0, true], {
    account: fan1.account.address,
  });
  console.log("  Fan 1 votes: ✅ YES (4,000 TSFT voting power)");

  await fanDAO.write.castVote([0, true], {
    account: fan2.account.address,
  });
  console.log("  Fan 2 votes: ✅ YES (3,000 TSFT voting power)");

  await fanDAO.write.castVote([0, false], {
    account: fan3.account.address,
  });
  console.log("  Fan 3 votes: ❌ NO (3,000 TSFT voting power)");
  
  console.log("\n  Vote Result: 70% YES / 30% NO");
  console.log("  ✅ Milestone APPROVED (> 51% threshold)\n");

  // Fast forward voting period
  console.log("⏳ Fast forwarding 7-day voting period...");
  await hre.network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
  await hre.network.provider.send("evm_mine");

  // Execute vote
  console.log("💰 Executing Approved Vote:");
  const taylorBalanceBefore = await hre.viem.getPublicClient().then(client => 
    client.getBalance({ address: taylorSwift.account.address })
  );
  
  await fanDAO.write.executeVote([0], {
    account: owner.account.address,
  });
  
  const taylorBalanceAfter = await hre.viem.getPublicClient().then(client => 
    client.getBalance({ address: taylorSwift.account.address })
  );
  
  const fundsReceived = (taylorBalanceAfter - taylorBalanceBefore) / BigInt(1e18);
  console.log(`  ✅ Taylor Swift received: ${fundsReceived} CHZ`);
  console.log(`  ✅ Voting rewards distributed to participants\n`);

  // Check final balances
  console.log("📊 Final Token Balances:");
  const fan1Balance = await fbtToken.read.balanceOf([fan1.account.address]);
  const fan2Balance = await fbtToken.read.balanceOf([fan2.account.address]);
  const fan3Balance = await fbtToken.read.balanceOf([fan3.account.address]);
  
  console.log(`  Fan 1: ${fan1Balance / BigInt(1e18)} TSFT (includes voting rewards)`);
  console.log(`  Fan 2: ${fan2Balance / BigInt(1e18)} TSFT (includes voting rewards)`);
  console.log(`  Fan 3: ${fan3Balance / BigInt(1e18)} TSFT\n`);

  // Summary
  console.log("📈 Vesting Status:");
  const vestingSummary = await milestoneVesting.read.getVestingSummary();
  console.log(`  Total Vested: 500 CHZ`);
  console.log(`  Released: ${vestingSummary[1] / BigInt(1e18)} CHZ`);
  console.log(`  Remaining: ${(vestingSummary[0] - vestingSummary[1]) / BigInt(1e18)} CHZ`);
  console.log(`  Milestones: 1/3 completed\n`);

  console.log("🎉 Demo Complete!");
  console.log("\nKey Takeaways:");
  console.log("  ✅ Automated fund distribution upon ICO completion");
  console.log("  ✅ Milestone-based vesting with community governance");
  console.log("  ✅ Democratic voting using FBT tokens");
  console.log("  ✅ Transparent fund release upon approval");
  console.log("  ✅ Voting rewards incentivize participation");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });