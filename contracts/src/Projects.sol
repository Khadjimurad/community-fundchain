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
        uint256 hardCap;
        uint256 createdAt;
        uint256 deadline;
        Status status;
        string category;
        uint256 priority;
        bool softCapEnabled;
        uint256 totalAllocated;
        uint256 totalPaidOut;
    }

    mapping(bytes32 => Project) public projects;
    mapping(string => bytes32[]) public projectsByCategory;
    mapping(string => uint256) public maxActivePerCategory;
    bytes32[] public projectIds;
    
    // Configuration
    bool public globalSoftCapEnabled = false;
    uint256 public defaultMaxActivePerCategory = 10;
    
    event ProjectCreated(bytes32 indexed id, string name, uint256 target, uint256 softCap, uint256 hardCap, string category, uint256 deadline);
    event ProjectUpdated(bytes32 indexed id);
    event ProjectStatusChanged(bytes32 indexed id, Status oldStatus, Status newStatus, string reason);
    event ProjectCancelled(bytes32 indexed id, string reason);
    event ProjectFundingUpdated(bytes32 indexed id, uint256 totalAllocated, uint256 totalPaidOut);
    event CategoryLimitUpdated(string category, uint256 maxActive);
    event GlobalSoftCapToggled(bool enabled);

    constructor() { admin = msg.sender; }

    function createProject(
        bytes32 id, 
        string memory name, 
        string memory description, 
        uint256 target, 
        uint256 softCap,
        uint256 hardCap,
        string memory category,
        uint256 deadline,
        bool softCapEnabled
    ) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt == 0, "exists");
        require(target > 0, "target must be > 0");
        require(softCap <= target, "softCap must be <= target");
        require(hardCap == 0 || hardCap >= target, "hardCap must be >= target or 0");
        require(deadline == 0 || deadline > block.timestamp, "deadline must be in future or 0");
        
        // Check category limits
        if (maxActivePerCategory[category] == 0) {
            maxActivePerCategory[category] = defaultMaxActivePerCategory;
        }
        
        uint256 activeCount = _getActiveCategoryCount(category);
        require(activeCount < maxActivePerCategory[category], "category limit reached");
        
        projects[id] = Project({
            id: id,
            name: name,
            description: description,
            target: target,
            softCap: softCap,
            hardCap: hardCap,
            createdAt: block.timestamp,
            deadline: deadline,
            status: Status.Active,
            category: category,
            priority: 0,
            softCapEnabled: softCapEnabled || globalSoftCapEnabled,
            totalAllocated: 0,
            totalPaidOut: 0
        });
        
        projectIds.push(id);
        projectsByCategory[category].push(id);
        
        emit ProjectCreated(id, name, target, softCap, hardCap, category, deadline);
    }

    function setStatus(bytes32 id, Status newStatus, string memory reason) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt != 0, "not found");
        
        Status oldStatus = projects[id].status;
        require(oldStatus != newStatus, "status unchanged");
        
        projects[id].status = newStatus;
        
        if (newStatus == Status.Cancelled) {
            emit ProjectCancelled(id, reason);
        }
        
        emit ProjectStatusChanged(id, oldStatus, newStatus, reason);
    }

    function updateProject(
        bytes32 id, 
        string memory name, 
        string memory description, 
        uint256 target, 
        uint256 softCap,
        uint256 hardCap,
        string memory category,
        uint256 deadline
    ) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt != 0, "not found");
        require(target > 0, "target must be > 0");
        require(softCap <= target, "softCap must be <= target");
        require(hardCap == 0 || hardCap >= target, "hardCap must be >= target or 0");
        require(deadline == 0 || deadline > block.timestamp, "deadline must be in future or 0");
        
        Project storage project = projects[id];
        
        // If changing category, check limits
        if (keccak256(abi.encodePacked(project.category)) != keccak256(abi.encodePacked(category))) {
            if (maxActivePerCategory[category] == 0) {
                maxActivePerCategory[category] = defaultMaxActivePerCategory;
            }
            uint256 activeCount = _getActiveCategoryCount(category);
            require(activeCount < maxActivePerCategory[category], "new category limit reached");
            
            // Remove from old category
            _removeFromCategory(project.category, id);
            // Add to new category
            projectsByCategory[category].push(id);
        }
        
        project.name = name;
        project.description = description;
        project.target = target;
        project.softCap = softCap;
        project.hardCap = hardCap;
        project.category = category;
        project.deadline = deadline;
        
        emit ProjectUpdated(id);
    }

    // Funding tracking functions
    function updateFunding(bytes32 id, uint256 totalAllocated, uint256 totalPaidOut) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt != 0, "not found");
        
        projects[id].totalAllocated = totalAllocated;
        projects[id].totalPaidOut = totalPaidOut;
        
        // Auto-transition to ReadyToPayout if target/softCap reached
        Project storage project = projects[id];
        uint256 threshold = project.softCapEnabled ? project.softCap : project.target;
        
        if (totalAllocated >= threshold && project.status == Status.Active) {
            project.status = Status.ReadyToPayout;
            emit ProjectStatusChanged(id, Status.Active, Status.ReadyToPayout, "funding target reached");
        }
        
        emit ProjectFundingUpdated(id, totalAllocated, totalPaidOut);
    }
    
    function setPriority(bytes32 id, uint256 priority) external {
        require(msg.sender == admin, "only admin");
        require(projects[id].createdAt != 0, "not found");
        projects[id].priority = priority;
    }
    
    // Configuration functions
    function setCategoryLimit(string memory category, uint256 maxActive) external {
        require(msg.sender == admin, "only admin");
        maxActivePerCategory[category] = maxActive;
        emit CategoryLimitUpdated(category, maxActive);
    }
    
    function setGlobalSoftCap(bool enabled) external {
        require(msg.sender == admin, "only admin");
        globalSoftCapEnabled = enabled;
        emit GlobalSoftCapToggled(enabled);
    }
    
    function setDefaultMaxActivePerCategory(uint256 maxActive) external {
        require(msg.sender == admin, "only admin");
        defaultMaxActivePerCategory = maxActive;
    }
    
    // View functions
    function listIds() external view returns (bytes32[] memory) { 
        return projectIds; 
    }
    
    function getProjectsByCategory(string memory category) external view returns (bytes32[] memory) {
        return projectsByCategory[category];
    }
    
    function getActiveProjectsByCategory(string memory category) external view returns (bytes32[] memory) {
        bytes32[] memory categoryProjects = projectsByCategory[category];
        bytes32[] memory activeProjects = new bytes32[](categoryProjects.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < categoryProjects.length; i++) {
            bytes32 projectId = categoryProjects[i];
            Status status = projects[projectId].status;
            if (status == Status.Active || status == Status.FundingReady || status == Status.Voting) {
                activeProjects[count] = projectId;
                count++;
            }
        }
        
        // Resize array to actual count
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeProjects[i];
        }
        
        return result;
    }
    
    function isExpired(bytes32 id) external view returns (bool) {
        Project memory project = projects[id];
        return project.deadline != 0 && block.timestamp > project.deadline;
    }
    
    // Internal functions
    function _getActiveCategoryCount(string memory category) internal view returns (uint256) {
        bytes32[] memory categoryProjects = projectsByCategory[category];
        uint256 count = 0;
        
        for (uint256 i = 0; i < categoryProjects.length; i++) {
            bytes32 projectId = categoryProjects[i];
            Status status = projects[projectId].status;
            if (status == Status.Active || status == Status.FundingReady || status == Status.Voting) {
                count++;
            }
        }
        
        return count;
    }
    
    function _removeFromCategory(string memory category, bytes32 projectId) internal {
        bytes32[] storage categoryProjects = projectsByCategory[category];
        for (uint256 i = 0; i < categoryProjects.length; i++) {
            if (categoryProjects[i] == projectId) {
                categoryProjects[i] = categoryProjects[categoryProjects.length - 1];
                categoryProjects.pop();
                break;
            }
        }
    }
}
