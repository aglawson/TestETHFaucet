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

    event Claimed(address recipient, uint256 amount);
    event ThankYou(address funder, uint256 amount);

    constructor() Ownable(_msgSender()) {

    }

    function fund() external payable {
        funds.push(Fund(_msgSender(), msg.value, block.timestamp));

        emit ThankYou(_msgSender(), msg.value);
    }

    function drip(address recipient, uint256 amount) external onlyOwner {
        if(amount == 0) 
            revert("drip amount must be > 0");

        if(amount > 0.05 ether) 
            revert("don't be greedy! claim amount too high");

        if(address(this).balance < amount)
            revert("low on eth :'(");

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


}