// Deployment configuration for different networks and scenarios

const { parseEther } = require("viem");

const NETWORK_CONFIGS = {
  // Local Hardhat Network
  hardhat: {
    name: "Hardhat Local",
    fbtToken: {
      name: "Platform Fan Base Token",
      symbol: "PFBT",
      entityName: "Platform Entity",
      entityType: "entertainment",
      description: "Official platform fan token for entertainment entities"
    },
    stakingPools: [
      { name: "30 Days Lock", duration: 30 * 24 * 60 * 60, apy: 500 }, // 5%
      { name: "90 Days Lock", duration: 90 * 24 * 60 * 60, apy: 1500 }, // 15%
      { name: "1 Year Lock", duration: 365 * 24 * 60 * 60, apy: 3000 } // 30%
    ],
    prizes: [
      {
        name: "Platform T-Shirt",
        description: "Official platform branded t-shirt",
        category: 0, // Merchandise
        cost: parseEther("50"),
        supply: 100,
        unlimited: false
      },
      {
        name: "VIP Access Pass",
        description: "VIP access to exclusive platform events",
        category: 1, // Experience
        cost: parseEther("500"),
        supply: 50,
        unlimited: false
      }
    ],
    initialMint: parseEther("10000"),
    liquidityTokens: parseEther("1000000")
  },

  // Chiliz Spicy Testnet
  spicy: {
    name: "Chiliz Spicy Testnet",
    fbtToken: {
      name: "Chiliz Fan Base Token",
      symbol: "CFBT",
      entityName: "Chiliz Platform",
      entityType: "sports",
      description: "Official fan token for Chiliz sports platform"
    },
    stakingPools: [
      { name: "1 Month Lock", duration: 30 * 24 * 60 * 60, apy: 800 }, // 8%
      { name: "3 Months Lock", duration: 90 * 24 * 60 * 60, apy: 2000 }, // 20%
      { name: "6 Months Lock", duration: 180 * 24 * 60 * 60, apy: 3500 }, // 35%
      { name: "1 Year Lock", duration: 365 * 24 * 60 * 60, apy: 5000 } // 50%
    ],
    prizes: [
      {
        name: "Team Jersey",
        description: "Official team jersey with autograph",
        category: 0, // Merchandise
        cost: parseEther("100"),
        supply: 200,
        unlimited: false
      },
      {
        name: "Stadium VIP Experience",
        description: "VIP stadium experience with meet & greet",
        category: 1, // Experience
        cost: parseEther("1000"),
        supply: 25,
        unlimited: false
      },
      {
        name: "Digital Collectible",
        description: "Exclusive digital sports collectible",
        category: 2, // Digital
        cost: parseEther("25"),
        supply: 1000,
        unlimited: false
      }
    ],
    initialMint: parseEther("100000"), // More for testnet
    liquidityTokens: parseEther("500000")
  },

  // Chiliz Mainnet
  mainnet: {
    name: "Chiliz Mainnet",
    fbtToken: {
      name: "Chiliz Entertainment Token",
      symbol: "CET",
      entityName: "Chiliz Entertainment",
      entityType: "entertainment",
      description: "Official entertainment fan token for Chiliz ecosystem"
    },
    stakingPools: [
      { name: "30 Days Lock", duration: 30 * 24 * 60 * 60, apy: 600 }, // 6%
      { name: "90 Days Lock", duration: 90 * 24 * 60 * 60, apy: 1200 }, // 12%
      { name: "180 Days Lock", duration: 180 * 24 * 60 * 60, apy: 2000 }, // 20%
      { name: "1 Year Lock", duration: 365 * 24 * 60 * 60, apy: 3000 } // 30%
    ],
    prizes: [
      {
        name: "Exclusive Merchandise",
        description: "Limited edition platform merchandise",
        category: 0, // Merchandise
        cost: parseEther("75"),
        supply: 500,
        unlimited: false
      },
      {
        name: "Event Access Pass",
        description: "Access to exclusive platform events",
        category: 1, // Experience
        cost: parseEther("300"),
        supply: 100,
        unlimited: false
      }
    ],
    initialMint: parseEther("1000000"), // 1M for mainnet distribution
    liquidityTokens: parseEther("10000000") // 10M for mainnet liquidity
  }
};

