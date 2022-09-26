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
            const response = await fundMe.s_priceFeed()
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
            const response = await fundMe.s_addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds funder to array of s_funders", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.s_funders(0)
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
        it("withdraw ETH from a single founder cheaper", async function () {
            //Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeloyerBalance = await fundMe.provider.getBalance(
                deployer
            )
            //Act
            const transactionResponse = await fundMe.cheaperWithdraw()
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
        it("allows us to withdraw with multiple s_funders", async function () {
            //Arrange
            const accounts = await ethers.getSigners()

            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            // console.log(
            //     "startingDeployerBalance: " +
            //         startingDeployerBalance / 100000000000000000000
            // )

            // Act:
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            //Assert
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            // console.log(
            //     "Final Deployer Balance: " +
            //         startingFundMeBalance
            //             .add(startingDeployerBalance)
            //             .toString() /
            //             100000000000000000000
            // )
            // console.log(
            //     "endingDeployerBalance: " +
            //         endingDeployerBalance.add(gasCost).toString()
            // )
            //Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            )

            //Make sure that s_funders are reset properly:
            await expect(fundMe.s_funders(0)).to.be.reverted

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.s_addressToAmountFunded(accounts[i].address),
                    0
                )
            }
        })
        it("allows us to withdraw with multiple s_funders cheaper", async function () {
            //Arrange
            const accounts = await ethers.getSigners()

            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            // console.log(
            //     "startingDeployerBalance: " +
            //         startingDeployerBalance / 100000000000000000000
            // )

            // Act:
            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            //Assert
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            // console.log(
            //     "Final Deployer Balance: " +
            //         startingFundMeBalance
            //             .add(startingDeployerBalance)
            //             .toString() /
            //             100000000000000000000
            // )
            // console.log(
            //     "endingDeployerBalance: " +
            //         endingDeployerBalance.add(gasCost).toString()
            // )
            //Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            )

            //Make sure that s_funders are reset properly:
            await expect(fundMe.s_funders(0)).to.be.reverted

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.s_addressToAmountFunded(accounts[i].address),
                    0
                )
            }
        })
        it("Only allows the owner to withdraw", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(
                attackerConnectedContract.withdraw()
            ).to.be.revertedWith("FundMe__NotOwner")
        })
    })
})
