// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/BallotCommitReveal.sol";
import "../src/GovernanceSBT.sol";
import "../src/Treasury.sol";

contract BallotCommitRevealTest is Test {
    BallotCommitReveal public ballot;
    GovernanceSBT public sbt;
    Treasury public treasury;
    
    address public admin;
    address public voter1;
    address public voter2;
    address public voter3;
    address public nonMember;
    
    bytes32[] public projectIds;
    uint256 public roundId;
    
    event RoundStarted(
        uint256 indexed roundId,
        uint256 startCommit,
        uint256 endCommit,
        uint256 endReveal,
        bytes32[] projectIds,
        BallotCommitReveal.CountingMethod countingMethod,
        uint256 snapshotBlock
    );
    
    event VoteCommitted(uint256 indexed roundId, address indexed voter, bytes32 hash);
    
    event VoteRevealed(
        uint256 indexed roundId,
        address indexed voter,
        bytes32[] projects,
        BallotCommitReveal.VoteChoice[] choices,
        uint256 weight
    );
    
    function setUp() public {
        admin = address(this);
        voter1 = makeAddr("voter1");
        voter2 = makeAddr("voter2");
        voter3 = makeAddr("voter3");
        nonMember = makeAddr("nonMember");
        
        // Deploy contracts
        sbt = new GovernanceSBT();
        ballot = new BallotCommitReveal(address(sbt));
        treasury = new Treasury();
        
        ballot.setTreasury(address(treasury));
        
        // Set up project IDs
        projectIds.push(keccak256("project1"));
        projectIds.push(keccak256("project2"));
        projectIds.push(keccak256("project3"));
        
        // Mint SBTs for voters
        sbt.mint(voter1, 5 ether);  // Weight: 5
        sbt.mint(voter2, 3 ether);  // Weight: 3
        sbt.mint(voter3, 2 ether);  // Weight: 2
        
        // Start a voting round
        roundId = 1;
        ballot.startRound(
            7 days,  // commit duration
            3 days,  // reveal duration
            projectIds,
            BallotCommitReveal.CountingMethod.WeightedVoting,
            true     // auto cancellation
        );
    }
    
    function testStartRound() public {
        bytes32[] memory newProjectIds = new bytes32[](2);
        newProjectIds[0] = keccak256("newProject1");
        newProjectIds[1] = keccak256("newProject2");
        
        vm.expectEmit(true, true, true, true);
        emit RoundStarted(
            2,
            block.timestamp,
            block.timestamp + 7 days,
            block.timestamp + 7 days + 3 days,
            newProjectIds,
            BallotCommitReveal.CountingMethod.BordaCount,
            block.number
        );
        
        ballot.startRound(
            7 days,
            3 days,
            newProjectIds,
            BallotCommitReveal.CountingMethod.BordaCount,
            false
        );
        
        assertEq(ballot.lastRoundId(), 2);
    }
    
    function testCommitVote() public {
        bytes32 commitHash = keccak256(abi.encode(
            projectIds,
            [BallotCommitReveal.VoteChoice.For, BallotCommitReveal.VoteChoice.Against, BallotCommitReveal.VoteChoice.Abstain],
            "salt123",
            voter1
        ));
        
        vm.prank(voter1);
        vm.expectEmit(true, true, true, true);
        emit VoteCommitted(roundId, voter1, commitHash);
        
        ballot.commit(roundId, commitHash);
        
        assertTrue(ballot.hasCommitted(roundId, voter1));
    }
    
    function testRevealVote() public {
        // First commit
        BallotCommitReveal.VoteChoice[] memory choices = new BallotCommitReveal.VoteChoice[](3);
        choices[0] = BallotCommitReveal.VoteChoice.For;
        choices[1] = BallotCommitReveal.VoteChoice.Against;
        choices[2] = BallotCommitReveal.VoteChoice.Abstain;
        
        bytes32 salt = "salt123";
        bytes32 commitHash = keccak256(abi.encode(projectIds, choices, salt, voter1));
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
        
        // Move to reveal phase
        vm.warp(block.timestamp + 7 days + 1);
        
        // Reveal vote
        vm.prank(voter1);
        vm.expectEmit(true, true, true, true);
        emit VoteRevealed(roundId, voter1, projectIds, choices, 5);
        
        ballot.reveal(roundId, projectIds, choices, salt);
        
        assertTrue(ballot.hasRevealed(roundId, voter1));
        
        // Check vote results
        (uint256 forWeight, uint256 againstWeight, uint256 abstainedCount,,) = 
            ballot.getProjectVoteResults(roundId, projectIds[0]);
        assertEq(forWeight, 5);
        
        (forWeight, againstWeight, abstainedCount,,) = 
            ballot.getProjectVoteResults(roundId, projectIds[1]);
        assertEq(againstWeight, 5);
        
        (forWeight, againstWeight, abstainedCount,,) = 
            ballot.getProjectVoteResults(roundId, projectIds[2]);
        assertEq(abstainedCount, 1);
    }
    
    function testBordaCountVoting() public {
        // Start a Borda count round
        bytes32[] memory bordaProjectIds = new bytes32[](2);
        bordaProjectIds[0] = keccak256("bordaProject1");
        bordaProjectIds[1] = keccak256("bordaProject2");
        
        ballot.startRound(
            7 days,
            3 days,
            bordaProjectIds,
            BallotCommitReveal.CountingMethod.BordaCount,
            false
        );
        
        uint256 bordaRoundId = ballot.lastRoundId();
        
        // Commit and reveal votes
        BallotCommitReveal.VoteChoice[] memory choices = new BallotCommitReveal.VoteChoice[](2);
        choices[0] = BallotCommitReveal.VoteChoice.For;
        choices[1] = BallotCommitReveal.VoteChoice.Abstain;
        
        bytes32 salt = "bordaSalt";
        bytes32 commitHash = keccak256(abi.encode(bordaProjectIds, choices, salt, voter1));
        
        vm.prank(voter1);
        ballot.commit(bordaRoundId, commitHash);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(voter1);
        ballot.reveal(bordaRoundId, bordaProjectIds, choices, salt);
        
        // Check Borda points
        (,,,, uint256 bordaPoints) = ballot.getProjectVoteResults(bordaRoundId, bordaProjectIds[0]);
        assertEq(bordaPoints, 5 * 3); // weight * 3 for "For"
        
        (,,,, bordaPoints) = ballot.getProjectVoteResults(bordaRoundId, bordaProjectIds[1]);
        assertEq(bordaPoints, 5 * 1); // weight * 1 for "Abstain"
    }
    
    function testFinalizeRound() public {
        // Set up complete voting scenario
        _setupCompleteVotingScenario();
        
        // Move to after reveal phase
        vm.warp(block.timestamp + 7 days + 3 days + 1);
        
        ballot.finalize(roundId);
        
        (,,, bool finalized,,,,,) = ballot.getRoundInfo(roundId);
        assertTrue(finalized);
        
        uint256 turnout = ballot.getTurnoutPercentage(roundId);
        assertGt(turnout, 0);
    }
    
    function testFailCommitAfterPhase() public {
        // Move past commit phase
        vm.warp(block.timestamp + 7 days + 1);
        
        bytes32 commitHash = keccak256("invalid");
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
    }
    
    function testFailCommitNonMember() public {
        bytes32 commitHash = keccak256("invalid");
        
        vm.prank(nonMember);
        ballot.commit(roundId, commitHash);
    }
    
    function testFailRevealInvalidHash() public {
        // Commit a vote
        BallotCommitReveal.VoteChoice[] memory choices = new BallotCommitReveal.VoteChoice[](3);
        choices[0] = BallotCommitReveal.VoteChoice.For;
        choices[1] = BallotCommitReveal.VoteChoice.Against;
        choices[2] = BallotCommitReveal.VoteChoice.Abstain;
        
        bytes32 salt = "salt123";
        bytes32 commitHash = keccak256(abi.encode(projectIds, choices, salt, voter1));
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
        
        // Move to reveal phase
        vm.warp(block.timestamp + 7 days + 1);
        
        // Try to reveal with wrong salt
        vm.prank(voter1);
        ballot.reveal(roundId, projectIds, choices, "wrongSalt");
    }
    
    function testFailDoubleCommit() public {
        bytes32 commitHash = keccak256("hash1");
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
        
        // Try to commit again
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
    }
    
    function testFailDoubleReveal() public {
        // Set up commit and reveal
        BallotCommitReveal.VoteChoice[] memory choices = new BallotCommitReveal.VoteChoice[](3);
        choices[0] = BallotCommitReveal.VoteChoice.For;
        choices[1] = BallotCommitReveal.VoteChoice.Against;
        choices[2] = BallotCommitReveal.VoteChoice.Abstain;
        
        bytes32 salt = "salt123";
        bytes32 commitHash = keccak256(abi.encode(projectIds, choices, salt, voter1));
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(voter1);
        ballot.reveal(roundId, projectIds, choices, salt);
        
        // Try to reveal again
        vm.prank(voter1);
        ballot.reveal(roundId, projectIds, choices, salt);
    }
    
    function testTurnoutCalculation() public {
        // Only one voter participates
        BallotCommitReveal.VoteChoice[] memory choices = new BallotCommitReveal.VoteChoice[](3);
        choices[0] = BallotCommitReveal.VoteChoice.For;
        choices[1] = BallotCommitReveal.VoteChoice.Against;
        choices[2] = BallotCommitReveal.VoteChoice.Abstain;
        
        bytes32 salt = "salt123";
        bytes32 commitHash = keccak256(abi.encode(projectIds, choices, salt, voter1));
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(voter1);
        ballot.reveal(roundId, projectIds, choices, salt);
        
        // Check turnout (should be 1/3 = 33%)
        uint256 turnout = ballot.getTurnoutPercentage(roundId);
        assertEq(turnout, 33); // 1 revealed out of 3 total members
    }
    
    function testAdminFunctions() public {
        // Test setting default durations
        ballot.setDefaultDurations(5 days, 2 days);
        
        // Test setting cancellation threshold
        ballot.setDefaultCancellationThreshold(75);
        
        // Only admin should be able to call these
        vm.prank(voter1);
        vm.expectRevert("only admin");
        ballot.setDefaultDurations(1 days, 1 days);
    }
    
    function _setupCompleteVotingScenario() internal {
        // Voter 1
        BallotCommitReveal.VoteChoice[] memory choices1 = new BallotCommitReveal.VoteChoice[](3);
        choices1[0] = BallotCommitReveal.VoteChoice.For;
        choices1[1] = BallotCommitReveal.VoteChoice.Against;
        choices1[2] = BallotCommitReveal.VoteChoice.Abstain;
        
        bytes32 salt1 = "salt1";
        bytes32 commitHash1 = keccak256(abi.encode(projectIds, choices1, salt1, voter1));
        
        vm.prank(voter1);
        ballot.commit(roundId, commitHash1);
        
        // Voter 2
        BallotCommitReveal.VoteChoice[] memory choices2 = new BallotCommitReveal.VoteChoice[](3);
        choices2[0] = BallotCommitReveal.VoteChoice.Against;
        choices2[1] = BallotCommitReveal.VoteChoice.For;
        choices2[2] = BallotCommitReveal.VoteChoice.NotParticipating;
        
        bytes32 salt2 = "salt2";
        bytes32 commitHash2 = keccak256(abi.encode(projectIds, choices2, salt2, voter2));
        
        vm.prank(voter2);
        ballot.commit(roundId, commitHash2);
        
        // Move to reveal phase
        vm.warp(block.timestamp + 7 days + 1);
        
        // Reveal votes
        vm.prank(voter1);
        ballot.reveal(roundId, projectIds, choices1, salt1);
        
        vm.prank(voter2);
        ballot.reveal(roundId, projectIds, choices2, salt2);
    }
    
    function testGetRoundInfo() public {
        (
            uint256 startCommit,
            uint256 endCommit,
            uint256 endReveal,
            bool finalized,
            bytes32[] memory retrievedProjects,
            BallotCommitReveal.CountingMethod countingMethod,
            uint256 totalParticipants,
            uint256 totalRevealed,
            uint256 totalActiveMembers
        ) = ballot.getRoundInfo(roundId);
        
        assertEq(startCommit, block.timestamp);
        assertEq(endCommit, block.timestamp + 7 days);
        assertEq(endReveal, block.timestamp + 7 days + 3 days);
        assertFalse(finalized);
        assertEq(retrievedProjects.length, 3);
        assertEq(uint256(countingMethod), uint256(BallotCommitReveal.CountingMethod.WeightedVoting));
        assertEq(totalActiveMembers, 3); // Three SBT holders
    }
}