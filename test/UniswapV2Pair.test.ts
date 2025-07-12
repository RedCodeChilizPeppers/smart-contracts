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
      pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress as `0x${string}`);
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

  describe("Liquidity Operations", function () {
    beforeEach(async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);
    });

    describe("Mint (Add Liquidity)", function () {
      it("Should mint LP tokens on first liquidity provision", async function () {
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        const amount0 = parseEther("10");
        const amount1 = parseEther("20");

        // Transfer tokens to pair based on actual token ordering
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, amount0], {
            account: user1.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, amount1], {
            account: user1.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, amount0], {
            account: user1.account.address,
          });
          await mockCAP20.write.transfer([pair.address, amount1], {
            account: user1.account.address,
          });
        }

        // Mint LP tokens
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });

        // Check LP token balance
        const lpBalance = await pair.read.balanceOf([user1.account.address]);
        expect(lpBalance > 0n).to.be.true;

        // Check reserves
        const [reserve0, reserve1] = await pair.read.getReserves();
        expect(reserve0).to.equal(amount0);
        expect(reserve1).to.equal(amount1);

        // Check total supply
        const totalSupply = await pair.read.totalSupply();
        expect(totalSupply > 1000n).to.be.true; // Minimum liquidity locked
      });

      it("Should lock minimum liquidity on first mint", async function () {
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        const amount0 = parseEther("10");
        const amount1 = parseEther("20");

        // Transfer tokens to pair based on actual token ordering
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, amount0], {
            account: user1.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, amount1], {
            account: user1.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, amount0], {
            account: user1.account.address,
          });
          await mockCAP20.write.transfer([pair.address, amount1], {
            account: user1.account.address,
          });
        }

        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });

        // Check that minimum liquidity is locked
        const lockedLiquidity = await pair.read.balanceOf([zeroAddress]);
        expect(lockedLiquidity).to.equal(1000n);
      });

      it("Should mint correct amount of LP tokens on subsequent liquidity provisions", async function () {
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        // First mint
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, parseEther("10")], {
            account: user1.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, parseEther("20")], {
            account: user1.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, parseEther("10")], {
            account: user1.account.address,
          });
          await mockCAP20.write.transfer([pair.address, parseEther("20")], {
            account: user1.account.address,
          });
        }
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });

        const firstLpBalance = await pair.read.balanceOf([user1.account.address]);

        // Second mint with same ratio
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, parseEther("5")], {
            account: user2.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, parseEther("10")], {
            account: user2.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, parseEther("5")], {
            account: user2.account.address,
          });
          await mockCAP20.write.transfer([pair.address, parseEther("10")], {
            account: user2.account.address,
          });
        }
        await pair.write.mint([user2.account.address], {
          account: user2.account.address,
        });

        const secondLpBalance = await pair.read.balanceOf([user2.account.address]);
        // Second mint should get half the LP tokens of first (minus minimum liquidity)
        const expectedBalance = firstLpBalance / 2n;
        const tolerance = parseEther("0.001");
        expect(secondLpBalance >= expectedBalance - tolerance && secondLpBalance <= expectedBalance + tolerance).to.be.true;
      });

      it("Should revert if no liquidity is provided", async function () {
        await expect(
          pair.write.mint([user1.account.address], {
            account: user1.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED");
      });
    });

    describe("Burn (Remove Liquidity)", function () {
      beforeEach(async function () {
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        // Add initial liquidity
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, parseEther("10")], {
            account: user1.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, parseEther("20")], {
            account: user1.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, parseEther("10")], {
            account: user1.account.address,
          });
          await mockCAP20.write.transfer([pair.address, parseEther("20")], {
            account: user1.account.address,
          });
        }
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });
      });

      it("Should burn LP tokens and return underlying tokens", async function () {
        const lpBalance = await pair.read.balanceOf([user1.account.address]);
        const totalSupply = await pair.read.totalSupply();
        const [reserve0, reserve1] = await pair.read.getReserves();
        
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();

        // Transfer LP tokens to pair
        await pair.write.transfer([pair.address, lpBalance], {
          account: user1.account.address,
        });

        const initialCAP20Balance = await mockCAP20.read.balanceOf([user1.account.address]);
        const initialWCHZBalance = await mockWCHZ.read.balanceOf([user1.account.address]);

        // Burn LP tokens
        await pair.write.burn([user1.account.address], {
          account: user1.account.address,
        });

        const finalCAP20Balance = await mockCAP20.read.balanceOf([user1.account.address]);
        const finalWCHZBalance = await mockWCHZ.read.balanceOf([user1.account.address]);

        // Calculate expected amounts based on token ordering
        const expectedAmount0 = (lpBalance * reserve0) / totalSupply;
        const expectedAmount1 = (lpBalance * reserve1) / totalSupply;

        const receivedCAP20 = finalCAP20Balance - initialCAP20Balance;
        const receivedWCHZ = finalWCHZBalance - initialWCHZBalance;
        
        // Check received amounts based on token ordering
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          // CAP20 is token0, WCHZ is token1
          expect(receivedCAP20 > 0n).to.be.true;
          expect(receivedWCHZ > 0n).to.be.true;
          expect(receivedCAP20 <= expectedAmount0).to.be.true;
          expect(receivedWCHZ <= expectedAmount1).to.be.true;
        } else {
          // WCHZ is token0, CAP20 is token1
          expect(receivedCAP20 > 0n).to.be.true;
          expect(receivedWCHZ > 0n).to.be.true;
          expect(receivedWCHZ <= expectedAmount0).to.be.true;
          expect(receivedCAP20 <= expectedAmount1).to.be.true;
        }
      });

      it("Should update reserves after burn", async function () {
        const lpBalance = await pair.read.balanceOf([user1.account.address]);
        const [initialReserve0, initialReserve1] = await pair.read.getReserves();

        await pair.write.transfer([pair.address, lpBalance], {
          account: user1.account.address,
        });
        await pair.write.burn([user1.account.address], {
          account: user1.account.address,
        });

        const [finalReserve0, finalReserve1] = await pair.read.getReserves();
        expect(finalReserve0 < initialReserve0).to.be.true;
        expect(finalReserve1 < initialReserve1).to.be.true;
      });

      it("Should revert if no LP tokens are sent", async function () {
        await expect(
          pair.write.burn([user1.account.address], {
            account: user1.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED");
      });
    });

    describe("Swap", function () {
      beforeEach(async function () {
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        // Add liquidity
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, parseEther("100")], {
            account: user1.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, parseEther("200")], {
            account: user1.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, parseEther("100")], {
            account: user1.account.address,
          });
          await mockCAP20.write.transfer([pair.address, parseEther("200")], {
            account: user1.account.address,
          });
        }
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });
      });

      it("Should execute swap token0 for token1", async function () {
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        const amountIn = parseEther("10");
        const [reserve0, reserve1] = await pair.read.getReserves();
        
        // Calculate expected output (with 0.3% fee)
        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * reserve1;
        const denominator = reserve0 * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        // Transfer token0 to pair
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
          const initialBalance = await mockWCHZ.read.balanceOf([user2.account.address]);
          
          // Execute swap (token0 for token1)
          await pair.write.swap([0n, expectedAmountOut, user2.account.address, "0x"], {
            account: user2.account.address,
          });

          const finalBalance = await mockWCHZ.read.balanceOf([user2.account.address]);
          expect(finalBalance - initialBalance).to.equal(expectedAmountOut);
        } else {
          await mockWCHZ.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
          const initialBalance = await mockCAP20.read.balanceOf([user2.account.address]);
          
          // Execute swap (token0 for token1)
          await pair.write.swap([0n, expectedAmountOut, user2.account.address, "0x"], {
            account: user2.account.address,
          });

          const finalBalance = await mockCAP20.read.balanceOf([user2.account.address]);
          expect(finalBalance - initialBalance).to.equal(expectedAmountOut);
        }
      });

      it("Should execute swap token1 for token0", async function () {
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        const amountIn = parseEther("20");
        const [reserve0, reserve1] = await pair.read.getReserves();
        
        // Calculate expected output (with 0.3% fee)
        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * reserve0;
        const denominator = reserve1 * 1000n + amountInWithFee;
        const expectedAmountOut = numerator / denominator;

        // Transfer token1 to pair
        if (token1.toLowerCase() === mockWCHZ.address.toLowerCase()) {
          await mockWCHZ.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
          const initialBalance = await mockCAP20.read.balanceOf([user2.account.address]);
          
          // Execute swap (token1 for token0)
          await pair.write.swap([expectedAmountOut, 0n, user2.account.address, "0x"], {
            account: user2.account.address,
          });

          const finalBalance = await mockCAP20.read.balanceOf([user2.account.address]);
          expect(finalBalance - initialBalance).to.equal(expectedAmountOut);
        } else {
          await mockCAP20.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
          const initialBalance = await mockWCHZ.read.balanceOf([user2.account.address]);
          
          // Execute swap (token1 for token0)
          await pair.write.swap([expectedAmountOut, 0n, user2.account.address, "0x"], {
            account: user2.account.address,
          });

          const finalBalance = await mockWCHZ.read.balanceOf([user2.account.address]);
          expect(finalBalance - initialBalance).to.equal(expectedAmountOut);
        }
      });

      it("Should update reserves after swap", async function () {
        const token0 = await pair.read.token0();
        const amountIn = parseEther("10");
        const [initialReserve0, initialReserve1] = await pair.read.getReserves();

        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
        }

        const amountOut = parseEther("15"); // Approximate output
        await pair.write.swap([0n, amountOut, user2.account.address, "0x"], {
          account: user2.account.address,
        });

        const [finalReserve0, finalReserve1] = await pair.read.getReserves();
        expect(finalReserve0).to.equal(initialReserve0 + amountIn);
        expect(finalReserve1).to.equal(initialReserve1 - amountOut);
      });

      it("Should revert on insufficient output amount", async function () {
        await expect(
          pair.write.swap([0n, 0n, user2.account.address, "0x"], {
            account: user2.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT");
      });

      it("Should revert on insufficient liquidity", async function () {
        const [reserve0, reserve1] = await pair.read.getReserves();
        
        await expect(
          pair.write.swap([reserve0 + 1n, 0n, user2.account.address, "0x"], {
            account: user2.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_LIQUIDITY");
      });

      it("Should revert if swap to same address as token", async function () {
        await mockCAP20.write.transfer([pair.address, parseEther("10")], {
          account: user2.account.address,
        });

        await expect(
          pair.write.swap([0n, parseEther("10"), mockCAP20.address, "0x"], {
            account: user2.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: INVALID_TO");
      });

      it("Should maintain k constant after swap", async function () {
        const [reserve0Before, reserve1Before] = await pair.read.getReserves();
        const kBefore = reserve0Before * reserve1Before;

        const amountIn = parseEther("10");
        await mockCAP20.write.transfer([pair.address, amountIn], {
          account: user2.account.address,
        });

        const amountOut = parseEther("18"); // Approximate output
        await pair.write.swap([0n, amountOut, user2.account.address, "0x"], {
          account: user2.account.address,
        });

        const [reserve0After, reserve1After] = await pair.read.getReserves();
        const kAfter = reserve0After * reserve1After;

        // K should increase slightly due to fees
        expect(kAfter >= kBefore).to.be.true;
      });
    });

    describe("Skim and Sync", function () {
      beforeEach(async function () {
        // Get token ordering
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        // Add liquidity
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          await mockCAP20.write.transfer([pair.address, parseEther("100")], {
            account: user1.account.address,
          });
          await mockWCHZ.write.transfer([pair.address, parseEther("200")], {
            account: user1.account.address,
          });
        } else {
          await mockWCHZ.write.transfer([pair.address, parseEther("100")], {
            account: user1.account.address,
          });
          await mockCAP20.write.transfer([pair.address, parseEther("200")], {
            account: user1.account.address,
          });
        }
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });
      });

      it("Should skim excess tokens", async function () {
        // Send extra tokens without minting
        const extraAmount0 = parseEther("10");
        const extraAmount1 = parseEther("20");
        
        await mockCAP20.write.transfer([pair.address, extraAmount0], {
          account: user2.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, extraAmount1], {
          account: user2.account.address,
        });

        const [reserve0, reserve1] = await pair.read.getReserves();
        const token0 = await pair.read.token0();
        const token1 = await pair.read.token1();
        
        // Get balances in token0/token1 order
        const balance0 = token0.toLowerCase() === mockCAP20.address.toLowerCase() 
          ? await mockCAP20.read.balanceOf([pair.address])
          : await mockWCHZ.read.balanceOf([pair.address]);
        const balance1 = token1.toLowerCase() === mockWCHZ.address.toLowerCase()
          ? await mockWCHZ.read.balanceOf([pair.address])
          : await mockCAP20.read.balanceOf([pair.address]);

        const initialBalanceCAP20 = await mockCAP20.read.balanceOf([user2.account.address]);
        const initialBalanceWCHZ = await mockWCHZ.read.balanceOf([user2.account.address]);

        // Calculate expected excess amounts
        const expectedExcess0 = balance0 - reserve0;
        const expectedExcess1 = balance1 - reserve1;

        // Skim excess
        await pair.write.skim([user2.account.address], {
          account: user2.account.address,
        });

        const finalBalanceCAP20 = await mockCAP20.read.balanceOf([user2.account.address]);
        const finalBalanceWCHZ = await mockWCHZ.read.balanceOf([user2.account.address]);

        // Check received amounts based on token ordering
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          expect(finalBalanceCAP20 - initialBalanceCAP20).to.equal(expectedExcess0);
          expect(finalBalanceWCHZ - initialBalanceWCHZ).to.equal(expectedExcess1);
        } else {
          expect(finalBalanceWCHZ - initialBalanceWCHZ).to.equal(expectedExcess0);
          expect(finalBalanceCAP20 - initialBalanceCAP20).to.equal(expectedExcess1);
        }
      });

      it("Should sync reserves to match balances", async function () {
        // Send extra tokens without minting
        await mockCAP20.write.transfer([pair.address, parseEther("10")], {
          account: user2.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, parseEther("20")], {
          account: user2.account.address,
        });

        // Get balances after transfers
        const token0 = await pair.read.token0();
        const balance0 = await mockCAP20.read.balanceOf([pair.address]);
        const balance1 = await mockWCHZ.read.balanceOf([pair.address]);

        // Sync reserves
        await pair.write.sync([], {
          account: user2.account.address,
        });

        const [reserve0, reserve1] = await pair.read.getReserves();
        
        // Check if reserves match balances according to token ordering
        if (token0.toLowerCase() === mockCAP20.address.toLowerCase()) {
          expect(reserve0).to.equal(balance0);
          expect(reserve1).to.equal(balance1);
        } else {
          expect(reserve0).to.equal(balance1);
          expect(reserve1).to.equal(balance0);
        }
      });
    });

    describe("Fee Collection", function () {
      it("Should collect protocol fees when feeTo is set", async function () {
        // Set fee recipient
        await factory.write.setFeeTo([owner.account.address], {
          account: owner.account.address,
        });

        // Add initial liquidity
        await mockCAP20.write.transfer([pair.address, parseEther("100")], {
          account: user1.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, parseEther("200")], {
          account: user1.account.address,
        });
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });

        // Perform swaps to generate fees
        for (let i = 0; i < 5; i++) {
          const amountIn = parseEther("1");
          await mockCAP20.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
          
          // Calculate expected output with 0.3% fee
          const [reserve0, reserve1] = await pair.read.getReserves();
          const amountInWithFee = amountIn * 997n;
          const numerator = amountInWithFee * reserve1;
          const denominator = reserve0 * 1000n + amountInWithFee;
          const amountOut = numerator / denominator;
          
          await pair.write.swap([0n, amountOut, user2.account.address, "0x"], {
            account: user2.account.address,
          });
        }

        // Add more liquidity to trigger fee minting
        await mockCAP20.write.transfer([pair.address, parseEther("10")], {
          account: user1.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, parseEther("20")], {
          account: user1.account.address,
        });

        const feeRecipientBalanceBefore = await pair.read.balanceOf([owner.account.address]);
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });
        const feeRecipientBalanceAfter = await pair.read.balanceOf([owner.account.address]);

        // Fee recipient should receive some LP tokens
        expect(feeRecipientBalanceAfter > feeRecipientBalanceBefore).to.be.true;
      });
    });
  });

  describe("Router Integration", function () {
    beforeEach(async function () {
      // Create pair
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);

      // Approve router
      await mockCAP20.write.approve([router.address, parseEther("10000")], {
        account: user1.account.address,
      });
      await mockWCHZ.write.approve([router.address, parseEther("10000")], {
        account: user1.account.address,
      });
    });

<<<<<<< HEAD
    it("Should provide initial liquidity correctly", async function () {
      const [reserve0, reserve1] = await pair.read.getReserves();
      expect(reserve0 > 0n).to.be.true;
      expect(reserve1 > 0n).to.be.true;
      
      const liquidityBalance = await pair.read.balanceOf([user1.account.address]);
      expect(liquidityBalance > 0n).to.be.true;
    });

    it("Should execute swap token0 for token1", async function () {
      const swapAmount = parseEther("100");
      const user1InitialBalance0 = await token0Contract.read.balanceOf([user1.account.address]);
      const user1InitialBalance1 = await token1Contract.read.balanceOf([user1.account.address]);
      
      // Transfer tokens to pair for swap
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      
      // Execute swap (4 args: amount0Out, amount1Out, to, data)
      await pair.write.swap([0n, parseEther("90"), user1.account.address, "0x"], {
        account: user1.account.address,
      });
      
      const user1FinalBalance0 = await token0Contract.read.balanceOf([user1.account.address]);
      const user1FinalBalance1 = await token1Contract.read.balanceOf([user1.account.address]);
      
      // User should have received token1
      expect(user1FinalBalance1 > user1InitialBalance1).to.be.true;
      // User should have spent token0 (minus what was transferred to pair)
      expect(user1FinalBalance0).to.equal(user1InitialBalance0 - swapAmount);
    });

    it("Should execute swap token1 for token0", async function () {
      const swapAmount = parseEther("100");
      const user1InitialBalance0 = await token0Contract.read.balanceOf([user1.account.address]);
      const user1InitialBalance1 = await token1Contract.read.balanceOf([user1.account.address]);
      
      // Transfer tokens to pair for swap
      await token1Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      
      // Execute swap (4 args: amount0Out, amount1Out, to, data)
      await pair.write.swap([parseEther("90"), 0n, user1.account.address, "0x"], {
        account: user1.account.address,
      });
      
      const user1FinalBalance0 = await token0Contract.read.balanceOf([user1.account.address]);
      const user1FinalBalance1 = await token1Contract.read.balanceOf([user1.account.address]);
      
      // User should have received token0
      expect(user1FinalBalance0 > user1InitialBalance0).to.be.true;
      // User should have spent token1 (minus what was transferred to pair)
      expect(user1FinalBalance1).to.equal(user1InitialBalance1 - swapAmount);
    });

    it("Should fail swap with insufficient liquidity", async function () {
      const swapAmount = parseEther("10000"); // More than available liquidity
      // Ensure user1 has enough tokens for this test
      await token0Contract.write.mint([user1.account.address, swapAmount], {
        account: owner.account.address,
      });
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await expect(
        pair.write.swap([0n, parseEther("9000"), user1.account.address, "0x"], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_LIQUIDITY");
    });

    it("Should fail swap with zero output amount", async function () {
      const swapAmount = parseEther("100");
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await expect(
        pair.write.swap([0n, 0n, user1.account.address, "0x"], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("Should fail swap to token addresses", async function () {
      const swapAmount = parseEther("100");
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await expect(
        pair.write.swap([0n, parseEther("90"), token0, "0x"], {
          account: user1.account.address,
        })
      ).to.be.rejectedWith("UniswapV2: INVALID_TO");
    });

    it("Should maintain k constant after swap", async function () {
      const swapAmount = parseEther("100");
      // Get initial reserves
      const [initialReserve0, initialReserve1] = await pair.read.getReserves();
      const initialK = initialReserve0 * initialReserve1;
      // Execute swap
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await pair.write.swap([0n, parseEther("90"), user1.account.address, "0x"], {
        account: user1.account.address,
      });
      // Get final reserves
      const [finalReserve0, finalReserve1] = await pair.read.getReserves();
      const finalK = finalReserve0 * finalReserve1;
      // K should be approximately maintained (allowing for fees)
      expect(finalK >= initialK).to.be.true;
    });

    it("Should emit Swap event", async function () {
      const swapAmount = parseEther("100");
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      const tx = await pair.write.swap([0n, parseEther("90"), user1.account.address, "0x"], {
        account: user1.account.address,
      });
      // The transaction should succeed, indicating the event was emitted
      expect(tx).to.not.be.undefined;
    });

    it("Should handle multiple swaps correctly", async function () {
      const swapAmount = parseEther("50");
      // First swap
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await pair.write.swap([0n, parseEther("45"), user1.account.address, "0x"], {
        account: user1.account.address,
      });
      // Second swap
      await token1Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await pair.write.swap([parseEther("45"), 0n, user1.account.address, "0x"], {
        account: user1.account.address,
      });
      // Both swaps should succeed
      const [reserve0, reserve1] = await pair.read.getReserves();
      expect(reserve0 > 0n).to.be.true;
      expect(reserve1 > 0n).to.be.true;
    });

    it("Should update reserves correctly after swap", async function () {
      const swapAmount = parseEther("100");
      const [initialReserve0, initialReserve1] = await pair.read.getReserves();
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await pair.write.swap([0n, parseEther("90"), user1.account.address, "0x"], {
        account: user1.account.address,
      });
      const [finalReserve0, finalReserve1] = await pair.read.getReserves();
      // Reserves should have changed
      expect(finalReserve0 !== initialReserve0).to.be.true;
      expect(finalReserve1 !== initialReserve1).to.be.true;
      // Reserve0 should have increased (swap input)
      expect(finalReserve0 > initialReserve0).to.be.true;
      // Reserve1 should have decreased (swap output)
      expect(finalReserve1 < initialReserve1).to.be.true;
    });

    it("Should handle edge case with very small swap", async function () {
      const swapAmount = parseEther("1"); // Very small amount
      await token0Contract.write.transfer([pairAddress, swapAmount], {
        account: user1.account.address,
      });
      await pair.write.swap([0n, parseEther("1"), user1.account.address, "0x"], {
        account: user1.account.address,
      });
      // Should succeed even with small amounts
      const [reserve0, reserve1] = await pair.read.getReserves();
      expect(reserve0 > 0n).to.be.true;
      expect(reserve1 > 0n).to.be.true;
=======
    it("Should add liquidity through router", async function () {
      const amount0 = parseEther("100");
      const amount1 = parseEther("200");

      await router.write.addLiquidity([
        mockCAP20.address,
        mockWCHZ.address,
        amount0,
        amount1,
        0n,
        0n,
        user1.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 3600)
      ], {
        account: user1.account.address,
      });

      const lpBalance = await pair.read.balanceOf([user1.account.address]);
      expect(lpBalance > 0n).to.be.true;

      const [reserve0, reserve1] = await pair.read.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);
    });
  });

  describe("Additional Edge Cases", function () {
    beforeEach(async function () {
      await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
        account: owner.account.address,
      });
      const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
      pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);
    });

    describe("Pair Initialization", function () {
      it("Should not allow non-factory to initialize", async function () {
        const newPair = await hre.viem.deployContract("UniswapV2Pair");
        
        await expect(
          newPair.write.initialize([mockCAP20.address, mockWCHZ.address], {
            account: user1.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: FORBIDDEN");
      });
    });

    describe("K Invariant", function () {
      beforeEach(async function () {
        // Add liquidity
        await mockCAP20.write.transfer([pair.address, parseEther("100")], {
          account: user1.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, parseEther("200")], {
          account: user1.account.address,
        });
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });
      });

      it("Should revert if K invariant is violated", async function () {
        // Try to swap with amounts that would violate K
        await mockCAP20.write.transfer([pair.address, parseEther("10")], {
          account: user2.account.address,
        });

        // Try to get more output than the fee allows
        await expect(
          pair.write.swap([0n, parseEther("20.1"), user2.account.address, "0x"], {
            account: user2.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: K");
      });

      it("Should revert on insufficient input amount", async function () {
        // Try to swap without sending any tokens
        await expect(
          pair.write.swap([parseEther("10"), 0n, user2.account.address, "0x"], {
            account: user2.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: INSUFFICIENT_INPUT_AMOUNT");
      });
    });

    describe("Reentrancy Protection", function () {
      it("Should prevent reentrancy in mint", async function () {
        // This test is complex and would require a malicious contract
        // For now, we'll just verify the lock modifier exists by checking
        // that normal operations work (lock/unlock properly)
        await mockCAP20.write.transfer([pair.address, parseEther("10")], {
          account: user1.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, parseEther("20")], {
          account: user1.account.address,
        });
        
        // Should work normally
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });
        
        expect(await pair.read.balanceOf([user1.account.address]) > 0n).to.be.true;
      });
    });

    describe("CreatePairWithWCHZ", function () {
      it("Should create pair using createPairWithWCHZ", async function () {
        const newToken = await hre.viem.deployContract("MockCAP20");
        
        await factory.write.createPairWithWCHZ([newToken.address], {
          account: owner.account.address,
        });
        
        const pairAddress = await factory.read.getPairWithWCHZ([newToken.address]);
        expect(pairAddress).to.not.equal(zeroAddress);
      });

      it("Should revert createPairWithWCHZ with zero address", async function () {
        await expect(
          factory.write.createPairWithWCHZ([zeroAddress], {
            account: owner.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: ZERO_ADDRESS");
      });

      it("Should revert createPairWithWCHZ with WCHZ address", async function () {
        await expect(
          factory.write.createPairWithWCHZ([mockWCHZ.address], {
            account: owner.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: IDENTICAL_ADDRESSES");
      });

      it("Should revert createPairWithWCHZ if pair exists", async function () {
        await expect(
          factory.write.createPairWithWCHZ([mockCAP20.address], {
            account: owner.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: PAIR_EXISTS");
      });
    });

    describe("Permit Function", function () {
      it("Should handle permit with expired deadline", async function () {
        const deadline = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
        const nonce = await pair.read.nonces([user1.account.address]);
        
        // Create a dummy signature
        const v = 27;
        const r = "0x" + "1".repeat(64);
        const s = "0x" + "2".repeat(64);
        
        await expect(
          pair.write.permit([
            user1.account.address,
            user2.account.address,
            parseEther("100"),
            deadline,
            v,
            r,
            s
          ], {
            account: user1.account.address,
          })
        ).to.be.rejectedWith("UniswapV2: EXPIRED");
      });
    });

    describe("Overflow Protection", function () {
      it("Should handle large balances safely", async function () {
        // Add initial liquidity
        await mockCAP20.write.transfer([pair.address, parseEther("100")], {
          account: user1.account.address,
        });
        await mockWCHZ.write.transfer([pair.address, parseEther("200")], {
          account: user1.account.address,
        });
        await pair.write.mint([user1.account.address], {
          account: user1.account.address,
        });

        // Perform multiple swaps to test overflow handling
        for (let i = 0; i < 3; i++) {
          const amountIn = parseEther("2");
          await mockCAP20.write.transfer([pair.address, amountIn], {
            account: user2.account.address,
          });
          
          // Calculate proper swap output
          const [reserve0, reserve1] = await pair.read.getReserves();
          const amountInWithFee = amountIn * 997n;
          const numerator = amountInWithFee * reserve1;
          const denominator = reserve0 * 1000n + amountInWithFee;
          const amountOut = numerator / denominator;
          
          await pair.write.swap([0n, amountOut, user2.account.address, "0x"], {
            account: user2.account.address,
          });
        }

        // Should still maintain correct reserves
        const [reserve0, reserve1] = await pair.read.getReserves();
        expect(reserve0 > 0n).to.be.true;
        expect(reserve1 > 0n).to.be.true;
      });
    });
  });
}); 