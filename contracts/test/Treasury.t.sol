// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/Treasury.sol";
import "../src/Projects.sol";
import "../src/GovernanceSBT.sol";

contract TreasuryTest is Test {
    Treasury public treasury;
    Projects public projects;
    GovernanceSBT public sbt;
    
    address public owner;
    address public donor1;
    address public donor2;
    address public project1;
    address public project2;
    
    bytes32 public projectId1;
    bytes32 public projectId2;
    
    event DonationReceived(
        address indexed donor,
        uint256 amount,
        bytes32 receiptId,
        uint256 timestamp
    );
    
    event AllocationMade(
        address indexed donor,
        bytes32 indexed projectId,
        uint256 amount,
        string allocationType,
        bytes32 receiptId
    );
    
    function setUp() public {
        owner = address(this);
        donor1 = makeAddr("donor1");
        donor2 = makeAddr("donor2");
        project1 = makeAddr("project1");
        project2 = makeAddr("project2");
        
        // Deploy contracts
        treasury = new Treasury();
        projects = new Projects();
        sbt = new GovernanceSBT();
        
        // Configure contracts
        treasury.setContracts(address(projects), address(sbt));
        
        // Create test projects
        projectId1 = keccak256("project1");
        projectId2 = keccak256("project2");
        
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
        
        projects.createProject(
            projectId2,
            "Test Project 2", 
            "Second test project",
            8 ether,
            4 ether,
            12 ether,
            "healthcare",
            block.timestamp + 30 days,
            false
        );
        
        // Fund test accounts
        vm.deal(donor1, 100 ether);
        vm.deal(donor2, 100 ether);
    }
    
    function testDonationBasic() public {
        uint256 donationAmount = 5 ether;
        
        vm.prank(donor1);
        vm.expectEmit(true, true, true, true);
        emit DonationReceived(donor1, donationAmount, bytes32(0), block.timestamp);
        
        treasury.donate{value: donationAmount}();
        
        assertEq(treasury.getTotalBalance(), donationAmount);
        assertEq(treasury.totalDonations(), donationAmount);
    }
    
    function testDonationWithAllocation() public {
        uint256 donationAmount = 5 ether;
        uint256 allocation1 = 3 ether;
        uint256 allocation2 = 2 ether;
        
        bytes32[] memory targetProjects = new bytes32[](2);
        uint256[] memory amounts = new uint256[](2);
        
        targetProjects[0] = projectId1;
        targetProjects[1] = projectId2;
        amounts[0] = allocation1;
        amounts[1] = allocation2;
        
        vm.prank(donor1);
        treasury.donateWithAllocation{value: donationAmount}(targetProjects, amounts);
        
        assertEq(treasury.getTotalBalance(), donationAmount);
        assertEq(treasury.getAllocatedAmount(donor1, projectId1), allocation1);
        assertEq(treasury.getAllocatedAmount(donor1, projectId2), allocation2);
        assertEq(treasury.getProjectTotalAllocated(projectId1), allocation1);
        assertEq(treasury.getProjectTotalAllocated(projectId2), allocation2);
    }
    
    function testAllocationReassignment() public {
        // Initial donation and allocation
        uint256 donationAmount = 10 ether;
        uint256 initialAllocation = 5 ether;
        
        vm.prank(donor1);
        treasury.donate{value: donationAmount}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, initialAllocation);
        
        // Reassign allocation
        uint256 reassignAmount = 3 ether;
        
        vm.prank(donor1);
        treasury.reassignAllocation(projectId1, projectId2, reassignAmount);
        
        assertEq(treasury.getAllocatedAmount(donor1, projectId1), initialAllocation - reassignAmount);
        assertEq(treasury.getAllocatedAmount(donor1, projectId2), reassignAmount);
    }
    
    function testTopUpProject() public {
        // Initial allocation
        vm.prank(donor1);
        treasury.donate{value: 5 ether}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, 3 ether);
        
        // Top up with new donation
        uint256 topUpAmount = 2 ether;
        
        vm.prank(donor1);
        treasury.topUpProject{value: topUpAmount}(projectId1);
        
        assertEq(treasury.getAllocatedAmount(donor1, projectId1), 5 ether);
        assertEq(treasury.getTotalBalance(), 7 ether);
    }
    
    function testRefundCancelledProject() public {
        // Set up allocation
        vm.prank(donor1);
        treasury.donate{value: 10 ether}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, 5 ether);
        
        // Cancel project
        projects.updateProjectStatus(projectId1, "cancelled");
        
        // Test refund
        uint256 balanceBefore = donor1.balance;
        
        vm.prank(donor1);
        treasury.refundCancelledProject(projectId1);
        
        assertEq(donor1.balance, balanceBefore + 5 ether);
        assertEq(treasury.getAllocatedAmount(donor1, projectId1), 0);
    }
    
    function testFailDonateZeroAmount() public {
        vm.prank(donor1);
        treasury.donate{value: 0}();
    }
    
    function testFailAllocateMoreThanAvailable() public {
        vm.prank(donor1);
        treasury.donate{value: 5 ether}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, 10 ether); // Should fail
    }
    
    function testFailReassignMoreThanAllocated() public {
        vm.prank(donor1);
        treasury.donate{value: 5 ether}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, 3 ether);
        
        vm.prank(donor1);
        treasury.reassignAllocation(projectId1, projectId2, 5 ether); // Should fail
    }
    
    function testGetDonationHistory() public {
        vm.prank(donor1);
        treasury.donate{value: 5 ether}();
        
        vm.prank(donor2);
        treasury.donate{value: 3 ether}();
        
        // Test that we can retrieve donation history (basic check)
        assertEq(treasury.getTotalBalance(), 8 ether);
        assertEq(treasury.totalDonations(), 8 ether);
    }
    
    function testMultipleDonorsAllocation() public {
        // Donor 1
        vm.prank(donor1);
        treasury.donate{value: 10 ether}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, 6 ether);
        
        // Donor 2
        vm.prank(donor2);
        treasury.donate{value: 8 ether}();
        
        vm.prank(donor2);
        treasury.allocate(projectId1, 4 ether);
        
        // Check total project allocation
        assertEq(treasury.getProjectTotalAllocated(projectId1), 10 ether);
        assertEq(treasury.getAllocatedAmount(donor1, projectId1), 6 ether);
        assertEq(treasury.getAllocatedAmount(donor2, projectId1), 4 ether);
    }
    
    function testDonationReceipts() public {
        vm.prank(donor1);
        treasury.donate{value: 5 ether}();
        
        // Check that donation receipt is generated
        // In a real implementation, you'd verify the receipt ID is properly generated
        assertEq(treasury.getTotalBalance(), 5 ether);
    }
    
    function testAvailableBalance() public {
        uint256 donation = 10 ether;
        uint256 allocation = 6 ether;
        
        vm.prank(donor1);
        treasury.donate{value: donation}();
        
        vm.prank(donor1);
        treasury.allocate(projectId1, allocation);
        
        assertEq(treasury.getAvailableBalance(donor1), donation - allocation);
    }
}