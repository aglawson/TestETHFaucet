// SPDX-License-Identifier: No License
pragma solidity 0.8.19;

import {Ownable} from "./Ownable.sol";
contract Faucet is Ownable {
    struct Claim {
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }
    Claim[] public claims;
    mapping(address => uint256) lastClaim;

    struct Fund {
        address funder;
        uint256 amount;
        uint256 timestamp;
    }
    Fund[] public funds;

    /**
        @dev denominated in terms of 0.1%
        i.e. if dripPercentage = 1, value of 'amount' in drip() will be balance * 0.001
        1% => dripPercentage = 10
        10% => dripPercentage = 100
     */
    uint8 public dripPercentage;

    event Claimed(address recipient, uint256 amount);
    event ThankYou(address funder, uint256 amount);

    constructor() Ownable(_msgSender()) {

    }

    function fund() external payable {
        funds.push(Fund(_msgSender(), msg.value, block.timestamp));

        emit ThankYou(_msgSender(), msg.value);
    }

    function drip(address recipient) external onlyOwner {
        if(dripPercentage == 0) 
            revert("Owner has not initialized");
        if(address(this).balance == 0)
            revert("Contract is empty");
        
        uint256 amount = (address(this).balance / 1000) * dripPercentage;

        if(block.timestamp - lastClaim[recipient] < 86400)
            revert("keep building, come back later");

        lastClaim[recipient] = block.timestamp;
        
        (bool success,) = payable(recipient).call{value: amount}("");

        if(!success)
            revert("ETH transfer fail :'(");

        emit Claimed(recipient, amount);
    }

    function withdrawAll() external onlyOwner {
        (bool success,) = payable(owner()).call{value: address(this).balance}("");
        if(!success)
            revert("transfer fail");
    }

    function setDripPercentage(uint8 _dripPercentage) external onlyOwner {
        dripPercentage = _dripPercentage;
    }


}