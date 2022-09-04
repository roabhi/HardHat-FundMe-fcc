//import
//main NOT with hardhat deploy
//calling main func NOT WITH Hardhat deploy

// 1.- OLD

// asyc function deployFunc(hre) {
//     console.log("Hi")
// }

// module.exports.default = deployFunc

// 2.- NEW

// module.exports = async (hre) => {
//     const { getNamedAccounts, deployments } = hre
// }

// 3.- NEWER

const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network, getNamedAccounts, deployments } = require("hardhat")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    //if chainId is X use address X
    //if chainId is Y use address Y

    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    //if the contract doesn't exist, we deploy a minimal version of
    //for our local testnet

    //What happens we we want to change chains?
    //when going for localhost or hardhat networks we want to use a mock
    const args = [ethUsdPriceFeedAddress]

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, // put price feed address
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }
    log("----------------------------------------------")
}

module.exports.tags = ["all", "fundme"]
