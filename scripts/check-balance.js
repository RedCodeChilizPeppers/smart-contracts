const hre = require("hardhat");
const { formatEther } = require("viem");

async function checkBalance() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  const balance = await publicClient.getBalance({
    address: deployer.account.address
  });
  
  console.log(`Network: ${hre.network.name}`);
  console.log(`Address: ${deployer.account.address}`);
  console.log(`Balance: ${formatEther(balance)} CHZ`);
}

checkBalance().catch(console.error);