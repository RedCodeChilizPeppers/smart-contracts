import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { parseEther, zeroAddress } from "viem";
import hre from "hardhat";

describe("MockCAP20", function () {
  let mockCAP20: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addrs: any[];

  const INITIAL_SUPPLY = parseEther("1000000000"); // 1 billion tokens
  const TOKEN_NAME = "Mock CAP20";
  const TOKEN_SYMBOL = "MPSG";

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await hre.viem.getWalletClients();
    mockCAP20 = await hre.viem.deployContract("MockCAP20");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const contractOwner = await mockCAP20.read.owner();
      expect(contractOwner.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await mockCAP20.read.balanceOf([owner.account.address]);
      expect(await mockCAP20.read.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct token name", async function () {
      expect(await mockCAP20.read.name()).to.equal(TOKEN_NAME);
    });

    it("Should have correct token symbol", async function () {
      expect(await mockCAP20.read.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should have correct decimals", async function () {
      expect(Number(await mockCAP20.read.decimals())).to.equal(18);
    });

    it("Should have correct initial supply", async function () {
      expect(await mockCAP20.read.totalSupply()).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await mockCAP20.write.transfer([addr1.account.address, parseEther("50")], {
        account: owner.account.address,
      });
      const addr1Balance = await mockCAP20.read.balanceOf([addr1.account.address]);
      expect(addr1Balance).to.equal(parseEther("50"));

      await mockCAP20.write.transfer([addr2.account.address, parseEther("50")], {
        account: addr1.account.address,
      });
      const addr2Balance = await mockCAP20.read.balanceOf([addr2.account.address]);
      expect(addr2Balance).to.equal(parseEther("50"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await mockCAP20.read.balanceOf([owner.account.address]);
      await expect(
        mockCAP20.write.transfer([owner.account.address, parseEther("1")], {
          account: addr1.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientBalance");
      expect(await mockCAP20.read.balanceOf([owner.account.address])).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await mockCAP20.read.balanceOf([owner.account.address]);
      await mockCAP20.write.transfer([addr1.account.address, parseEther("100")], {
        account: owner.account.address,
      });
      await mockCAP20.write.transfer([addr2.account.address, parseEther("50")], {
        account: owner.account.address,
      });
      const finalOwnerBalance = await mockCAP20.read.balanceOf([owner.account.address]);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - parseEther("150"));
      const addr1Balance = await mockCAP20.read.balanceOf([addr1.account.address]);
      expect(addr1Balance).to.equal(parseEther("100"));
      const addr2Balance = await mockCAP20.read.balanceOf([addr2.account.address]);
      expect(addr2Balance).to.equal(parseEther("50"));
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const initialSupply = await mockCAP20.read.totalSupply();
      const mintAmount = parseEther("1000");
      await mockCAP20.write.mint([addr1.account.address, mintAmount], {
        account: owner.account.address,
      });
      expect(await mockCAP20.read.totalSupply()).to.equal(initialSupply + mintAmount);
      expect(await mockCAP20.read.balanceOf([addr1.account.address])).to.equal(mintAmount);
    });

    it("Should fail if non-owner tries to mint", async function () {
      const mintAmount = parseEther("1000");
      await expect(
        mockCAP20.write.mint([addr2.account.address, mintAmount], {
          account: addr1.account.address,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await mockCAP20.write.transfer([addr1.account.address, parseEther("1000")], {
        account: owner.account.address,
      });
    });

    it("Should allow users to burn their own tokens", async function () {
      const initialBalance = await mockCAP20.read.balanceOf([addr1.account.address]);
      const burnAmount = parseEther("100");
      await mockCAP20.write.burn([burnAmount], {
        account: addr1.account.address,
      });
      expect(await mockCAP20.read.balanceOf([addr1.account.address])).to.equal(initialBalance - burnAmount);
    });

    it("Should fail if user tries to burn more tokens than they have", async function () {
      const balance = await mockCAP20.read.balanceOf([addr1.account.address]);
      const burnAmount = balance + parseEther("1");
      await expect(
        mockCAP20.write.burn([burnAmount], {
          account: addr1.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientBalance");
    });
  });

  describe("Allowances", function () {
    it("Should approve and transfer from", async function () {
      const approveAmount = parseEther("100");
      const transferAmount = parseEther("50");
      await mockCAP20.write.transfer([addr1.account.address, parseEther("200")], {
        account: owner.account.address,
      });
      await mockCAP20.write.approve([addr2.account.address, approveAmount], {
        account: addr1.account.address,
      });
      await mockCAP20.write.transferFrom([addr1.account.address, addr3.account.address, transferAmount], {
        account: addr2.account.address,
      });
      expect(await mockCAP20.read.balanceOf([addr3.account.address])).to.equal(transferAmount);
      expect(await mockCAP20.read.balanceOf([addr1.account.address])).to.equal(parseEther("150"));
      expect(await mockCAP20.read.allowance([addr1.account.address, addr2.account.address])).to.equal(parseEther("50"));
    });

    it("Should fail transferFrom if allowance is insufficient", async function () {
      const approveAmount = parseEther("50");
      const transferAmount = parseEther("100");
      await mockCAP20.write.transfer([addr1.account.address, parseEther("200")], {
        account: owner.account.address,
      });
      await mockCAP20.write.approve([addr2.account.address, approveAmount], {
        account: addr1.account.address,
      });
      await expect(
        mockCAP20.write.transferFrom([addr1.account.address, addr3.account.address, transferAmount], {
          account: addr2.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientAllowance");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      await expect(
        mockCAP20.write.transfer([addr1.account.address, 0n], {
          account: owner.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockCAP20.read.balanceOf([addr1.account.address])).to.equal(0n);
    });

    it("Should handle zero amount approvals", async function () {
      await expect(
        mockCAP20.write.approve([addr1.account.address, 0n], {
          account: owner.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockCAP20.read.allowance([owner.account.address, addr1.account.address])).to.equal(0n);
    });

    it("Should handle zero amount burns", async function () {
      await mockCAP20.write.transfer([addr1.account.address, parseEther("100")], {
        account: owner.account.address,
      });
      const initialBalance = await mockCAP20.read.balanceOf([addr1.account.address]);
      await expect(
        mockCAP20.write.burn([0n], {
          account: addr1.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockCAP20.read.balanceOf([addr1.account.address])).to.equal(initialBalance);
    });
  });

  describe("Constants", function () {
    it("Should have correct INITIAL_SUPPLY constant", async function () {
      expect(await mockCAP20.read.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
    });
  });
}); 