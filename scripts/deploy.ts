import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  // Deploy MockCAP20 token
  const MockCAP20 = await ethers.getContractFactory("MockCAP20");
  const mockCAP20 = await MockCAP20.deploy();
  await mockCAP20.waitForDeployment();
  
  const mockCAP20Address = await mockCAP20.getAddress();
  console.log("MockCAP20 deployed to:", mockCAP20Address);

  // TODO: Add Uniswap V2 integration deployment here if needed
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 