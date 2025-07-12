import hre from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  const [deployer] = await hre.viem.getWalletClients();

  // Deploy MockCAP20 token
  const mockCAP20 = await hre.viem.deployContract("MockCAP20");
  console.log("MockCAP20 deployed to:", mockCAP20.address);

  // Deploy MockWCHZ token
  const mockWCHZ = await hre.viem.deployContract("MockWCHZ");
  console.log("MockWCHZ deployed to:", mockWCHZ.address);

  // Deploy UniswapV2Factory with WCHZ address
  const factory = await hre.viem.deployContract("UniswapV2Factory", [deployer.account.address, mockWCHZ.address]);
  console.log("UniswapV2Factory deployed to:", factory.address);
  console.log("Factory feeToSetter:", deployer.account.address);
  console.log("Factory WCHZ address:", mockWCHZ.address);

  // Create CAP20-WCHZ pair
  await factory.write.createPair([mockCAP20.address, mockWCHZ.address], {
    account: deployer.account.address,
  });
  
  const pairAddress = await factory.read.getPair([mockCAP20.address, mockWCHZ.address]);
  console.log("CAP20-WCHZ pair created at:", pairAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 