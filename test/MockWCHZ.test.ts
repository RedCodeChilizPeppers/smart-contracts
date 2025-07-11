import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { parseEther, zeroAddress } from "viem";
import hre from "hardhat";

describe("MockWCHZ", function () {
  let mockWCHZ: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addrs: any[];

  const INITIAL_SUPPLY = parseEther("1000000000"); // 1 billion tokens
  const TOKEN_NAME = "Mock WCHZ";
  const TOKEN_SYMBOL = "MWCHZ";

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await hre.viem.getWalletClients();
    mockWCHZ = await hre.viem.deployContract("MockWCHZ");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const contractOwner = await mockWCHZ.read.owner();
      expect(contractOwner.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await mockWCHZ.read.balanceOf([owner.account.address]);
      expect(await mockWCHZ.read.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct token name", async function () {
      expect(await mockWCHZ.read.name()).to.equal(TOKEN_NAME);
    });

    it("Should have correct token symbol", async function () {
      expect(await mockWCHZ.read.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should have correct decimals", async function () {
      expect(Number(await mockWCHZ.read.decimals())).to.equal(18);
    });

    it("Should have correct initial supply", async function () {
      expect(await mockWCHZ.read.totalSupply()).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("50")], {
        account: owner.account.address,
      });
      const addr1Balance = await mockWCHZ.read.balanceOf([addr1.account.address]);
      expect(addr1Balance).to.equal(parseEther("50"));

      await mockWCHZ.write.transfer([addr2.account.address, parseEther("50")], {
        account: addr1.account.address,
      });
      const addr2Balance = await mockWCHZ.read.balanceOf([addr2.account.address]);
      expect(addr2Balance).to.equal(parseEther("50"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await mockWCHZ.read.balanceOf([owner.account.address]);
      await expect(
        mockWCHZ.write.transfer([owner.account.address, parseEther("1")], {
          account: addr1.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientBalance");
      expect(await mockWCHZ.read.balanceOf([owner.account.address])).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await mockWCHZ.read.balanceOf([owner.account.address]);
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("100")], {
        account: owner.account.address,
      });
      await mockWCHZ.write.transfer([addr2.account.address, parseEther("50")], {
        account: owner.account.address,
      });
      const finalOwnerBalance = await mockWCHZ.read.balanceOf([owner.account.address]);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - parseEther("150"));
      const addr1Balance = await mockWCHZ.read.balanceOf([addr1.account.address]);
      expect(addr1Balance).to.equal(parseEther("100"));
      const addr2Balance = await mockWCHZ.read.balanceOf([addr2.account.address]);
      expect(addr2Balance).to.equal(parseEther("50"));
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const initialSupply = await mockWCHZ.read.totalSupply();
      const mintAmount = parseEther("1000");
      await mockWCHZ.write.mint([addr1.account.address, mintAmount], {
        account: owner.account.address,
      });
      expect(await mockWCHZ.read.totalSupply()).to.equal(initialSupply + mintAmount);
      expect(await mockWCHZ.read.balanceOf([addr1.account.address])).to.equal(mintAmount);
    });

    it("Should fail if non-owner tries to mint", async function () {
      const mintAmount = parseEther("1000");
      await expect(
        mockWCHZ.write.mint([addr2.account.address, mintAmount], {
          account: addr1.account.address,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should fail when minting to zero address", async function () {
      const mintAmount = parseEther("100");
      await expect(
        mockWCHZ.write.mint([zeroAddress, mintAmount], {
          account: owner.account.address,
        })
      ).to.be.rejectedWith("ERC20InvalidReceiver");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("1000")], {
        account: owner.account.address,
      });
    });

    it("Should allow users to burn their own tokens", async function () {
      const initialBalance = await mockWCHZ.read.balanceOf([addr1.account.address]);
      const burnAmount = parseEther("100");
      await mockWCHZ.write.burn([burnAmount], {
        account: addr1.account.address,
      });
      expect(await mockWCHZ.read.balanceOf([addr1.account.address])).to.equal(initialBalance - burnAmount);
    });

    it("Should fail if user tries to burn more tokens than they have", async function () {
      const balance = await mockWCHZ.read.balanceOf([addr1.account.address]);
      const burnAmount = balance + parseEther("1");
      await expect(
        mockWCHZ.write.burn([burnAmount], {
          account: addr1.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientBalance");
    });

    it("Should update total supply when burning", async function () {
      const initialSupply = await mockWCHZ.read.totalSupply();
      const burnAmount = parseEther("100");
      await mockWCHZ.write.burn([burnAmount], {
        account: addr1.account.address,
      });
      expect(await mockWCHZ.read.totalSupply()).to.equal(initialSupply - burnAmount);
    });
  });

  describe("Allowances", function () {
    it("Should approve and transfer from", async function () {
      const approveAmount = parseEther("100");
      const transferAmount = parseEther("50");
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("200")], {
        account: owner.account.address,
      });
      await mockWCHZ.write.approve([addr2.account.address, approveAmount], {
        account: addr1.account.address,
      });
      await mockWCHZ.write.transferFrom([addr1.account.address, addr3.account.address, transferAmount], {
        account: addr2.account.address,
      });
      expect(await mockWCHZ.read.balanceOf([addr3.account.address])).to.equal(transferAmount);
      expect(await mockWCHZ.read.balanceOf([addr1.account.address])).to.equal(parseEther("150"));
      expect(await mockWCHZ.read.allowance([addr1.account.address, addr2.account.address])).to.equal(parseEther("50"));
    });

    it("Should fail transferFrom if allowance is insufficient", async function () {
      const approveAmount = parseEther("50");
      const transferAmount = parseEther("100");
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("200")], {
        account: owner.account.address,
      });
      await mockWCHZ.write.approve([addr2.account.address, approveAmount], {
        account: addr1.account.address,
      });
      await expect(
        mockWCHZ.write.transferFrom([addr1.account.address, addr3.account.address, transferAmount], {
          account: addr2.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientAllowance");
    });

    it("Should fail transferFrom if balance is insufficient", async function () {
      const approveAmount = parseEther("100");
      const transferAmount = parseEther("50");
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("30")], {
        account: owner.account.address,
      });
      await mockWCHZ.write.approve([addr2.account.address, approveAmount], {
        account: addr1.account.address,
      });
      await expect(
        mockWCHZ.write.transferFrom([addr1.account.address, addr3.account.address, transferAmount], {
          account: addr2.account.address,
        })
      ).to.be.rejectedWith("ERC20InsufficientBalance");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      await expect(
        mockWCHZ.write.transfer([addr1.account.address, 0n], {
          account: owner.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockWCHZ.read.balanceOf([addr1.account.address])).to.equal(0n);
    });

    it("Should handle zero amount approvals", async function () {
      await expect(
        mockWCHZ.write.approve([addr1.account.address, 0n], {
          account: owner.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockWCHZ.read.allowance([owner.account.address, addr1.account.address])).to.equal(0n);
    });

    it("Should handle zero amount burns", async function () {
      await mockWCHZ.write.transfer([addr1.account.address, parseEther("100")], {
        account: owner.account.address,
      });
      const initialBalance = await mockWCHZ.read.balanceOf([addr1.account.address]);
      await expect(
        mockWCHZ.write.burn([0n], {
          account: addr1.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockWCHZ.read.balanceOf([addr1.account.address])).to.equal(initialBalance);
    });

    it("Should handle zero amount minting", async function () {
      const initialSupply = await mockWCHZ.read.totalSupply();
      await expect(
        mockWCHZ.write.mint([addr1.account.address, 0n], {
          account: owner.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockWCHZ.read.totalSupply()).to.equal(initialSupply);
      expect(await mockWCHZ.read.balanceOf([addr1.account.address])).to.equal(0n);
    });

    it("Should handle transfer to self", async function () {
      const initialBalance = await mockWCHZ.read.balanceOf([owner.account.address]);
      const transferAmount = parseEther("100");
      await expect(
        mockWCHZ.write.transfer([owner.account.address, transferAmount], {
          account: owner.account.address,
        })
      ).to.not.be.rejected;
      expect(await mockWCHZ.read.balanceOf([owner.account.address])).to.equal(initialBalance);
    });
  });

  describe("Constants", function () {
    it("Should have correct INITIAL_SUPPLY constant", async function () {
      expect(await mockWCHZ.read.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("Token Metadata", function () {
    it("Should return correct token information", async function () {
      expect(await mockWCHZ.read.name()).to.equal("Mock WCHZ");
      expect(await mockWCHZ.read.symbol()).to.equal("MWCHZ");
      expect(Number(await mockWCHZ.read.decimals())).to.equal(18);
    });
  });
}); 