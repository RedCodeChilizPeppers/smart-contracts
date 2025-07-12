import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { parseEther, zeroAddress } from "viem";
import hre from "hardhat";

describe("Uniswap V2 Pair Tests", function () {
  let mockCAP20: any;
  let mockWCHZ: any;
  let factory: any;
  let router: any;
  let pair: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await hre.viem.getWalletClients();

    // Deploy tokens
    mockCAP20 = await hre.viem.deployContract("MockCAP20");
    mockWCHZ = await hre.viem.deployContract("MockWCHZ");

    // Deploy factory with WCHZ address
    factory = await hre.viem.deployContract("UniswapV2Factory", [owner.account.address, mockWCHZ.address]);

    // Deploy router
    router = await hre.viem.deployContract("UniswapV2Router02", [factory.address]);

    // Mint tokens to users for testing
    await mockCAP20.write.mint([user1.account.address, parseEther("1000")], {
      account: owner.account.address,
    });
    await mockWCHZ.write.mint([user1.account.address, parseEther("1000")], {
      account: owner.account.address,
    });
    await mockCAP20.write.mint([user2.account.address, parseEther("1000")], {
      account: owner.account.address,
    });
    await mockWCHZ.write.mint([user2.account.address, parseEther("1000")], {
      account: owner.account.address,
    });
  });

  describe("Deployment", function () {
    it("Should deploy all contracts correctly", async function () {
      expect(await mockCAP20.read.name()).to.equal("Mock CAP20");
      expect(await mockWCHZ.read.name()).to.equal("Mock WCHZ");
      const feeToSetter = await factory.read.feeToSetter();
      expect(feeToSetter.toLowerCase()).to.equal(owner.account.address.toLowerCase());
      const wchzAddress = await factory.read.WCHZ();
      expect(wchzAddress.toLowerCase()).to.equal(mockWCHZ.address.toLowerCase());
      const factoryAddress = await router.read.factory();
      expect(factoryAddress.toLowerCase()).to.equal(factory.address.toLowerCase());
    });

    it("Should have correct token balances after minting", async function () {
      expect(await mockCAP20.read.balanceOf([user1.account.address])).to.equal(parseEther("1000"));
      expect(await mockWCHZ.read.balanceOf([user1.account.address])).to.equal(parseEther("1000"));
    });
  });

  describe("Pair Creation", function () {
    it("Should create a pair for CAP20-WCHZ", async function () {
      const tx = await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });

      // Get the pair address
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      expect(pairAddress).to.not.equal(zeroAddress);

      // Verify pair was created
      const pairContract = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);

      const expectedToken0 = mockCAP20.address.toLowerCase() < mockWCHZ.address.toLowerCase()
        ? mockCAP20.address
        : mockWCHZ.address;
        const expectedToken1 = mockCAP20.address.toLowerCase() < mockWCHZ.address.toLowerCase()
        ? mockWCHZ.address
        : mockCAP20.address;

      const token0 = await pairContract.read.token0();
      const token1 = await pairContract.read.token1();
      
      expect(token0.toLowerCase()).to.equal(expectedToken0.toLowerCase());
      expect(token1.toLowerCase()).to.equal(expectedToken1.toLowerCase());
      const factoryAddress = await pairContract.read.factory();
      expect(factoryAddress.toLowerCase()).to.equal(factory.address.toLowerCase());
    });

    it("Should not create pair with identical addresses", async function () {
      await expect(
        factory.write.createPair([mockWCHZ.address, mockWCHZ.address], {
          account: owner.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: IDENTICAL_ADDRESSES");
    });

    it("Should not create pair with zero address", async function () {
      await expect(
        factory.write.createPair([zeroAddress, mockWCHZ.address], {
          account: owner.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: ZERO_ADDRESS");
    });

    it("Should not create duplicate pair", async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      await expect(
        factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
          account: owner.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: PAIR_EXISTS");
    });

    it("Should create pair regardless of token order", async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      const pairAddress1 = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      const pairAddress2 = await factory.read.getPair([mockWCHZ.address, mockCAP20.address]);
      
      expect(pairAddress1).to.equal(pairAddress2);
    });

    it("Should enforce WCHZ as second token", async function () {
      // This should work
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      // This should fail because second token is not WCHZ
      await expect(
        factory.write.createPair([mockWCHZ.address, mockCAP20.address], {
          account: owner.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: TOKENB_MUST_BE_WCHZ");
    });
  });

  describe("Pair Initialization", function () {
    beforeEach(async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);
    });

    it("Should initialize pair with correct tokens", async function () {
      const token0 = await pair.read.token0();
      const token1 = await pair.read.token1();
      const expectedToken0 = mockCAP20.address.toLowerCase() < mockWCHZ.address.toLowerCase()
        ? mockCAP20.address
        : mockWCHZ.address;
        const expectedToken1 = mockCAP20.address.toLowerCase() < mockWCHZ.address.toLowerCase()
        ? mockWCHZ.address
        : mockCAP20.address;
      expect(token0.toLowerCase()).to.equal(expectedToken0.toLowerCase());
      expect(token1.toLowerCase()).to.equal(expectedToken1.toLowerCase());
      const factoryAddress = await pair.read.factory();
      expect(factoryAddress.toLowerCase()).to.equal(factory.address.toLowerCase());
    });

    it("Should have zero reserves initially", async function () {
      const [reserve0, reserve1] = await pair.read.getReserves();
      expect(reserve0).to.equal(0n);
      expect(reserve1).to.equal(0n);
    });

    it("Should have correct pair name and symbol", async function () {
      expect(await pair.read.name()).to.equal("Uniswap V2");
      expect(await pair.read.symbol()).to.equal("UNI-V2");
      expect(await pair.read.decimals()).to.equal(18);
    });
  });

  describe("Factory Management", function () {
    it("Should allow feeToSetter to change feeTo", async function () {
      await factory.write.setFeeTo([user1.account.address], {
        account: owner.account.address,
      });
      const feeTo = await factory.read.feeTo();
      expect(feeTo.toLowerCase()).to.equal(user1.account.address.toLowerCase());
    });

    it("Should allow feeToSetter to change feeToSetter", async function () {
      await factory.write.setFeeToSetter([user1.account.address], {
        account: owner.account.address,
      });
      const feeToSetter = await factory.read.feeToSetter();
      expect(feeToSetter.toLowerCase()).to.equal(user1.account.address.toLowerCase());
    });

    it("Should not allow non-feeToSetter to change feeTo", async function () {
      await expect(
        factory.write.setFeeTo([user2.account.address], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: FORBIDDEN");
    });

    it("Should not allow non-feeToSetter to change feeToSetter", async function () {
      await expect(
        factory.write.setFeeToSetter([user2.account.address], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: FORBIDDEN");
    });

    it("Should track all pairs correctly", async function () {
      expect(await factory.read.allPairsLength()).to.equal(0n);
      
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      expect(await factory.read.allPairsLength()).to.equal(1n);
      const pairAddress = await factory.read.allPairs([0n]);
      expect(pairAddress).to.not.equal(zeroAddress);
    });
  });

  describe("Token Ordering", function () {
    it("Should order tokens correctly (CAP20 < WCHZ)", async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      const pairContract = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);
      
      const token0 = await pairContract.read.token0();
      const token1 = await pairContract.read.token1();
      
      // Since CAP20 address < WCHZ address, CAP20 should be token0
      if (mockCAP20.address.toLowerCase() < mockWCHZ.address.toLowerCase()) {
        expect(token0.toLowerCase()).to.equal(mockCAP20.address.toLowerCase());
        expect(token1.toLowerCase()).to.equal(mockWCHZ.address.toLowerCase());
      } else {
        expect(token0.toLowerCase()).to.equal(mockWCHZ.address.toLowerCase());
        expect(token1.toLowerCase()).to.equal(mockCAP20.address.toLowerCase());
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle pair creation with different token combinations", async function () {
      // Create a new token for testing
      const mockToken = await hre.viem.deployContract("MockCAP20");
      
      await factory.write.createPair([mockToken.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      const pairAddress = await factory.read.getPair([mockToken.address, mockWCHZ.address]);
      expect(pairAddress).to.not.equal(zeroAddress);
    });

    it("Should maintain correct pair mapping", async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      const pairAddress1 = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      const pairAddress2 = await factory.read.getPairWithWCHZ([mockCAP20.address]);
      
      expect(pairAddress1).to.equal(pairAddress2);
    });
  });

  describe("Integration Tests", function () {
    it("Should allow token transfers to pair contract", async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      
      // Transfer tokens to pair
      await mockCAP20.write.transfer([pairAddress, parseEther("100")], {
        account: user1.account.address,
      });
      await mockWCHZ.write.transfer([pairAddress, parseEther("100")], {
        account: user1.account.address,
      });
      
      expect(await mockCAP20.read.balanceOf([pairAddress])).to.equal(parseEther("100"));
      expect(await mockWCHZ.read.balanceOf([pairAddress])).to.equal(parseEther("100"));
    });

    it("Should maintain correct token balances after transfers", async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      
      const initialBalance = await mockCAP20.read.balanceOf([user1.account.address]);
      await mockCAP20.write.transfer([pairAddress, parseEther("50")], {
        account: user1.account.address,
      });
      const finalBalance = await mockCAP20.read.balanceOf([user1.account.address]);
      
      expect(finalBalance).to.equal(initialBalance - parseEther("50"));
    });
  });
}); 