// Entity-specific configurations for different use cases
const ENTITY_CONFIGS = {
  // Sports Team Configuration
  sportsTeam: {
    name: "Team Fan Token",
    symbol: "TFT",
    entityType: "sports",
    stakingPools: [
      { name: "Season Lock", duration: 180 * 24 * 60 * 60, apy: 1500 }, // 6 months
      { name: "Annual Lock", duration: 365 * 24 * 60 * 60, apy: 2500 } // 1 year
    ],
    prizes: [
      {
        name: "Match Tickets",
        description: "VIP match tickets with premium seating",
        category: 1,
        cost: parseEther("200"),
        supply: 50,
        unlimited: false
      },
      {
        name: "Team Jersey",
        description: "Official team jersey with player signature",
        category: 0,
        cost: parseEther("150"),
        supply: 100,
        unlimited: false
      }
    ]
  },

  // Music Artist Configuration
  musicArtist: {
    name: "Artist Fan Token",
    symbol: "AFT",
    entityType: "music",
    stakingPools: [
      { name: "Album Cycle", duration: 120 * 24 * 60 * 60, apy: 1000 }, // 4 months
      { name: "Tour Lock", duration: 240 * 24 * 60 * 60, apy: 2000 } // 8 months
    ],
    prizes: [
      {
        name: "Concert VIP Pass",
        description: "VIP concert experience with backstage access",
        category: 1,
        cost: parseEther("500"),
        supply: 25,
        unlimited: false
      },
      {
        name: "Signed Album",
        description: "Personally signed album by the artist",
        category: 0,
        cost: parseEther("100"),
        supply: 200,
        unlimited: false
      }
    ]
  },

  // Entertainment Platform Configuration
  entertainment: {
    name: "Platform Fan Token",
    symbol: "PFT",
    entityType: "entertainment",
    stakingPools: [
      { name: "Monthly Lock", duration: 30 * 24 * 60 * 60, apy: 500 },
      { name: "Quarterly Lock", duration: 90 * 24 * 60 * 60, apy: 1200 },
      { name: "Semi-Annual Lock", duration: 180 * 24 * 60 * 60, apy: 2000 },
      { name: "Annual Lock", duration: 365 * 24 * 60 * 60, apy: 3000 }
    ],
    prizes: [
      {
        name: "Premium Subscription",
        description: "1-year premium platform subscription",
        category: 2, // Digital
        cost: parseEther("50"),
        supply: 0,
        unlimited: true
      },
      {
        name: "Exclusive Content Access",
        description: "Access to exclusive behind-the-scenes content",
        category: 2, // Digital
        cost: parseEther("25"),
        supply: 0,
        unlimited: true
      }
    ]
  }
};

// Gas optimization settings for different networks
const GAS_CONFIGS = {
  hardhat: {
    gasPrice: "auto",
    gasLimit: "auto"
  },
  spicy: {
    gasPrice: "10000000000", // 10 Gwei
    gasLimit: "8000000"
  },
  mainnet: {
    gasPrice: "5000000000", // 5 Gwei
    gasLimit: "6000000"
  }
};

// Validation functions
function validateConfig(config) {
  if (!config.fbtToken || !config.stakingPools || !config.prizes) {
    throw new Error("Invalid configuration: missing required fields");
  }
  
  if (config.stakingPools.length === 0) {
    throw new Error("Invalid configuration: at least one staking pool required");
  }
  
  if (config.prizes.length === 0) {
    throw new Error("Invalid configuration: at least one prize required");
  }
  
  return true;
}

function getConfig(network, entityType = null) {
  let config = NETWORK_CONFIGS[network];
  
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  
  // Merge with entity-specific configuration if provided
  if (entityType && ENTITY_CONFIGS[entityType]) {
    const entityConfig = ENTITY_CONFIGS[entityType];
    config = {
      ...config,
      fbtToken: {
        ...config.fbtToken,
        name: entityConfig.name,
        symbol: entityConfig.symbol,
        entityType: entityConfig.entityType
      },
      stakingPools: entityConfig.stakingPools,
      prizes: entityConfig.prizes
    };
  }
  
  validateConfig(config);
  return config;
}

module.exports = {
  NETWORK_CONFIGS,
  ENTITY_CONFIGS,
  GAS_CONFIGS,
  getConfig,
  validateConfig
};