// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/Projects.sol";

contract ProjectsTest is Test {
    Projects public projects;
    
    address public owner;
    address public user1;
    address public user2;
    
    bytes32 public projectId1;
    bytes32 public projectId2;
    bytes32 public projectId3;
    
    event ProjectCreated(
        bytes32 indexed projectId,
        string name,
        string category,
        uint256 target,
        uint256 softCap,
        uint256 hardCap,
        uint256 deadline,
        bool softCapEnabled
    );
    
    event ProjectStatusUpdated(bytes32 indexed projectId, string oldStatus, string newStatus);
    event ProjectFundingUpdated(bytes32 indexed projectId, uint256 newTotalAllocated, uint256 newTotalPaidOut);
    event ProjectPrioritySet(bytes32 indexed projectId, uint256 priority);
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        projects = new Projects();
        
        projectId1 = keccak256("project1");
        projectId2 = keccak256("project2");
        projectId3 = keccak256("project3");
    }
    
    function testCreateProject() public {
        vm.expectEmit(true, true, true, true);
        emit ProjectCreated(
            projectId1,
            "Test Project 1",
            "infrastructure",
            10 ether,
            5 ether,
            15 ether,
            0,
            true
        );
        
        projects.createProject(
            projectId1,
            "Test Project 1",
            "First test project",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        (
            string memory name,
            string memory description,
            uint256 target,
            uint256 softCap,
            uint256 hardCap,
            ,, // created_at, deadline
            string memory status,
            string memory category,
            uint256 priority,
            bool softCapEnabled,
            uint256 totalAllocated,
            uint256 totalPaidOut
        ) = projects.getProject(projectId1);
        
        assertEq(name, "Test Project 1");
        assertEq(description, "First test project");
        assertEq(target, 10 ether);
        assertEq(softCap, 5 ether);
        assertEq(hardCap, 15 ether);
        assertEq(status, "active");
        assertEq(category, "infrastructure");
        assertEq(priority, 0);
        assertTrue(softCapEnabled);
        assertEq(totalAllocated, 0);
        assertEq(totalPaidOut, 0);
    }
    
    function testCreateProjectWithDeadline() public {
        uint256 deadline = block.timestamp + 30 days;
        
        projects.createProject(
            projectId2,
            "Deadline Project",
            "Project with deadline",
            8 ether,
            4 ether,
            12 ether,
            "healthcare",
            deadline,
            false
        );
        
        (,,,,,, uint256 projectDeadline,,,,,,) = projects.getProject(projectId2);
        assertEq(projectDeadline, deadline);
    }
    
    function testUpdateProjectStatus() public {
        // Create project first
        projects.createProject(
            projectId1,
            "Test Project",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        vm.expectEmit(true, true, true, true);
        emit ProjectStatusUpdated(projectId1, "active", "voting");
        
        projects.updateProjectStatus(projectId1, "voting");
        
        (,,,,,, string memory status,,,,,) = projects.getProject(projectId1);
        assertEq(status, "voting");
    }
    
    function testUpdateFunding() public {
        // Create project
        projects.createProject(
            projectId1,
            "Test Project",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        vm.expectEmit(true, true, true, true);
        emit ProjectFundingUpdated(projectId1, 3 ether, 0);
        
        projects.updateFunding(projectId1, 3 ether, 0);
        
        (,,,,,,,,,, uint256 totalAllocated, uint256 totalPaidOut) = projects.getProject(projectId1);
        assertEq(totalAllocated, 3 ether);
        assertEq(totalPaidOut, 0);
    }
    
    function testSetPriority() public {
        // Create project
        projects.createProject(
            projectId1,
            "Test Project",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        vm.expectEmit(true, true, true, true);
        emit ProjectPrioritySet(projectId1, 42);
        
        projects.setPriority(projectId1, 42);
        
        (,,,,,,, uint256 priority,,,,,) = projects.getProject(projectId1);
        assertEq(priority, 42);
    }
    
    function testCategoryLimits() public {
        // Set category limit
        projects.setCategoryLimit("infrastructure", 2);
        
        // Create first project - should succeed
        projects.createProject(
            projectId1,
            "Project 1",
            "Description 1",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        // Create second project - should succeed
        projects.createProject(
            projectId2,
            "Project 2",
            "Description 2",
            8 ether,
            4 ether,
            12 ether,
            "infrastructure",
            0,
            true
        );
        
        // Create third project - should fail due to limit
        vm.expectRevert("category limit exceeded");
        projects.createProject(
            projectId3,
            "Project 3",
            "Description 3",
            6 ether,
            3 ether,
            9 ether,
            "infrastructure",
            0,
            true
        );
    }
    
    function testGlobalSoftCap() public {
        // Enable global soft cap with limit
        projects.setGlobalSoftCap(true);
        projects.setGlobalSoftCapAmount(20 ether);
        
        // Create first project
        projects.createProject(
            projectId1,
            "Project 1",
            "Description 1",
            10 ether,
            8 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        // Update funding to reach soft cap
        projects.updateFunding(projectId1, 8 ether, 0);
        
        // Create second project
        projects.createProject(
            projectId2,
            "Project 2",
            "Description 2",
            15 ether,
            12 ether,
            20 ether,
            "healthcare",
            0,
            true
        );
        
        // Update funding - should hit global soft cap
        projects.updateFunding(projectId2, 12 ether, 0);
        
        // Check that global soft cap is reached
        assertEq(projects.getTotalSoftCapReached(), 20 ether);
    }
    
    function testDefaultMaxActivePerCategory() public {
        projects.setDefaultMaxActivePerCategory(3);
        
        // Should be able to create up to 3 projects in a category
        for (uint i = 1; i <= 3; i++) {
            bytes32 id = keccak256(abi.encodePacked("project", i));
            projects.createProject(
                id,
                string(abi.encodePacked("Project ", vm.toString(i))),
                "Description",
                10 ether,
                5 ether,
                15 ether,
                "education",
                0,
                true
            );
        }
        
        // Fourth project should fail
        bytes32 id4 = keccak256("project4");
        vm.expectRevert("category limit exceeded");
        projects.createProject(
            id4,
            "Project 4",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "education",
            0,
            true
        );
    }
    
    function testAutomaticStatusTransitions() public {
        // Create project with soft cap
        projects.createProject(
            projectId1,
            "Test Project",
            "Description",
            10 ether,
            6 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        // Update funding to reach soft cap
        projects.updateFunding(projectId1, 6 ether, 0);
        
        // Status should automatically change to funding_ready
        (,,,,,, string memory status,,,,,) = projects.getProject(projectId1);
        assertEq(status, "funding_ready");
        
        // Update funding to reach target
        projects.updateFunding(projectId1, 10 ether, 0);
        
        // Status should change to ready_to_payout
        (,,,,,, status,,,,,) = projects.getProject(projectId1);
        assertEq(status, "ready_to_payout");
    }
    
    function testDeadlineExpiry() public {
        uint256 deadline = block.timestamp + 30 days;
        
        // Create project with deadline
        projects.createProject(
            projectId1,
            "Deadline Project",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            deadline,
            true
        );
        
        // Fast forward past deadline
        vm.warp(deadline + 1);
        
        // Trigger deadline check
        projects.checkDeadline(projectId1);
        
        // Project should be cancelled
        (,,,,,, string memory status,,,,,) = projects.getProject(projectId1);
        assertEq(status, "cancelled");
    }
    
    function testFailCreateDuplicateProject() public {
        projects.createProject(
            projectId1,
            "Project 1",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        // Try to create project with same ID
        projects.createProject(
            projectId1,
            "Duplicate Project",
            "Description",
            8 ether,
            4 ether,
            12 ether,
            "infrastructure",
            0,
            true
        );
    }
    
    function testFailInvalidTargetAmounts() public {
        // Soft cap greater than target
        vm.expectRevert("invalid caps");
        projects.createProject(
            projectId1,
            "Invalid Project",
            "Description",
            5 ether,
            10 ether, // soft cap > target
            15 ether,
            "infrastructure",
            0,
            true
        );
    }
    
    function testFailInvalidHardCap() public {
        // Hard cap less than target
        vm.expectRevert("invalid caps");
        projects.createProject(
            projectId1,
            "Invalid Project",
            "Description",
            10 ether,
            5 ether,
            8 ether, // hard cap < target
            "infrastructure",
            0,
            true
        );
    }
    
    function testFailUpdateNonexistentProject() public {
        projects.updateProjectStatus(projectId1, "voting");
    }
    
    function testFailUnauthorizedUpdate() public {
        // Create project
        projects.createProject(
            projectId1,
            "Test Project",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        // Try to update from non-owner address
        vm.prank(user1);
        projects.updateProjectStatus(projectId1, "voting");
    }
    
    function testGetProjectsByCategory() public {
        // Create projects in different categories
        projects.createProject(
            projectId1,
            "Infrastructure Project",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        projects.createProject(
            projectId2,
            "Healthcare Project",
            "Description",
            8 ether,
            4 ether,
            12 ether,
            "healthcare",
            0,
            true
        );
        
        projects.createProject(
            projectId3,
            "Another Infrastructure",
            "Description",
            6 ether,
            3 ether,
            9 ether,
            "infrastructure",
            0,
            true
        );
        
        // Get infrastructure projects count
        assertEq(projects.getActiveCategoryCount("infrastructure"), 2);
        assertEq(projects.getActiveCategoryCount("healthcare"), 1);
        assertEq(projects.getActiveCategoryCount("education"), 0);
    }
    
    function testProjectValidation() public {
        // Test empty name
        vm.expectRevert("empty name");
        projects.createProject(
            projectId1,
            "",
            "Description",
            10 ether,
            5 ether,
            15 ether,
            "infrastructure",
            0,
            true
        );
        
        // Test zero target
        vm.expectRevert("zero target");
        projects.createProject(
            projectId1,
            "Valid Name",
            "Description",
            0,
            0,
            0,
            "infrastructure",
            0,
            true
        );
    }
}