import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"; // To load RPC URL and PRIVATE_KEY from .env

const SPICY_RPC = process.env.SPICY_RPC_URL as string;
const MAINNET_RPC = process.env.MAINNET_RPC_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

const config: HardhatUserConfig = {
  defaultNetwork: "spicy",
  networks: {
    spicy: {
      url: SPICY_RPC,
      chainId: 1777,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: MAINNET_RPC,
      chainId: 212,
      accounts: [PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "berlin", // aligns with EVM ≥ 19 on Chiliz
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  mocha: {
    timeout: 200000,
  },
};

export default config;
