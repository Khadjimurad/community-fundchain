// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract Treasury {
    address public admin;
    mapping(address => uint256) public totalDonatedBy;
    mapping(bytes32 => uint256) public totalAllocatedTo;
    mapping(address => mapping(bytes32 => uint256)) public allocationOf;

    event DonationReceived(address indexed donor, uint256 amount, bytes32 indexed projectId);
    event AllocationSet(bytes32 indexed projectId, uint256 amount, address indexed donor);
    event AllocationReassigned(bytes32 indexed fromProjectId, bytes32 indexed toProjectId, uint256 amount, address indexed donor);
    event AllocationTopUp(bytes32 indexed projectId, uint256 amount, address indexed donor);
    event AllocationReleased(bytes32 indexed projectId, uint256 amount, address indexed to);

    constructor() { admin = msg.sender; }

    function donate(bytes32 projectId) external payable {
        require(msg.value > 0, "no value");
        totalDonatedBy[msg.sender] += msg.value;
        if (projectId != bytes32(0)) {
            allocationOf[msg.sender][projectId] += msg.value;
            totalAllocatedTo[projectId] += msg.value;
            emit AllocationSet(projectId, msg.value, msg.sender);
        }
        emit DonationReceived(msg.sender, msg.value, projectId);
    }

    function allocate(bytes32 projectId) external payable {
        require(msg.value > 0, "no value");
        allocationOf[msg.sender][projectId] += msg.value;
        totalAllocatedTo[projectId] += msg.value;
        totalDonatedBy[msg.sender] += msg.value;
        emit AllocationTopUp(projectId, msg.value, msg.sender);
    }

    function reassign(bytes32 fromProjectId, bytes32 toProjectId, uint256 amount) external {
        require(allocationOf[msg.sender][fromProjectId] >= amount, "insufficient");
        allocationOf[msg.sender][fromProjectId] -= amount;
        totalAllocatedTo[fromProjectId] -= amount;
        allocationOf[msg.sender][toProjectId] += amount;
        totalAllocatedTo[toProjectId] += amount;
        emit AllocationReassigned(fromProjectId, toProjectId, amount, msg.sender);
    }

    function payout(address payable to, bytes32 projectId, uint256 amount) external {
        require(msg.sender == admin, "only admin");
        require(address(this).balance >= amount, "insufficient");
        totalAllocatedTo[projectId] -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit AllocationReleased(projectId, amount, to);
    }

    function balance() external view returns (uint256) { return address(this).balance; }
}
