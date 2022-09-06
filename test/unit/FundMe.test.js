const { assert, expect, Assertion } = require("chai")
const { FixedNumber } = require("ethers")
const { deployments, ethers, getNamedAccounts } = require("hardhat")

describe("FundMe", async function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    // const sendValue = "1000000000000000000" // 1 EHT
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async function () {
        //deploy our fundMe contract
        // using Hardhat-deploy

        //We can also get accounts doing:
        //const accounts = await ethers.getSigners()
        //const accountZero = accounts[0]
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe")
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })

    describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
            const response = await fundMe.priceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", async function () {
        it("Fails if you donot send enough ETH", async function () {
            //Way to check an error and pass the test anyways. Use expect().to.be[]
            //Somehow this above use waffle ?
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })
        it("Updates the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            //npx hardhat test --grep "amount funded"
            // to get only the this test i.e
            const response = await fundMe.addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.funders(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })
        it("withdraw ETH from a single founder", async function () {
            //Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeloyerBalance = await fundMe.provider.getBalance(
                deployer
            )
            //Act
            const transactionResponse = await fundMe.withdraw()
            const transactionRecepit = await transactionResponse.wait(1)
            // gasCost
            const { gasUsed, effectiveGasPrice } = transactionRecepit
            const gasCost = gasUsed.mul(effectiveGasPrice) //mul = *

            const endingFundingBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            // Assert
            assert.equal(endingFundingBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeloyerBalance),
                endingDeployerBalance.add(gasCost).toString() //add = +
                //Last line take into account gas transaction cost in order to assert equal amount on both sides
            )
        })
    })
})
