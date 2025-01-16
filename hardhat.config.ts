import type { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox-viem";
import "hardhat-dependency-compiler"

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
      },
      {
        version: "0.6.6"
      },
      {
        version: "0.5.16"
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      // forking: {
      //   url: "https://eth-mainnet.g.alchemy.com/v2/alcht_TVlU7crdZVYymy8C4YXDLrQE1ah8CZ",
      //   blockNumber: 25049258,
      // }
    }
  },
  dependencyCompiler: {
    paths: [
      '@uniswap/v2-core/contracts/UniswapV2Factory.sol',
      '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol',
      '@uniswap/v2-periphery/contracts/test/WETH9.sol',
    ]
  }
}

export default config;
