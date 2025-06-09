// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Donation {
    address public owner;

    event Donated(address indexed donor, uint amount, uint timestamp);

    struct DonationData {
        address donor;
        uint amount;
        uint timestamp;
    }

    DonationData[] public donations;

    constructor() {
        owner = msg.sender;
    }

    function donate() public payable {
        require(msg.value > 0, "Must send some ether");
        donations.push(DonationData(msg.sender, msg.value, block.timestamp));
        emit Donated(msg.sender, msg.value, block.timestamp);
    }

    function getDonationsCount() public view returns (uint) {
        return donations.length;
    }

    function getDonation(uint index) public view returns (address, uint, uint) {
        require(index < donations.length, "Index out of range");
        DonationData storage d = donations[index];
        return (d.donor, d.amount, d.timestamp);
    }

    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
