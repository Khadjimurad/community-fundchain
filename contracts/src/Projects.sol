// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract Projects {
    address public admin;
    enum Status { Draft, Active, FundingReady, Voting, ReadyToPayout, Paid, Cancelled, Archived }

    struct Project {
        bytes32 id;
        string name;
        string description;
        uint256 target;
        uint256 softCap;
        uint256 createdAt;
        Status status;
        string category;
    }

    mapping(bytes32 => Project) public projects;
    bytes32[] public projectIds;

    event ProjectCreated(bytes32 indexed id, string name, uint256 target, uint256 softCap, string category);
    event ProjectUpdated(bytes32 indexed id);
    event ProjectStatusChanged(bytes32 indexed id, Status status);

    constructor() { admin = msg.sender; }

    function createProject(bytes32 id, string memory name, string memory description, uint256 target, uint256 softCap, string memory category) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt == 0, "exists");
        projects[id] = Project(id, name, description, target, softCap, block.timestamp, Status.Active, category);
        projectIds.push(id);
        emit ProjectCreated(id, name, target, softCap, category);
    }

    function setStatus(bytes32 id, Status status_) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt != 0, "not found");
        projects[id].status = status_;
        emit ProjectStatusChanged(id, status_);
    }

    function updateProject(bytes32 id, string memory name, string memory description, uint256 target, uint256 softCap, string memory category) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt != 0, "not found");
        projects[id].name = name;
        projects[id].description = description;
        projects[id].target = target;
        projects[id].softCap = softCap;
        projects[id].category = category;
        emit ProjectUpdated(id);
    }

    function listIds() external view returns (bytes32[] memory) { return projectIds; }
}
