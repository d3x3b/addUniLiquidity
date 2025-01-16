import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {maxUint256, Address } from "viem";

function sqrt(value: bigint): bigint {
    if (value < BigInt(0)) {
        throw new Error("Square root of negative numbers is not supported");
    }

    if (value < BigInt(2)) {
        return value;
    }

    // Starting estimate = 2^(log2(x)/2)
    let n = value;
    let x = BigInt(1) << (BigInt(value.toString(2).length) >> BigInt(1));

    while (true) {
        const y = (x + value / x) >> BigInt(1);
        if (y >= x) {
            return x;
        }
        x = y;
    }
}
function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
    return tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];
}

describe("Liquidity Tests", function() {
    async function deployUniswapFixture() {
        const [owner, user1] = await hre.viem.getWalletClients();
        
        // Deploy Factory
        const factoryContract = await hre.viem.deployContract("UniswapV2Factory", [owner.account.address]);
        console.log("Factory deployed at:", factoryContract.address);
        //Deploy WETH
        const weth = await hre.viem.deployContract("WETH9");
        console.log("WETH deployed at:", weth.address);
        //Deploy Router
        const router = await hre.viem.deployContract("UniswapV2Router02", [
            factoryContract.address,
            weth.address
        ]);
        console.log("Router deployed at:", router.address);
        const factoryByRouter = await router.read.factory();
        console.log("Factory according to router: ", factoryByRouter);
        // Deploy Tokens
        const mockTokenA = await hre.viem.deployContract(
            "MockERC20", [
                "MockTokenA",
                "MCKTKA",
                18
            ]);
        const mockTokenB = await hre.viem.deployContract(
            "MockERC20", [
                "MockTokenB",
                "MCKTKB",
                18
            ]);
        console.log("Tokens deployed at:", {
            mockTokenA: mockTokenA.address,
            mockTokenB: mockTokenB.address
        });
        // Balance owner After deploying tokens
        const mockTokenAbalance = await mockTokenA.read.balanceOf([owner.account.address]);
        const mockTokenBbalance = await mockTokenB.read.balanceOf([owner.account.address]);
        console.log("Initial token balances:", {
            mockTokenAbalance,
            mockTokenBbalance
        }); 
        const [token0 , token1] =sortTokens(mockTokenA.address, mockTokenB.address);
        // Create Pair
        const createPairTx = await factoryContract.write.createPair([token0, token1]);
        console.log("Create pair tx:", createPairTx);
        const pairAddress = await factoryContract.read.getPair([mockTokenA.address, mockTokenB.address]);
      
        //getPair Contract
        const pair = await hre.viem.getContractAt("UniswapV2Pair", pairAddress);
        // Check pair token0 and token1
        const pairToken0 = await pair.read.token0();
        const pairToken1 = await pair.read.token1();
        console.log("Pair tokens:", {
            token0: pairToken0,
            token1: pairToken1
        });
        //Approve max tokens for router
        const maxAllowance = BigInt(maxUint256);
        await mockTokenA.write.approve([router.address, maxAllowance]);
        await mockTokenB.write.approve([router.address, maxAllowance]);
        // After approvals
        const routerAllowanceTokenA= await mockTokenA.read.allowance([
            owner.account.address,
            router.address
        ]);
        const routerAllowancetokenB = await mockTokenB.read.allowance([
            owner.account.address,
            router.address
        ]);
        console.log("Router allowances:", {
            tokenA: routerAllowanceTokenA.toString(),
            tokenB: routerAllowancetokenB.toString()
        });
        const taxRate = 0.002; // 0.2%
        const mockTokenAsDeposit = BigInt(10) * BigInt(10 ** 18);
        const mockTokenBsDeposit = BigInt(10) * BigInt(10 ** 6);
        console.log("Deposit amounts:", {
            mockTokenBDeposit: mockTokenBsDeposit.toString(),
            mockTokenADeposit: mockTokenAsDeposit.toString()
        });
        // checks before adding liquidity
        const tokenAbalance = await mockTokenA.read.balanceOf([owner.account.address]);
        const tokenBbalance = await mockTokenB.read.balanceOf([owner.account.address]);
        console.log("Token balances before adding liquidity:", {
            tokenAbalance,
            tokenBbalance
        });
            
        try {
            const addLiquidityTx = await router.write.addLiquidity([
                token0,
                token1,
                mockTokenAsDeposit,
                mockTokenBsDeposit,
                0n, 
                0n,   
                owner.account.address,
                BigInt(Math.floor(Date.now() / 1000) + 60 * 10)
            ]);
            console.log("Add liquidity tx:", addLiquidityTx);
        } catch (error) {
            console.error("Add liquidity failed:", error);
            throw error;
        }

        const lpBalance = await pair.read.balanceOf([owner.account.address]);
        console.log("Actual LP Balance:", lpBalance);


        return {
            factory: factoryContract,
            router: router,
            mockTokenA,
            mockTokenB,
            pair,
            owner,
            user1,
            weth
        };
    }

    describe("Liquidity", function () {
        it("Should create pair and add initial liquidity", async function () {
            const {router, mockTokenA, mockTokenB, pair, owner} = await loadFixture(deployUniswapFixture);

            // Check reserves
            const reserves = await pair.read.getReserves();

            const expectedTokenA = BigInt(1000) * BigInt(10 ** 18);
            const expectedTokenB = BigInt(1000) * BigInt(10 ** 6);

            expect(reserves[0]).to.equal(expectedTokenA);
            expect(reserves[1]).to.equal(expectedTokenB);

            // Check LP balance
            const lpBalance = await pair.read.balanceOf([owner.account.address]);
            expect(lpBalance).to.be.gt(0);
        });
    });
});
        