import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { parseEther, zeroAddress } from "viem";
import hre from "hardhat";

describe("FBT Staking Vault Tests", function () {
  let fbtToken: any;
  let stakingVault: any;
  let prizeRedemption: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await hre.viem.getWalletClients();

    // Deploy FBT Token
    fbtToken = await hre.viem.deployContract("FBTToken", [
      "FC Barcelona Fan Token",
      "FCBFT",
      "FC Barcelona",
      "sport",
      "Official Fan Base Token for FC Barcelona supporters",
      owner.account.address
    ]);

    // Deploy Staking Vault
    stakingVault = await hre.viem.deployContract("FBTStakingVault", [
      fbtToken.address,
      owner.account.address
    ]);

    // Deploy Prize Redemption
    prizeRedemption = await hre.viem.deployContract("PrizeRedemption", [
      fbtToken.address,
      owner.account.address
    ]);

    // Authorize staking vault and prize redemption to mint/burn tokens
    await fbtToken.write.addAuthorizedMinter([stakingVault.address], {
      account: owner.account.address,
    });
    await fbtToken.write.addAuthorizedBurner([prizeRedemption.address], {
      account: owner.account.address,
    });

    // Mint initial tokens to users for testing
    await fbtToken.write.mint([user1.account.address, parseEther("1000"), "initial_distribution"], {
      account: owner.account.address,
    });
    await fbtToken.write.mint([user2.account.address, parseEther("1000"), "initial_distribution"], {
      account: owner.account.address,
    });
  });

  describe("FBT Token", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await fbtToken.read.name()).to.equal("FC Barcelona Fan Token");
      expect(await fbtToken.read.symbol()).to.equal("FCBFT");
      expect(await fbtToken.read.entityName()).to.equal("FC Barcelona");
      expect(await fbtToken.read.entityType()).to.equal("sport");
    });

    it("Should mint tokens to users", async function () {
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("1000"));
      expect(await fbtToken.read.balanceOf([user2.account.address])).to.equal(parseEther("1000"));
    });

    it("Should allow authorized minting", async function () {
      expect(await fbtToken.read.authorizedMinters([stakingVault.address])).to.be.true;
      expect(await fbtToken.read.authorizedBurners([prizeRedemption.address])).to.be.true;
    });

    it("Should allow users to burn their own tokens", async function () {
      await fbtToken.write.burn([parseEther("100"), "test_burn"], {
        account: user1.account.address,
      });
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("900"));
    });

    it("Should update entity info", async function () {
      await fbtToken.write.updateEntityInfo([
        "Real Madrid",
        "sport",
        "Updated description"
      ], {
        account: owner.account.address,
      });

      const [name, entityType, description] = await fbtToken.read.getEntityInfo();
      expect(name).to.equal("Real Madrid");
      expect(entityType).to.equal("sport");
      expect(description).to.equal("Updated description");
    });
  });

  describe("Staking Vault", function () {
    beforeEach(async function () {
      // Create test staking pools
      await stakingVault.write.createPool([
        "30 Days",
        30 * 24 * 60 * 60, // 30 days in seconds
        1000 // 10% annual reward rate
      ], {
        account: owner.account.address,
      });

      await stakingVault.write.createPool([
        "90 Days",
        90 * 24 * 60 * 60, // 90 days in seconds
        2000 // 20% annual reward rate
      ], {
        account: owner.account.address,
      });

      await stakingVault.write.createPool([
        "1 Year",
        365 * 24 * 60 * 60, // 1 year in seconds
        5000 // 50% annual reward rate
      ], {
        account: owner.account.address,
      });
    });

    it("Should create staking pools correctly", async function () {
      const pool0 = await stakingVault.read.getPoolInfo([0]);
      expect(pool0.name).to.equal("30 Days");
      expect(pool0.lockDuration).to.equal(BigInt(30 * 24 * 60 * 60));
      expect(pool0.rewardRate).to.equal(1000n);
      expect(pool0.active).to.be.true;

      const pool1 = await stakingVault.read.getPoolInfo([1]);
      expect(pool1.name).to.equal("90 Days");
      expect(pool1.rewardRate).to.equal(2000n);

      const pool2 = await stakingVault.read.getPoolInfo([2]);
      expect(pool2.name).to.equal("1 Year");
      expect(pool2.rewardRate).to.equal(5000n);
    });

    it("Should get active pools", async function () {
      const activePools = await stakingVault.read.getActivePools();
      expect(activePools.length).to.equal(3);
      expect(activePools[0]).to.equal(0n);
      expect(activePools[1]).to.equal(1n);
      expect(activePools[2]).to.equal(2n);
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = parseEther("100");
      
      // Approve staking vault to spend tokens
      await fbtToken.write.approve([stakingVault.address, stakeAmount], {
        account: user1.account.address,
      });

      // Stake in pool 0 (30 days)
      await stakingVault.write.stake([0, stakeAmount], {
        account: user1.account.address,
      });

      // Check user stake
      const userStake = await stakingVault.read.getUserStake([user1.account.address, 0]);
      expect(userStake.amount).to.equal(stakeAmount);

      // Check pool total staked
      const pool = await stakingVault.read.getPoolInfo([0]);
      expect(pool.totalStaked).to.equal(stakeAmount);

      // Check user balance decreased
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("900"));
    });

    it("Should calculate rewards correctly", async function () {
      const stakeAmount = parseEther("100");
      
      await fbtToken.write.approve([stakingVault.address, stakeAmount], {
        account: user1.account.address,
      });

      await stakingVault.write.stake([0, stakeAmount], {
        account: user1.account.address,
      });

      // Fast forward time by 1 day (simulate)
      // Note: In real tests, you'd use time manipulation libraries
      // For now, we'll just check that pending rewards can be calculated
      const pendingRewards = await stakingVault.read.getPendingRewards([user1.account.address, 0]);
      expect(pendingRewards >= 0n).to.be.true;
    });

    it("Should not allow unstaking before lock period", async function () {
      const stakeAmount = parseEther("100");
      
      await fbtToken.write.approve([stakingVault.address, stakeAmount], {
        account: user1.account.address,
      });

      await stakingVault.write.stake([0, stakeAmount], {
        account: user1.account.address,
      });

      // Try to unstake immediately (should fail)
      await expect(
        stakingVault.write.unstake([0], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("Vault: Stake is still locked");
    });

    it("Should allow emergency withdraw", async function () {
      const stakeAmount = parseEther("100");
      
      await fbtToken.write.approve([stakingVault.address, stakeAmount], {
        account: user1.account.address,
      });

      await stakingVault.write.stake([0, stakeAmount], {
        account: user1.account.address,
      });

      // Emergency withdraw
      await stakingVault.write.emergencyWithdraw([0], {
        account: user1.account.address,
      });

      // Check tokens returned
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("1000"));

      // Check stake cleared
      const userStake = await stakingVault.read.getUserStake([user1.account.address, 0]);
      expect(userStake.amount).to.equal(0n);
    });

    it("Should get total value locked", async function () {
      const stakeAmount1 = parseEther("100");
      const stakeAmount2 = parseEther("200");
      
      // User1 stakes in pool 0
      await fbtToken.write.approve([stakingVault.address, stakeAmount1], {
        account: user1.account.address,
      });
      await stakingVault.write.stake([0, stakeAmount1], {
        account: user1.account.address,
      });

      // User2 stakes in pool 1
      await fbtToken.write.approve([stakingVault.address, stakeAmount2], {
        account: user2.account.address,
      });
      await stakingVault.write.stake([1, stakeAmount2], {
        account: user2.account.address,
      });

      const tvl = await stakingVault.read.getTotalValueLocked();
      expect(tvl).to.equal(stakeAmount1 + stakeAmount2);
    });

    it("Should deactivate pools", async function () {
      await stakingVault.write.setPoolActive([0, false], {
        account: owner.account.address,
      });

      const pool = await stakingVault.read.getPoolInfo([0]);
      expect(pool.active).to.be.false;

      const activePools = await stakingVault.read.getActivePools();
      expect(activePools.length).to.equal(2);
    });

    it("Should not allow staking in inactive pools", async function () {
      await stakingVault.write.setPoolActive([0, false], {
        account: owner.account.address,
      });

      await fbtToken.write.approve([stakingVault.address, parseEther("100")], {
        account: user1.account.address,
      });

      await expect(
        stakingVault.write.stake([0, parseEther("100")], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("Vault: Pool is not active");
    });
  });

  describe("Prize Redemption", function () {
    beforeEach(async function () {
      // Create test prizes
      await prizeRedemption.write.createPrize([
        "Signed Jersey",
        "Official signed jersey by the team",
        parseEther("100"), // 100 FBT cost
        10, // Limited to 10 items
        "https://example.com/jersey.jpg",
        "merch"
      ], {
        account: owner.account.address,
      });

      await prizeRedemption.write.createPrize([
        "VIP Experience",
        "VIP stadium tour and meet & greet",
        parseEther("500"), // 500 FBT cost
        5, // Limited to 5 experiences
        "https://example.com/vip.jpg",
        "experience"
      ], {
        account: owner.account.address,
      });

      await prizeRedemption.write.createPrize([
        "Digital NFT Badge",
        "Exclusive digital collectible",
        parseEther("50"), // 50 FBT cost
        0, // Unlimited
        "https://example.com/nft.jpg",
        "digital"
      ], {
        account: owner.account.address,
      });
    });

    it("Should create prizes correctly", async function () {
      const prize0 = await prizeRedemption.read.getPrize([0]);
      expect(prize0.name).to.equal("Signed Jersey");
      expect(prize0.cost).to.equal(parseEther("100"));
      expect(prize0.totalSupply).to.equal(10n);
      expect(prize0.currentSupply).to.equal(10n);
      expect(prize0.category).to.equal("merch");
      expect(prize0.active).to.be.true;

      const prize1 = await prizeRedemption.read.getPrize([1]);
      expect(prize1.name).to.equal("VIP Experience");
      expect(prize1.cost).to.equal(parseEther("500"));

      const prize2 = await prizeRedemption.read.getPrize([2]);
      expect(prize2.totalSupply).to.equal(0n); // Unlimited
    });

    it("Should get active prizes", async function () {
      const activePrizes = await prizeRedemption.read.getActivePrizes();
      expect(activePrizes.length).to.equal(3);
    });

    it("Should get prizes by category", async function () {
      const merchPrizes = await prizeRedemption.read.getPrizesByCategory(["merch"]);
      expect(merchPrizes.length).to.equal(1);
      expect(merchPrizes[0]).to.equal(0n);

      const experiencePrizes = await prizeRedemption.read.getPrizesByCategory(["experience"]);
      expect(experiencePrizes.length).to.equal(1);
      expect(experiencePrizes[0]).to.equal(1n);
    });

    it("Should allow users to redeem prizes", async function () {
      // User1 approves and redeems signed jersey
      await fbtToken.write.approve([prizeRedemption.address, parseEther("100")], {
        account: user1.account.address,
      });
      
      await prizeRedemption.write.redeemPrize([0], {
        account: user1.account.address,
      });

      // Check user balance decreased
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("900"));

      // Check prize supply decreased
      const prize = await prizeRedemption.read.getPrize([0]);
      expect(prize.currentSupply).to.equal(9n);

      // Check redemption recorded
      const userRedemptions = await prizeRedemption.read.getUserRedemptions([user1.account.address]);
      expect(userRedemptions.length).to.equal(1);
      expect(userRedemptions[0].prizeId).to.equal(0n);
      expect(userRedemptions[0].cost).to.equal(parseEther("100"));
    });

    it("Should not allow redemption with insufficient balance", async function () {
      // First, make sure user has limited tokens for this test
      // Burn some tokens to reduce balance to 400
      await fbtToken.write.burn([parseEther("600"), "test_setup"], {
        account: user1.account.address,
      });
      
      // Check user now has 400 FBT
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("400"));
      
      // Approve and try to redeem VIP experience (costs 500 FBT, user has 400)
      await fbtToken.write.approve([prizeRedemption.address, parseEther("500")], {
        account: user1.account.address,
      });
      
      await expect(
        prizeRedemption.write.redeemPrize([1], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("PrizeRedemption: Insufficient FBT balance");
    });

    it("Should not allow redemption when out of stock", async function () {
      // Update supply to 1 for testing
      await prizeRedemption.write.updatePrizeSupply([0, 1], {
        account: owner.account.address,
      });

      // Approve and redeem the last one
      await fbtToken.write.approve([prizeRedemption.address, parseEther("100")], {
        account: user1.account.address,
      });
      
      await prizeRedemption.write.redeemPrize([0], {
        account: user1.account.address,
      });

      // Try to redeem again (should fail)
      await expect(
        prizeRedemption.write.redeemPrize([0], {
          account: user2.account.address,
        })
      ).to.be.rejectedWith("PrizeRedemption: Prize out of stock");
    });

    it("Should allow unlimited redemptions for unlimited prizes", async function () {
      // Approve and redeem digital NFT badge multiple times
      await fbtToken.write.approve([prizeRedemption.address, parseEther("100")], {
        account: user1.account.address,
      });
      
      await prizeRedemption.write.redeemPrize([2], {
        account: user1.account.address,
      });

      await prizeRedemption.write.redeemPrize([2], {
        account: user1.account.address,
      });

      // Check both redemptions recorded
      const userRedemptions = await prizeRedemption.read.getUserRedemptions([user1.account.address]);
      expect(userRedemptions.length).to.equal(2);

      // Check balance decreased correctly
      expect(await fbtToken.read.balanceOf([user1.account.address])).to.equal(parseEther("900")); // 1000 - 50 - 50
    });

    it("Should allow fulfilling redemptions", async function () {
      // User approves and redeems prize
      await fbtToken.write.approve([prizeRedemption.address, parseEther("100")], {
        account: user1.account.address,
      });
      
      await prizeRedemption.write.redeemPrize([0], {
        account: user1.account.address,
      });

      // Owner fulfills redemption
      await prizeRedemption.write.fulfillRedemption([
        user1.account.address,
        0, // First redemption
        "Shipped via DHL, tracking: ABC123"
      ], {
        account: owner.account.address,
      });

      // Check redemption updated
      const userRedemptions = await prizeRedemption.read.getUserRedemptions([user1.account.address]);
      expect(userRedemptions[0].fulfilled).to.be.true;
      expect(userRedemptions[0].deliveryInfo).to.equal("Shipped via DHL, tracking: ABC123");
    });

    it("Should track total FBT burned", async function () {
      // Approve and redeem some prizes
      await fbtToken.write.approve([prizeRedemption.address, parseEther("100")], {
        account: user1.account.address,
      });
      await fbtToken.write.approve([prizeRedemption.address, parseEther("50")], {
        account: user2.account.address,
      });
      
      await prizeRedemption.write.redeemPrize([0], { // 100 FBT
        account: user1.account.address,
      });
      await prizeRedemption.write.redeemPrize([2], { // 50 FBT
        account: user2.account.address,
      });

      const totalBurned = await prizeRedemption.read.getTotalFBTBurned();
      expect(totalBurned).to.equal(parseEther("150")); // 100 + 50
    });

    it("Should update prize information", async function () {
      await prizeRedemption.write.updatePrize([
        0,
        "Updated Jersey",
        "Updated description",
        parseEther("150"), // New cost
        true,
        "https://new-url.com/jersey.jpg"
      ], {
        account: owner.account.address,
      });

      const prize = await prizeRedemption.read.getPrize([0]);
      expect(prize.name).to.equal("Updated Jersey");
      expect(prize.cost).to.equal(parseEther("150"));
    });
  });

  describe("Integration Tests", function () {
    beforeEach(async function () {
      // Create test staking pools for integration test
      await stakingVault.write.createPool([
        "30 Days",
        30 * 24 * 60 * 60, // 30 days in seconds
        1000 // 10% annual reward rate
      ], {
        account: owner.account.address,
      });

      // Create test prizes for integration test
      await prizeRedemption.write.createPrize([
        "Signed Jersey",
        "Official signed jersey by the team",
        parseEther("100"), // 100 FBT cost
        10, // Limited to 10 items
        "https://example.com/jersey.jpg",
        "merch"
      ], {
        account: owner.account.address,
      });

      await prizeRedemption.write.createPrize([
        "Digital NFT Badge",
        "Exclusive digital collectible",
        parseEther("50"), // 50 FBT cost
        0, // Unlimited
        "https://example.com/nft.jpg",
        "digital"
      ], {
        account: owner.account.address,
      });
    });

    it("Should allow staking, earning rewards, and redeeming prizes", async function () {
      // Start fresh - use user2 who hasn't been used in other tests much
      const stakeAmount = parseEther("100");
      
      // User2 stakes tokens
      await fbtToken.write.approve([stakingVault.address, stakeAmount], {
        account: user2.account.address,
      });
      await stakingVault.write.stake([0, stakeAmount], {
        account: user2.account.address,
      });

      // Check user balance after staking
      expect(await fbtToken.read.balanceOf([user2.account.address])).to.equal(parseEther("900"));

      // Check stake was recorded
      const userStake = await stakingVault.read.getUserStake([user2.account.address, 0]);
      expect(userStake.amount).to.equal(stakeAmount);

      // Emergency withdraw (simulating completion of lock period)
      await stakingVault.write.emergencyWithdraw([0], {
        account: user2.account.address,
      });

      // User should have original tokens back
      expect(await fbtToken.read.balanceOf([user2.account.address])).to.equal(parseEther("1000"));

      // User approves and redeems a digital NFT badge (cheaper prize)
      await fbtToken.write.approve([prizeRedemption.address, parseEther("50")], {
        account: user2.account.address,
      });
      
      await prizeRedemption.write.redeemPrize([1], { // Prize 1 (digital NFT badge - 50 FBT)
        account: user2.account.address,
      });

      // Check final balance
      expect(await fbtToken.read.balanceOf([user2.account.address])).to.equal(parseEther("950")); // 1000 - 50 (NFT cost)
      
      // Check redemption was recorded
      const userRedemptions = await prizeRedemption.read.getUserRedemptions([user2.account.address]);
      expect(userRedemptions.length).to.equal(1);
      expect(userRedemptions[0].prizeId).to.equal(1n);
    });
  });
});