// SPDX-License-Identifier: MIT
// 1.- Pragma
pragma solidity ^0.8.8;
// Imports
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
// 2.- Errors
error FundMe__NotOwner();

// Interfaces, Libraries, Contracts

/** @title A contract for crowd funding
 *  @author Roberto Abril from the work of Patrick Collins (FCC)
 *  @notice This contract is to demo a sample funding contract
 *  @dev This implements price feeds as our library
 */

contract FundMe {
    // 3.- Type declarations
    using PriceConverter for uint256;

    //4.-  State variables
    mapping(address => uint256) public s_addressToAmountFunded;
    address[] public s_funders;
    // Could we make this constant?  /* hint: no! We should make it immutable! */
    address public /* immutable */ i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;
    AggregatorV3Interface public s_priceFeed;

    // 5.- Events and Modifers
    modifier onlyOwner {
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }
    
    // 6.- Functions
    // Functons order
    // 6.1 constructor
    // 6.2 recieve
    // 6.3 fallback
    // 6.4 external
    // 6.5 public
    // 6.6 internal
    // 6.7 private
    // 6.8 view / pure

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }


    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /**
     *  @notice This function funds this contract
     *  @dev This implements price feeds as our library
     */

    function fund() public payable {
        require(msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD, "You need to spend more ETH!");
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }
        
    
    
    function withdraw() payable onlyOwner public {
        for (uint256 funderIndex=0; funderIndex < s_funders.length; funderIndex++){
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool callSuccess, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdraw() payable onlyOwner public {
        address[] memory funders = s_funders;
        //mappings can't be in memory
        for (uint256 funderIndex=0; funderIndex < funders.length; funderIndex++){
            address funder = funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success, "transfer failed");
    }


}

