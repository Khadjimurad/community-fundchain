// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IProjects {
    enum Status { Draft, Active, FundingReady, Voting, ReadyToPayout, Paid, Cancelled, Archived }
    function projects(bytes32 id) external view returns (
        bytes32,
        string memory,
        string memory,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        Status,
        string memory,
        uint256,
        bool,
        uint256,
        uint256
    );
    function updateFunding(bytes32 id, uint256 totalAllocated, uint256 totalPaidOut) external;
}

interface IGovernanceSBT {
    function updateWeight(address who, uint256 totalDonated) external;
}

contract Treasury {
    address public admin;
    IProjects public projectsContract;
    IGovernanceSBT public sbtContract;
    
    // Donor tracking
    mapping(address => uint256) public totalDonatedBy;
    mapping(address => uint256) public totalUnallocatedBy;
    
    // Project allocation tracking
    mapping(bytes32 => uint256) public totalAllocatedTo;
    mapping(bytes32 => uint256) public totalPaidOutFrom;
    mapping(address => mapping(bytes32 => uint256)) public allocationOf;
    
    // Refund policies
    enum RefundPolicy { ToPersonalBalance, ToGeneralTreasury }
    RefundPolicy public defaultRefundPolicy = RefundPolicy.ToPersonalBalance;
    mapping(address => RefundPolicy) public donorRefundPolicy;
    mapping(address => uint256) public personalBalance;
    
    // Donation receipts
    mapping(address => bytes32[]) public donationReceipts;
    mapping(bytes32 => DonationReceipt) public receipts;
    
    struct DonationReceipt {
        address donor;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
        bytes32[] allocatedProjects;
        uint256[] allocatedAmounts;
    }
    
    // Events
    event DonationReceived(address indexed donor, uint256 amount, bytes32 indexed receiptId);
    event AllocationSet(bytes32 indexed projectId, uint256 amount, address indexed donor, bytes32 indexed receiptId);
    event AllocationReassigned(bytes32 indexed fromProjectId, bytes32 indexed toProjectId, uint256 amount, address indexed donor);
    event AllocationTopUp(bytes32 indexed projectId, uint256 amount, address indexed donor, bytes32 indexed receiptId);
    event AllocationReleased(bytes32 indexed projectId, uint256 amount, address indexed to, bytes32 indexed payoutId);
    event AllocationRefunded(bytes32 indexed projectId, uint256 amount, address indexed donor, string reason);
    event RefundPolicySet(address indexed donor, RefundPolicy policy);
    event PersonalBalanceUpdated(address indexed donor, uint256 newBalance);
    
    constructor() { 
        admin = msg.sender; 
    }
    
    function setContracts(address _projectsContract, address _sbtContract) external {
        require(msg.sender == admin, "only admin");
        projectsContract = IProjects(_projectsContract);
        sbtContract = IGovernanceSBT(_sbtContract);
    }

    // Core donation function
    function donate() external payable returns (bytes32 receiptId) {
        require(msg.value > 0, "no value");
        
        receiptId = keccak256(abi.encodePacked(msg.sender, block.timestamp, msg.value, block.number));
        
        totalDonatedBy[msg.sender] += msg.value;
        totalUnallocatedBy[msg.sender] += msg.value;
        
        // Create receipt
        receipts[receiptId] = DonationReceipt({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1),
            allocatedProjects: new bytes32[](0),
            allocatedAmounts: new uint256[](0)
        });
        
        donationReceipts[msg.sender].push(receiptId);
        
        // Update SBT weight
        if (address(sbtContract) != address(0)) {
            sbtContract.updateWeight(msg.sender, totalDonatedBy[msg.sender]);
        }
        
        emit DonationReceived(msg.sender, msg.value, receiptId);
    }

    // Allocation functions
    function allocate(bytes32 projectId, uint256 amount) external returns (bytes32 receiptId) {
        require(amount > 0, "no amount");
        require(totalUnallocatedBy[msg.sender] >= amount, "insufficient unallocated funds");
        
        // Check project exists and is not cancelled
        (, , , , , , , , IProjects.Status status, , , , , ) = projectsContract.projects(projectId);
        require(status != IProjects.Status.Cancelled, "project cancelled");
        require(status != IProjects.Status.Paid, "project already paid");
        
        receiptId = keccak256(abi.encodePacked(msg.sender, block.timestamp, amount, projectId, "allocation"));
        
        totalUnallocatedBy[msg.sender] -= amount;
        allocationOf[msg.sender][projectId] += amount;
        totalAllocatedTo[projectId] += amount;
        
        // Update project funding
        if (address(projectsContract) != address(0)) {
            projectsContract.updateFunding(projectId, totalAllocatedTo[projectId], totalPaidOutFrom[projectId]);
        }
        
        // Create receipt
        receipts[receiptId] = DonationReceipt({
            donor: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1),
            allocatedProjects: new bytes32[](1),
            allocatedAmounts: new uint256[](1)
        });
        receipts[receiptId].allocatedProjects[0] = projectId;
        receipts[receiptId].allocatedAmounts[0] = amount;
        
        donationReceipts[msg.sender].push(receiptId);
        
        emit AllocationSet(projectId, amount, msg.sender, receiptId);
    }

    function allocateMultiple(bytes32[] calldata projectIds, uint256[] calldata amounts) external returns (bytes32 receiptId) {
        require(projectIds.length == amounts.length, "length mismatch");
        require(projectIds.length > 0, "no projects");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "amount must be > 0");
            totalAmount += amounts[i];
        }
        
        require(totalUnallocatedBy[msg.sender] >= totalAmount, "insufficient unallocated funds");
        
        receiptId = keccak256(abi.encodePacked(msg.sender, block.timestamp, totalAmount, "multi_allocation"));
        
        totalUnallocatedBy[msg.sender] -= totalAmount;
        
        // Create receipt
        receipts[receiptId] = DonationReceipt({
            donor: msg.sender,
            amount: totalAmount,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1),
            allocatedProjects: projectIds,
            allocatedAmounts: amounts
        });
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            bytes32 projectId = projectIds[i];
            uint256 amount = amounts[i];
            
            // Check project status
            (, , , , , , , , IProjects.Status status, , , , , ) = projectsContract.projects(projectId);
            require(status != IProjects.Status.Cancelled, "project cancelled");
            require(status != IProjects.Status.Paid, "project already paid");
            
            allocationOf[msg.sender][projectId] += amount;
            totalAllocatedTo[projectId] += amount;
            
            // Update project funding
            if (address(projectsContract) != address(0)) {
                projectsContract.updateFunding(projectId, totalAllocatedTo[projectId], totalPaidOutFrom[projectId]);
            }
            
            emit AllocationSet(projectId, amount, msg.sender, receiptId);
        }
        
        donationReceipts[msg.sender].push(receiptId);
    }

    function reassign(bytes32 fromProjectId, bytes32 toProjectId, uint256 amount) external {
        require(allocationOf[msg.sender][fromProjectId] >= amount, "insufficient allocation");
        
        // Check source project allows reassignment (not paid out yet)
        (, , , , , , , , IProjects.Status fromStatus, , , , , ) = projectsContract.projects(fromProjectId);
        require(fromStatus != IProjects.Status.Paid, "cannot reassign from paid project");
        
        // Check target project exists and is not cancelled/paid
        (, , , , , , , , IProjects.Status toStatus, , , , , ) = projectsContract.projects(toProjectId);
        require(toStatus != IProjects.Status.Cancelled, "target project cancelled");
        require(toStatus != IProjects.Status.Paid, "target project already paid");
        
        allocationOf[msg.sender][fromProjectId] -= amount;
        totalAllocatedTo[fromProjectId] -= amount;
        allocationOf[msg.sender][toProjectId] += amount;
        totalAllocatedTo[toProjectId] += amount;
        
        // Update both projects funding
        if (address(projectsContract) != address(0)) {
            projectsContract.updateFunding(fromProjectId, totalAllocatedTo[fromProjectId], totalPaidOutFrom[fromProjectId]);
            projectsContract.updateFunding(toProjectId, totalAllocatedTo[toProjectId], totalPaidOutFrom[toProjectId]);
        }
        
        emit AllocationReassigned(fromProjectId, toProjectId, amount, msg.sender);
    }

    // Top-up existing allocation
    function topUp(bytes32 projectId, uint256 amount) external returns (bytes32 receiptId) {
        require(amount > 0, "no amount");
        require(totalUnallocatedBy[msg.sender] >= amount, "insufficient unallocated funds");
        require(allocationOf[msg.sender][projectId] > 0, "no existing allocation");
        
        // Check project status
        (, , , , , , , , IProjects.Status status, , , , , ) = projectsContract.projects(projectId);
        require(status != IProjects.Status.Cancelled, "project cancelled");
        require(status != IProjects.Status.Paid, "project already paid");
        
        receiptId = keccak256(abi.encodePacked(msg.sender, block.timestamp, amount, projectId, "topup"));
        
        totalUnallocatedBy[msg.sender] -= amount;
        allocationOf[msg.sender][projectId] += amount;
        totalAllocatedTo[projectId] += amount;
        
        // Update project funding
        if (address(projectsContract) != address(0)) {
            projectsContract.updateFunding(projectId, totalAllocatedTo[projectId], totalPaidOutFrom[projectId]);
        }
        
        // Create receipt
        receipts[receiptId] = DonationReceipt({
            donor: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1),
            allocatedProjects: new bytes32[](1),
            allocatedAmounts: new uint256[](1)
        });
        receipts[receiptId].allocatedProjects[0] = projectId;
        receipts[receiptId].allocatedAmounts[0] = amount;
        
        donationReceipts[msg.sender].push(receiptId);
        
        emit AllocationTopUp(projectId, amount, msg.sender, receiptId);
    }

    // Payout functions (admin only)
    function payout(address payable to, bytes32 projectId, uint256 amount, bytes32 payoutId) external {
        require(msg.sender == admin, "only admin");
        require(address(this).balance >= amount, "insufficient treasury balance");
        require(totalAllocatedTo[projectId] >= amount, "insufficient project allocation");
        
        totalPaidOutFrom[projectId] += amount;
        
        // Update project funding
        if (address(projectsContract) != address(0)) {
            projectsContract.updateFunding(projectId, totalAllocatedTo[projectId], totalPaidOutFrom[projectId]);
        }
        
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        
        emit AllocationReleased(projectId, amount, to, payoutId);
    }
    
    // Refund functions for cancelled projects
    function refundCancelledProject(bytes32 projectId) external {
        // Check project is cancelled
        (, , , , , , , , IProjects.Status status, , , , , ) = projectsContract.projects(projectId);
        require(status == IProjects.Status.Cancelled, "project not cancelled");
        
        uint256 allocation = allocationOf[msg.sender][projectId];
        require(allocation > 0, "no allocation to refund");
        
        allocationOf[msg.sender][projectId] = 0;
        totalAllocatedTo[projectId] -= allocation;
        
        RefundPolicy policy = donorRefundPolicy[msg.sender];
        if (policy == RefundPolicy.ToPersonalBalance) {
            personalBalance[msg.sender] += allocation;
            emit PersonalBalanceUpdated(msg.sender, personalBalance[msg.sender]);
        } else {
            totalUnallocatedBy[msg.sender] += allocation;
        }
        
        emit AllocationRefunded(projectId, allocation, msg.sender, "project cancelled");
    }
    
    // Personal balance management
    function withdrawPersonalBalance() external {
        uint256 amount = personalBalance[msg.sender];
        require(amount > 0, "no balance to withdraw");
        
        personalBalance[msg.sender] = 0;
        
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        
        emit PersonalBalanceUpdated(msg.sender, 0);
    }
    
    function setRefundPolicy(RefundPolicy policy) external {
        donorRefundPolicy[msg.sender] = policy;
        emit RefundPolicySet(msg.sender, policy);
    }
    
    // View functions
    function balance() external view returns (uint256) { 
        return address(this).balance; 
    }
    
    function getDonationReceipts(address donor) external view returns (bytes32[] memory) {
        return donationReceipts[donor];
    }
    
    function getProjectFunding(bytes32 projectId) external view returns (uint256 allocated, uint256 paidOut) {
        return (totalAllocatedTo[projectId], totalPaidOutFrom[projectId]);
    }
    
    function getDonorStats(address donor) external view returns (
        uint256 totalDonated,
        uint256 totalUnallocated,
        uint256 personalBalanceAmount,
        RefundPolicy refundPolicy
    ) {
        return (
            totalDonatedBy[donor],
            totalUnallocatedBy[donor],
            personalBalance[donor],
            donorRefundPolicy[donor]
        );
    }
    
    function getAllocatedAmount(address donor, bytes32 projectId) external view returns (uint256) {
        return allocationOf[donor][projectId];
    }
}
