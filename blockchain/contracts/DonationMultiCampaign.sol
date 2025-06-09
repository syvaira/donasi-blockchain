// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DonationMultiCampaign {
    address public owner;

    struct Campaign {
        string name;
        string description;
        uint target; // target in wei
        uint totalDonated;
        bool active;
    }

    struct DonationData {
        address donor;
        uint amount;
        uint timestamp;
        string message;
        uint campaignId;
        bytes32 txHash;
    }

    Campaign[] public campaigns;
    DonationData[] public donations;
    mapping(address => mapping(uint => uint)) public donorTotalPerCampaign; // donor => campaignId => totalAmount

    event Donated(address indexed donor, uint amount, uint timestamp, uint campaignId, string message, bytes32 txHash);
    event CampaignCreated(uint campaignId, string name, uint target);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createCampaign(string memory name, string memory description, uint target) public onlyOwner {
        campaigns.push(Campaign(name, description, target, 0, true));
        emit CampaignCreated(campaigns.length - 1, name, target);
    }

    function donate(uint campaignId, string memory message) public payable {
        require(campaignId < campaigns.length, "Campaign not found");
        require(msg.value > 0, "Must send some ether");
        require(campaigns[campaignId].active, "Campaign not active");

        campaigns[campaignId].totalDonated += msg.value;
        donorTotalPerCampaign[msg.sender][campaignId] += msg.value;
        donations.push(DonationData(msg.sender, msg.value, block.timestamp, message, campaignId, bytes32(0)));

        emit Donated(msg.sender, msg.value, block.timestamp, campaignId, message, bytes32(0));
    }

    function getDonationsCount() public view returns (uint) {
        return donations.length;
    }

    function getDonation(uint index) public view returns (address, uint, uint, string memory, uint) {
        require(index < donations.length, "Index out of range");
        DonationData storage d = donations[index];
        return (d.donor, d.amount, d.timestamp, d.message, d.campaignId);
    }

    function getCampaignsCount() public view returns (uint) {
        return campaigns.length;
    }

    function getCampaign(uint index) public view returns (string memory, string memory, uint, uint, bool) {
        require(index < campaigns.length, "Index out of range");
        Campaign storage c = campaigns[index];
        return (c.name, c.description, c.target, c.totalDonated, c.active);
    }

    function setCampaignActive(uint index, bool status) public onlyOwner {
        require(index < campaigns.length, "Index out of range");
        campaigns[index].active = status;
    }

    function withdraw(uint campaignId, uint amount) public onlyOwner {
        require(campaignId < campaigns.length, "Campaign not found");
        require(amount <= address(this).balance, "Not enough balance");
        payable(owner).transfer(amount);
    }

    // Helper: get total donated by address for campaign
    function getDonorTotal(address donor, uint campaignId) public view returns (uint) {
        return donorTotalPerCampaign[donor][campaignId];
    }
}
