// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IGovSBT {
    function weightOf(address who) external view returns (uint256);
    function hasToken(address who) external view returns (bool);
    function totalActiveMembers() external view returns (uint256);
}

interface ITreasury {
    function getAllocatedAmount(address donor, bytes32 projectId) external view returns (uint256);
}

contract BallotCommitReveal {
    address public admin;
    IGovSBT public sbt;
    ITreasury public treasury;
    
    enum VoteChoice { NotParticipating, Abstain, Against, For }
    enum CountingMethod { WeightedVoting, BordaCount }
    
    struct VoteRound {
        uint256 startCommit;
        uint256 endCommit;
        uint256 endReveal;
        bool finalized;
        CountingMethod countingMethod;
        bytes32[] projectIds;
        uint256 snapshotBlock;
        
        // Vote tracking
        mapping(address => bytes32) commits;
        mapping(address => bool) hasVoted;
        mapping(address => bool) hasRevealed;
        
        // Vote results per project
        mapping(bytes32 => uint256) forWeight;
        mapping(bytes32 => uint256) againstWeight;
        mapping(bytes32 => uint256) abstainedCount;
        mapping(bytes32 => uint256) notParticipatingCount;
        
        // Borda count results (for ranking)
        mapping(bytes32 => uint256) bordaPoints;
        
        // Overall statistics
        uint256 totalParticipants; // Addresses that committed
        uint256 totalRevealed; // Addresses that revealed
        uint256 totalActiveMembers; // Snapshot of active SBT holders
        
        // Cancellation rules
        uint256 cancellationThreshold; // % turnout required for cancellation (e.g., 66)
        bool enableAutoCancellation;
    }
    
    uint256 public lastRoundId;
    mapping(uint256 => VoteRound) public rounds;
    
    // Configuration
    uint256 public defaultCommitDuration = 7 days;
    uint256 public defaultRevealDuration = 3 days;
    uint256 public defaultCancellationThreshold = 66; // 66%
    
    event RoundStarted(
        uint256 indexed roundId, 
        uint256 startCommit, 
        uint256 endCommit, 
        uint256 endReveal, 
        bytes32[] projectIds,
        CountingMethod countingMethod,
        uint256 snapshotBlock
    );
    event VoteCommitted(uint256 indexed roundId, address indexed voter, bytes32 hash);
    event VoteRevealed(
        uint256 indexed roundId, 
        address indexed voter, 
        bytes32[] projects, 
        VoteChoice[] choices, 
        uint256 weight
    );
    event VoteFinalized(
        uint256 indexed roundId, 
        bytes32[] projectIds,
        uint256[] forWeights,
        uint256[] againstWeights,
        uint256[] abstainedCounts,
        uint256[] notParticipatingCounts,
        uint256 turnoutPercentage
    );
    event ProjectCancellationTriggered(uint256 indexed roundId, bytes32 indexed projectId, string reason);
    
    constructor(address sbtAddress) { 
        admin = msg.sender; 
        sbt = IGovSBT(sbtAddress); 
    }
    
    function setTreasury(address treasuryAddress) external {
        require(msg.sender == admin, "only admin");
        treasury = ITreasury(treasuryAddress);
    }

    function startRound(
        uint256 commitDuration, 
        uint256 revealDuration, 
        bytes32[] calldata projectIds,
        CountingMethod countingMethod,
        bool enableAutoCancellation
    ) external {
        require(msg.sender == admin, "only admin");
        require(projectIds.length > 0, "no projects");
        
        lastRoundId += 1;
        VoteRound storage vr = rounds[lastRoundId];
        
        vr.startCommit = block.timestamp;
        vr.endCommit = block.timestamp + (commitDuration > 0 ? commitDuration : defaultCommitDuration);
        vr.endReveal = vr.endCommit + (revealDuration > 0 ? revealDuration : defaultRevealDuration);
        vr.projectIds = projectIds;
        vr.countingMethod = countingMethod;
        vr.snapshotBlock = block.number;
        vr.enableAutoCancellation = enableAutoCancellation;
        vr.cancellationThreshold = defaultCancellationThreshold;
        
        // Snapshot total active members
        if (address(sbt) != address(0)) {
            vr.totalActiveMembers = sbt.totalActiveMembers();
        }
        
        emit RoundStarted(
            lastRoundId, 
            vr.startCommit, 
            vr.endCommit, 
            vr.endReveal, 
            projectIds,
            countingMethod,
            vr.snapshotBlock
        );
    }

    // choices: 0 = NotParticipating, 1 = Abstain, 2 = Against, 3 = For
    function commit(uint256 roundId, bytes32 hash) external {
        VoteRound storage vr = rounds[roundId];
        require(block.timestamp <= vr.endCommit && block.timestamp >= vr.startCommit, "commit phase closed");
        require(sbt.hasToken(msg.sender), "not a member");
        require(vr.commits[msg.sender] == bytes32(0), "already committed");
        
        vr.commits[msg.sender] = hash;
        if (!vr.hasVoted[msg.sender]) {
            vr.hasVoted[msg.sender] = true;
            vr.totalParticipants += 1;
        }
        
        emit VoteCommitted(roundId, msg.sender, hash);
    }

    function reveal(
        uint256 roundId, 
        bytes32[] calldata projects, 
        VoteChoice[] calldata choices, 
        bytes32 salt
    ) external {
        VoteRound storage vr = rounds[roundId];
        require(block.timestamp > vr.endCommit && block.timestamp <= vr.endReveal, "reveal phase closed");
        require(projects.length == choices.length, "length mismatch");
        require(vr.commits[msg.sender] != bytes32(0), "no commit found");
        require(!vr.hasRevealed[msg.sender], "already revealed");
        
        // Verify hash
        bytes32 h = keccak256(abi.encode(projects, choices, salt, msg.sender));
        require(h == vr.commits[msg.sender], "invalid reveal");
        
        uint256 weight = sbt.weightOf(msg.sender);
        vr.hasRevealed[msg.sender] = true;
        vr.totalRevealed += 1;
        
        // Process votes
        for (uint256 i = 0; i < projects.length; i++) {
            bytes32 projectId = projects[i];
            VoteChoice choice = choices[i];
            
            if (choice == VoteChoice.For) {
                vr.forWeight[projectId] += weight;
                // Auto-vote for projects with allocations
                if (address(treasury) != address(0)) {
                    uint256 allocation = treasury.getAllocatedAmount(msg.sender, projectId);
                    if (allocation > 0) {
                        vr.forWeight[projectId] += weight; // Double weight for allocated supporters
                    }
                }
            } else if (choice == VoteChoice.Against) {
                vr.againstWeight[projectId] += weight;
            } else if (choice == VoteChoice.Abstain) {
                vr.abstainedCount[projectId] += 1;
            } else if (choice == VoteChoice.NotParticipating) {
                vr.notParticipatingCount[projectId] += 1;
            }
            
            // Borda count calculation (for ranking)
            if (vr.countingMethod == CountingMethod.BordaCount) {
                if (choice == VoteChoice.For) {
                    vr.bordaPoints[projectId] += weight * 3;
                } else if (choice == VoteChoice.Abstain) {
                    vr.bordaPoints[projectId] += weight * 1;
                }
                // Against and NotParticipating get 0 points
            }
        }
        
        // Clear commit to prevent double-reveal
        vr.commits[msg.sender] = bytes32(0);
        
        emit VoteRevealed(roundId, msg.sender, projects, choices, weight);
    }

    function finalize(uint256 roundId) external {
        VoteRound storage vr = rounds[roundId];
        require(block.timestamp > vr.endReveal, "voting not finished");
        require(!vr.finalized, "already finalized");
        
        vr.finalized = true;
        
        // Calculate turnout percentage
        uint256 turnoutPercentage = vr.totalActiveMembers > 0 
            ? (vr.totalRevealed * 100) / vr.totalActiveMembers 
            : 0;
        
        // Prepare arrays for event
        bytes32[] memory projectIds = vr.projectIds;
        uint256[] memory forWeights = new uint256[](projectIds.length);
        uint256[] memory againstWeights = new uint256[](projectIds.length);
        uint256[] memory abstainedCounts = new uint256[](projectIds.length);
        uint256[] memory notParticipatingCounts = new uint256[](projectIds.length);
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            bytes32 projectId = projectIds[i];
            forWeights[i] = vr.forWeight[projectId];
            againstWeights[i] = vr.againstWeight[projectId];
            abstainedCounts[i] = vr.abstainedCount[projectId];
            notParticipatingCounts[i] = vr.notParticipatingCount[projectId];
            
            // Check auto-cancellation rules
            if (vr.enableAutoCancellation && 
                turnoutPercentage >= vr.cancellationThreshold &&
                vr.againstWeight[projectId] > vr.forWeight[projectId]) {
                emit ProjectCancellationTriggered(roundId, projectId, "majority against with sufficient turnout");
            }
        }
        
        emit VoteFinalized(
            roundId,
            projectIds,
            forWeights,
            againstWeights,
            abstainedCounts,
            notParticipatingCounts,
            turnoutPercentage
        );
    }

    // View functions
    function getRoundInfo(uint256 roundId) external view returns (
        uint256 startCommit,
        uint256 endCommit,
        uint256 endReveal,
        bool finalized,
        bytes32[] memory projectIds,
        CountingMethod countingMethod,
        uint256 totalParticipants,
        uint256 totalRevealed,
        uint256 totalActiveMembers
    ) {
        VoteRound storage vr = rounds[roundId];
        return (
            vr.startCommit,
            vr.endCommit,
            vr.endReveal,
            vr.finalized,
            vr.projectIds,
            vr.countingMethod,
            vr.totalParticipants,
            vr.totalRevealed,
            vr.totalActiveMembers
        );
    }
    
    function getProjectVoteResults(uint256 roundId, bytes32 projectId) external view returns (
        uint256 forWeight,
        uint256 againstWeight,
        uint256 abstainedCount,
        uint256 notParticipatingCount,
        uint256 bordaPoints
    ) {
        VoteRound storage vr = rounds[roundId];
        return (
            vr.forWeight[projectId],
            vr.againstWeight[projectId],
            vr.abstainedCount[projectId],
            vr.notParticipatingCount[projectId],
            vr.bordaPoints[projectId]
        );
    }
    
    function hasCommitted(uint256 roundId, address voter) external view returns (bool) {
        return rounds[roundId].commits[voter] != bytes32(0);
    }
    
    function hasRevealed(uint256 roundId, address voter) external view returns (bool) {
        return rounds[roundId].hasRevealed[voter];
    }
    
    function getTurnoutPercentage(uint256 roundId) external view returns (uint256) {
        VoteRound storage vr = rounds[roundId];
        return vr.totalActiveMembers > 0 
            ? (vr.totalRevealed * 100) / vr.totalActiveMembers 
            : 0;
    }
    
    // Admin functions
    function setDefaultDurations(uint256 commitDuration, uint256 revealDuration) external {
        require(msg.sender == admin, "only admin");
        defaultCommitDuration = commitDuration;
        defaultRevealDuration = revealDuration;
    }
    
    function setDefaultCancellationThreshold(uint256 threshold) external {
        require(msg.sender == admin, "only admin");
        require(threshold <= 100, "threshold must be <= 100");
        defaultCancellationThreshold = threshold;
    }
    
    // Legacy compatibility
    function forOf(uint256 roundId, bytes32 projectId) external view returns (uint256) { 
        return rounds[roundId].forWeight[projectId]; 
    }
    
    function againstOf(uint256 roundId, bytes32 projectId) external view returns (uint256) { 
        return rounds[roundId].againstWeight[projectId]; 
    }
}
