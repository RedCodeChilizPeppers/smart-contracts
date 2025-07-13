const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
    console.log("🔍 Verifying Pool Status");
    console.log("=".repeat(40));

    const { viem } = hre;
    const [account] = await viem.getWalletClients();
    
    // Pool addresses
    const pools = [
        {
            name: "MESSI",
            token: "0x7f3ea311c2be7717f5e8dc259803a2ea329055f1",
            pair: "0x4F4a5B546382257DA085B57C1727fe6B88eCD038"
        },
        {
            name: "COLD",
            token: "0x0e0a27ac7c77cf5b699a0b98016fbe7bfca53503", 
            pair: "0xCaD4C170173BbcF7E2a89e0Ec0b4F65b94578252"
        }
    ];

    const wchz = await viem.getContractAt("MockWCHZ", "0xfcb54f81d0eb426356c05a85817ab9edcbbc824c");
    const factory = await viem.getContractAt("UniswapV2Factory", "0x0d1bf679630a640e87291977a46085852e066dde");

    for (const pool of pools) {
        console.log(`\n🔍 Checking ${pool.name} Pool:`);
        console.log(`Token: ${pool.token}`);
        console.log(`Pair:  ${pool.pair}`);
        
        try {
            // Get contracts
            const token = await viem.getContractAt("FBTToken", pool.token);
            const pair = await viem.getContractAt("UniswapV2Pair", pool.pair);
            
            // Check if pair exists in factory
            const factoryPair = await factory.read.getPairWithWCHZ([pool.token]);
            console.log(`Factory pair: ${factoryPair}`);
            console.log(`Matches: ${factoryPair.toLowerCase() === pool.pair.toLowerCase() ? '✅' : '❌'}`);
            
            // Check pair tokens
            const token0 = await pair.read.token0();
            const token1 = await pair.read.token1();
            console.log(`Pair token0: ${token0}`);
            console.log(`Pair token1: ${token1}`);
            
            // Check reserves
            const reserves = await pair.read.getReserves();
            console.log(`Reserves: ${formatEther(reserves[0])}, ${formatEther(reserves[1])}`);
            
            // Check total supply
            const totalSupply = await pair.read.totalSupply();
            console.log(`LP total supply: ${formatEther(totalSupply)}`);
            
            // Check our LP balance
            const lpBalance = await pair.read.balanceOf([account.account.address]);
            console.log(`Our LP balance: ${formatEther(lpBalance)}`);
            
            // Check token balances in pair
            const tokenBalanceInPair = await token.read.balanceOf([pool.pair]);
            const wchzBalanceInPair = await wchz.read.balanceOf([pool.pair]);
            console.log(`${pool.name} in pair: ${formatEther(tokenBalanceInPair)}`);
            console.log(`WCHZ in pair: ${formatEther(wchzBalanceInPair)}`);
            
            // Determine if pool is functional
            const isActive = tokenBalanceInPair > 0n && wchzBalanceInPair > 0n;
            console.log(`Status: ${isActive ? '✅ ACTIVE' : '❌ EMPTY'}`);
            
        } catch (error) {
            console.log(`❌ Error: ${error.message.substring(0, 80)}...`);
        }
    }

    // Check factory state
    console.log(`\n🏭 Factory Status:`);
    const totalPairs = await factory.read.allPairsLength();
    console.log(`Total pairs: ${Number(totalPairs)}`);

    console.log(`\n💰 Token Balances:`);
    for (const pool of pools) {
        try {
            const token = await viem.getContractAt("FBTToken", pool.token);
            const balance = await token.read.balanceOf([account.account.address]);
            console.log(`${pool.name}: ${formatEther(balance)}`);
        } catch (error) {
            console.log(`${pool.name}: Error reading balance`);
        }
    }
    
    const wchzBalance = await wchz.read.balanceOf([account.account.address]);
    console.log(`WCHZ: ${formatEther(wchzBalance)}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });