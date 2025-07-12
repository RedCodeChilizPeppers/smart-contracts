import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { parseEther, zeroAddress } from "viem";
import hre from "hardhat";

describe("Vesting System Tests", function () {
  let fbtToken: any;
  let entityICO: any;
  let milestoneVesting: any;
  let fanDAO: any;
  let mockWCHZ: any;
  let uniswapFactory: any;
  let uniswapRouter: any;
  let owner: any;
  let entityWallet: any;
  let user1: any;
  let user2: any;
  let user3: any;

  const ENTITY_NAME = "Taylor Swift";
  const ENTITY_TYPE = "music";
  const ENTITY_DESCRIPTION = "Official fan token for Taylor Swift supporters";
  
  const ICO_TARGET = parseEther("300"); // 300 CHZ target (easier to reach with 100 CHZ max contributions)
  const TOKEN_PRICE = parseEther("0.1"); // 0.1 CHZ per FBT
  const MIN_CONTRIBUTION = parseEther("1"); // 1 CHZ minimum
  const MAX_CONTRIBUTION = parseEther("100"); // 100 CHZ maximum

  beforeEach(async function () {
    [owner, entityWallet, user1, user2, user3] = await hre.viem.getWalletClients();

    // Deploy mock WCHZ
    mockWCHZ = await hre.viem.deployContract("MockWCHZ", []);

    // Deploy Uniswap contracts
    uniswapFactory = await hre.viem.deployContract("UniswapV2Factory", [
      owner.account.address,
      mockWCHZ.address
    ]);

    uniswapRouter = await hre.viem.deployContract("UniswapV2Router02", [
      uniswapFactory.address
    ]);

    // Deploy FBT Token
    fbtToken = await hre.viem.deployContract("FBTToken", [
      "Taylor Swift Fan Token",
      "TSFT",
      ENTITY_NAME,
      ENTITY_TYPE,
      ENTITY_DESCRIPTION,
      owner.account.address
    ]);

    // Deploy Milestone Vesting
    milestoneVesting = await hre.viem.deployContract("MilestoneVesting", [
      fbtToken.address,
      entityWallet.account.address,
      owner.account.address
    ]);

    // Deploy Fan DAO
    fanDAO = await hre.viem.deployContract("FanDAO", [
      fbtToken.address,
      owner.account.address
    ]);

    // Deploy Entity ICO
    entityICO = await hre.viem.deployContract("EntityICO", [
      fbtToken.address,
      ENTITY_NAME,
      ENTITY_TYPE,
      ENTITY_DESCRIPTION,
      entityWallet.account.address,
      owner.account.address
    ]);

    // Set up cross-contract connections
    await milestoneVesting.write.setDAOContract([fanDAO.address], {
      account: owner.account.address,
    });

    await fanDAO.write.setVestingContract([milestoneVesting.address], {
      account: owner.account.address,
    });

    await entityICO.write.setVestingContract([milestoneVesting.address], {
      account: owner.account.address,
    });

    // Authorize ICO contract to initialize vesting
    await milestoneVesting.write.authorizeInitializer([entityICO.address], {
      account: owner.account.address,
    });

    // Authorize contracts to mint FBT tokens
    await fbtToken.write.addAuthorizedMinter([entityICO.address], {
      account: owner.account.address,
    });
    await fbtToken.write.addAuthorizedMinter([fanDAO.address], {
      account: owner.account.address,
    });
    await fbtToken.write.addAuthorizedMinter([milestoneVesting.address], {
      account: owner.account.address,
    });

    // Mint initial FBT tokens to users for DAO voting
    await fbtToken.write.mint([user1.account.address, parseEther("100"), "initial_distribution"], {
      account: owner.account.address,
    });
    await fbtToken.write.mint([user2.account.address, parseEther("200"), "initial_distribution"], {
      account: owner.account.address,
    });
    await fbtToken.write.mint([user3.account.address, parseEther("150"), "initial_distribution"], {
      account: owner.account.address,
    });
  });

  describe("EntityICO", function () {
    beforeEach(async function () {
      // Fast forward time first to ensure we're ahead
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("evm_mine");
      
      // Get current block timestamp after time increase
      const latestBlock = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      const currentTime = parseInt(latestBlock.timestamp, 16);
      
      // Configure ICO with future times
      const startTime = currentTime + 120; // Start in 2 minutes
      const endTime = startTime + 7 * 24 * 60 * 60; // End in 7 days
      
      await entityICO.write.configureICO([
        ICO_TARGET,
        TOKEN_PRICE,
        MIN_CONTRIBUTION,
        MAX_CONTRIBUTION,
        BigInt(startTime),
        BigInt(endTime),
        false // KYC not required for tests
      ], {
        account: owner.account.address,
      });

      // Fast forward time to start ICO
      await hre.network.provider.send("evm_increaseTime", [150]);
      await hre.network.provider.send("evm_mine");
    });

    it("Should configure ICO correctly", async function () {
      const config = await entityICO.read.icoConfig();
      expect(config[0]).to.equal(ICO_TARGET); // targetAmount
      expect(config[1]).to.equal(TOKEN_PRICE); // tokenPrice
      expect(config[2]).to.equal(MIN_CONTRIBUTION); // minContribution
      expect(config[3]).to.equal(MAX_CONTRIBUTION); // maxContribution
    });

    it("Should allow contributions and track correctly", async function () {
      const contributionAmount = parseEther("50");
      
      await entityICO.write.contribute({
        account: user1.account.address,
        value: contributionAmount
      });

      const contribution = await entityICO.read.getContribution([user1.account.address]);
      expect(contribution[0]).to.equal(contributionAmount); // chzAmount
      
      const expectedFBT = (contributionAmount * parseEther("1")) / TOKEN_PRICE;
      expect(contribution[1]).to.equal(expectedFBT); // fbtAmount

      const status = await entityICO.read.getICOStatus();
      expect(status[0]).to.equal(contributionAmount); // raised
    });

    it("Should enforce contribution limits", async function () {
      // Test minimum contribution
      await expect(
        entityICO.write.contribute({
          account: user1.account.address,
          value: parseEther("0.5") // Below minimum
        })
      ).to.be.rejectedWith("EntityICO: Below minimum contribution");

      // Test maximum contribution
      await expect(
        entityICO.write.contribute({
          account: user1.account.address,
          value: parseEther("150") // Above maximum
        })
      ).to.be.rejectedWith("EntityICO: Above maximum contribution");
    });

    it("Should finalize ICO and distribute funds correctly", async function () {
      // Multiple users contribute to reach target (300 CHZ total)
      await entityICO.write.contribute({
        account: user1.account.address,
        value: parseEther("100")
      });
      await entityICO.write.contribute({
        account: user2.account.address,
        value: parseEther("100")
      });
      await entityICO.write.contribute({
        account: user3.account.address,
        value: parseEther("100")
      });

      // ICO should auto-finalize when target reached
      const status = await entityICO.read.getICOStatus();
      expect(status[4]).to.be.true; // finalized

      // Check vesting was initialized
      const vestingSummary = await milestoneVesting.read.getVestingSummary();
      const expectedVestingAmount = (ICO_TARGET * 5000n) / 10000n; // 50%
      expect(vestingSummary[0]).to.equal(expectedVestingAmount); // totalAmount
    });

    it("Should allow token claiming after finalization", async function () {
      const contributionAmount = parseEther("100");
      
      await entityICO.write.contribute({
        account: user1.account.address,
        value: contributionAmount
      });

      // Fast forward to end time and finalize
      await hre.network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 100]);
      await hre.network.provider.send("evm_mine");
      
      await entityICO.write.finalizeICO({
        account: owner.account.address,
      });

      // Claim tokens
      const balanceBefore = await fbtToken.read.balanceOf([user1.account.address]);
      
      await entityICO.write.claimTokens({
        account: user1.account.address,
      });

      const balanceAfter = await fbtToken.read.balanceOf([user1.account.address]);
      const expectedTokens = (contributionAmount * parseEther("1")) / TOKEN_PRICE;
      
      expect(balanceAfter - balanceBefore).to.equal(expectedTokens);
    });
  });

  describe("MilestoneVesting", function () {
    beforeEach(async function () {
      // Initialize vesting with test funds
      const vestingAmount = parseEther("500");
      const fbtRewards = parseEther("1000");
      
      await milestoneVesting.write.initializeVesting([vestingAmount, fbtRewards], {
        account: owner.account.address,
        value: vestingAmount
      });
    });

    it("Should create milestones correctly", async function () {
      const releaseAmount = parseEther("100");
      const fbtReward = parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

      await milestoneVesting.write.createMilestone([
        "Album Release",
        "Complete and release new album",
        0, // ProjectDeliverable
        releaseAmount,
        fbtReward,
        deadline,
        false, // No oracle required
        zeroAddress,
        1000 // 10% quorum
      ], {
        account: owner.account.address,
      });

      const milestone = await milestoneVesting.read.getMilestone([0]);
      expect(milestone[0]).to.equal("Album Release"); // title
      expect(milestone[3]).to.equal(releaseAmount); // releaseAmount
      expect(milestone[4]).to.equal(fbtReward); // fbtRewardAmount
      expect(milestone[6]).to.equal(0); // status (Pending)
    });

    it("Should submit milestone for review", async function () {
      // Create milestone first
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      
      await milestoneVesting.write.createMilestone([
        "Album Release",
        "Complete and release new album",
        0,
        parseEther("100"),
        parseEther("200"),
        deadline,
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      // Submit for review
      const evidenceHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      
      await milestoneVesting.write.submitMilestoneForReview([
        0,
        evidenceHash,
        "Album available on all streaming platforms"
      ], {
        account: owner.account.address,
      });

      const milestone = await milestoneVesting.read.getMilestone([0]);
      expect(milestone[6]).to.equal(2); // status (SubmittedForReview)
      expect(milestone[7]).to.equal(evidenceHash); // evidenceHash
    });

    it("Should track milestone statuses correctly", async function () {
      // Create multiple milestones
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      
      await milestoneVesting.write.createMilestone([
        "Milestone 1",
        "Description 1",
        0,
        parseEther("100"),
        parseEther("200"),
        deadline,
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      await milestoneVesting.write.createMilestone([
        "Milestone 2",
        "Description 2",
        1, // PerformanceMetric
        parseEther("150"),
        parseEther("300"),
        deadline,
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      const pendingMilestones = await milestoneVesting.read.getMilestonesByStatus([0]); // Pending
      expect(pendingMilestones.length).to.equal(2);
      expect(pendingMilestones[0]).to.equal(0n);
      expect(pendingMilestones[1]).to.equal(1n);
    });

    it("Should check overdue milestones", async function () {
      // Get current block timestamp
      const latestBlock = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      const currentTime = parseInt(latestBlock.timestamp, 16);
      const futureDeadline = currentTime + 3600; // 1 hour from now
      
      // Create milestone with future deadline first
      await milestoneVesting.write.createMilestone([
        "Future Milestone",
        "This milestone will become overdue",
        0,
        parseEther("100"),
        parseEther("200"),
        BigInt(futureDeadline),
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      // Initially should not be overdue
      let isOverdue = await milestoneVesting.read.isMilestoneOverdue([0]);
      expect(isOverdue).to.be.false;

      // Fast forward time past deadline
      await hre.network.provider.send("evm_increaseTime", [3700]); // 1 hour + 100 seconds
      await hre.network.provider.send("evm_mine");

      // Now should be overdue
      isOverdue = await milestoneVesting.read.isMilestoneOverdue([0]);
      expect(isOverdue).to.be.true;
    });

    it("Should extend milestone deadlines", async function () {
      // Get current block timestamp
      const latestBlock = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      const currentTime = parseInt(latestBlock.timestamp, 16);
      const deadline = currentTime + 30 * 24 * 60 * 60; // 30 days from now
      
      await milestoneVesting.write.createMilestone([
        "Extendable Milestone",
        "This milestone will be extended",
        0,
        parseEther("100"),
        parseEther("200"),
        BigInt(deadline),
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      const newDeadline = deadline + 15 * 24 * 60 * 60; // Add 15 days
      
      await milestoneVesting.write.extendMilestoneDeadline([0, BigInt(newDeadline)], {
        account: owner.account.address,
      });

      const milestone = await milestoneVesting.read.getMilestone([0]);
      expect(milestone[5]).to.equal(BigInt(newDeadline)); // deadline
    });
  });

  describe("FanDAO", function () {
    it("Should calculate voting power correctly", async function () {
      const user1Power = await fanDAO.read.getVotingPower([user1.account.address]);
      expect(user1Power).to.equal(parseEther("100")); // Initial FBT balance

      const user2Power = await fanDAO.read.getVotingPower([user2.account.address]);
      expect(user2Power).to.equal(parseEther("200"));
    });

    it("Should create milestone votes", async function () {
      // Get current block timestamp
      const latestBlock = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      const currentTime = parseInt(latestBlock.timestamp, 16);
      const deadline = currentTime + 30 * 24 * 60 * 60; // 30 days from now
      
      await milestoneVesting.write.initializeVesting([parseEther("500"), parseEther("1000")], {
        account: owner.account.address,
        value: parseEther("500")
      });

      await milestoneVesting.write.createMilestone([
        "Test Milestone",
        "A milestone for DAO voting",
        0,
        parseEther("100"),
        parseEther("200"),
        BigInt(deadline),
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      await milestoneVesting.write.submitMilestoneForReview([
        0,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "Evidence description"
      ], {
        account: owner.account.address,
      });

      // Check that DAO vote was created
      const daoStats = await fanDAO.read.getDAOStats();
      expect(daoStats[0] > 0n).to.be.true; // totalVotes
    });

    it("Should allow voting on milestones", async function () {
      // Approve DAO contract to spend FBT tokens for proposal deposit (100 FBT)
      await fbtToken.write.approve([fanDAO.address, parseEther("100")], {
        account: user1.account.address,
      });

      // Create a manual vote for testing
      await fanDAO.write.createProposal([
        1, // ParameterChange
        "Test Proposal",
        "A test governance proposal",
        "0x"
      ], {
        account: user1.account.address,
      });

      // User2 votes on the proposal (vote ID 0 since it's the first vote)
      await fanDAO.write.castVote([0, true], { // Vote FOR
        account: user2.account.address,
      });

      const userVote = await fanDAO.read.getUserVote([0, user2.account.address]);
      expect(userVote[0]).to.be.true; // hasVoted
      expect(userVote[1]).to.be.true; // choice
      expect(userVote[2]).to.equal(parseEther("200")); // votingPower
    });

    it("Should enforce minimum voting power", async function () {
      // Deploy a user with insufficient tokens
      const [lowBalanceUser] = await hre.viem.getWalletClients();
      
      // Mint only 5 FBT (below minimum of 10 FBT)
      await fbtToken.write.mint([lowBalanceUser.account.address, parseEther("5"), "low_balance"], {
        account: owner.account.address,
      });

      await expect(
        fanDAO.write.createProposal([
          1,
          "Test Proposal",
          "Should fail due to low balance",
          "0x"
        ], {
          account: lowBalanceUser.account.address,
        })
      ).to.be.rejectedWith("FanDAO: Insufficient voting power");
    });

    it("Should delegate voting power", async function () {
      // User1 delegates to User2
      await fanDAO.write.delegateVotingPower([user2.account.address], {
        account: user1.account.address,
      });

      // User2 should now have combined voting power
      const user2Power = await fanDAO.read.getVotingPower([user2.account.address]);
      expect(user2Power).to.equal(parseEther("300")); // 200 own + 100 delegated

      // User1 should still have their token balance but delegated power
      const user1Balance = await fbtToken.read.balanceOf([user1.account.address]);
      expect(user1Balance).to.equal(parseEther("100"));
    });

    it("Should distribute voting rewards", async function () {
      const balanceBefore = await fbtToken.read.balanceOf([user2.account.address]);
      
      // Approve DAO contract to spend FBT tokens for proposal deposit (100 FBT)
      await fbtToken.write.approve([fanDAO.address, parseEther("100")], {
        account: user1.account.address,
      });
      
      // Create and vote on proposal
      await fanDAO.write.createProposal([
        1,
        "Reward Test",
        "Testing voting rewards",
        "0x"
      ], {
        account: user1.account.address,
      });

      await fanDAO.write.castVote([0, true], {
        account: user2.account.address,
      });

      const balanceAfter = await fbtToken.read.balanceOf([user2.account.address]);
      expect(balanceAfter > balanceBefore).to.be.true; // Should have received rewards
    });

    it("Should update DAO configuration", async function () {
      const newVotingPeriod = 10 * 24 * 60 * 60; // 10 days
      const newQuorum = 1500; // 15%
      const newThreshold = 6000; // 60%
      
      await fanDAO.write.updateDAOConfig([
        newVotingPeriod,
        newQuorum,
        newThreshold,
        parseEther("200"), // New proposal deposit
        200, // 2% voting reward rate
        parseEther("20") // 20 FBT minimum voting power
      ], {
        account: owner.account.address,
      });

      const config = await fanDAO.read.daoConfig();
      expect(config[0]).to.equal(BigInt(newVotingPeriod)); // votingPeriod
      expect(config[1]).to.equal(BigInt(newQuorum)); // minimumQuorum
      expect(config[2]).to.equal(BigInt(newThreshold)); // passingThreshold
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full ICO to milestone approval flow", async function () {
      // Get current block timestamp
      const latestBlock = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      const currentTime = parseInt(latestBlock.timestamp, 16);
      
      // 1. Configure and run ICO
      const startTime = currentTime + 120;
      const endTime = startTime + 7 * 24 * 60 * 60;
      
      await entityICO.write.configureICO([
        ICO_TARGET,
        TOKEN_PRICE,
        MIN_CONTRIBUTION,
        MAX_CONTRIBUTION,
        BigInt(startTime),
        BigInt(endTime),
        false
      ], {
        account: owner.account.address,
      });

      // Fast forward and contribute
      await hre.network.provider.send("evm_increaseTime", [150]);
      await hre.network.provider.send("evm_mine");

      await entityICO.write.contribute({
        account: user1.account.address,
        value: parseEther("100") // Within max contribution limit
      });
      await entityICO.write.contribute({
        account: user2.account.address,
        value: parseEther("100")
      });
      await entityICO.write.contribute({
        account: user3.account.address,
        value: parseEther("100")
      });

      // 2. Claim ICO tokens
      await entityICO.write.claimTokens({
        account: user1.account.address,
      });

      // 3. Create milestone
      const newLatestBlock = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      const newCurrentTime = parseInt(newLatestBlock.timestamp, 16);
      const deadline = newCurrentTime + 30 * 24 * 60 * 60;
      
      await milestoneVesting.write.createMilestone([
        "Integration Test Milestone",
        "End-to-end test milestone",
        0,
        parseEther("100"),
        parseEther("200"),
        BigInt(deadline),
        false,
        zeroAddress,
        1000
      ], {
        account: owner.account.address,
      });

      // 4. Submit milestone for review
      await milestoneVesting.write.submitMilestoneForReview([
        0,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "Integration test evidence"
      ], {
        account: owner.account.address,
      });

      // 5. Vote on milestone (user1 has ICO tokens + original balance)
      await fanDAO.write.castVote([0, true], {
        account: user1.account.address,
      });

      // Fast forward past voting period
      await hre.network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await hre.network.provider.send("evm_mine");

      // 6. Execute vote
      const publicClient = await hre.viem.getPublicClient();
      const entityBalanceBefore = await publicClient.getBalance({
        address: entityWallet.account.address
      });

      await fanDAO.write.executeVote([0], {
        account: owner.account.address,
      });

      // 7. Verify milestone was approved and funds released
      const milestone = await milestoneVesting.read.getMilestone([0]);
      expect(milestone[6]).to.equal(5); // status (Released)

      const entityBalanceAfter = await publicClient.getBalance({
        address: entityWallet.account.address
      });
      expect(entityBalanceAfter > entityBalanceBefore).to.be.true;
    });
  });
});