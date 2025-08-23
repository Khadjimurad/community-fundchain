// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IGovSBT {
    function weightOf(address who) external view returns (uint256);
    function hasToken(address who) external view returns (bool);
}

contract BallotCommitReveal {
    address public admin;
    IGovSBT public sbt;

    struct VoteRound {
        uint256 startCommit;
        uint256 endCommit;
        uint256 endReveal;
        bool finalized;
        bytes32[] projectIds;
        mapping(address => bytes32) commits;
        mapping(bytes32 => uint256) forWeight;
        mapping(bytes32 => uint256) againstWeight;
        uint256 abstained;
        uint256 turnout;
    }

    uint256 public lastRoundId;
    mapping(uint256 => VoteRound) public rounds;

    event RoundStarted(uint256 indexed id, uint256 startCommit, uint256 endCommit, uint256 endReveal, bytes32[] projectIds);
    event VoteCommitted(uint256 indexed id, address indexed voter, bytes32 hash);
    event VoteRevealed(uint256 indexed id, address indexed voter, bytes32[] projects, uint8[] choices, uint256 weight);
    event VoteFinalized(uint256 indexed id);

    constructor(address sbtAddress) { admin = msg.sender; sbt = IGovSBT(sbtAddress); }

    function startRound(uint256 commitDuration, uint256 revealDuration, bytes32[] calldata projectIds) external {
        require(msg.sender == admin, "only admin");
        lastRoundId += 1;
        VoteRound storage vr = rounds[lastRoundId];
        vr.startCommit = block.timestamp;
        vr.endCommit = block.timestamp + commitDuration;
        vr.endReveal = vr.endCommit + revealDuration;
        vr.projectIds = projectIds;
        emit RoundStarted(lastRoundId, vr.startCommit, vr.endCommit, vr.endReveal, projectIds);
    }

    // choices: 0 = NotParticipating, 1 = Abstain, 2 = Against, 3 = For
    function commit(uint256 roundId, bytes32 hash) external {
        VoteRound storage vr = rounds[roundId];
        require(block.timestamp <= vr.endCommit && block.timestamp >= vr.startCommit, "commit closed");
        require(sbt.hasToken(msg.sender), "not a member");
        vr.commits[msg.sender] = hash;
        emit VoteCommitted(roundId, msg.sender, hash);
    }

    function reveal(uint256 roundId, bytes32[] calldata projects, uint8[] calldata choices, bytes32 salt) external {
        VoteRound storage vr = rounds[roundId];
        require(block.timestamp > vr.endCommit && block.timestamp <= vr.endReveal, "reveal closed");
        require(projects.length == choices.length, "length mismatch");
        require(vr.commits[msg.sender] != bytes32(0), "no commit");
        bytes32 h = keccak256(abi.encode(projects, choices, salt, msg.sender));
        require(h == vr.commits[msg.sender], "bad reveal");
        uint256 w = IGovSBT(sbt).weightOf(msg.sender);
        for (uint256 i = 0; i < projects.length; i++) {
            uint8 c = choices[i];
            if (c == 3) { vr.forWeight[projects[i]] += w; }
            else if (c == 2) { vr.againstWeight[projects[i]] += w; }
            else if (c == 1) { vr.abstained += 1; }
        }
        vr.turnout += 1;
        vr.commits[msg.sender] = bytes32(0);
        emit VoteRevealed(roundId, msg.sender, projects, choices, w);
    }

    function finalize(uint256 roundId) external {
        VoteRound storage vr = rounds[roundId];
        require(block.timestamp > vr.endReveal, "not finished");
        require(!vr.finalized, "already");
        vr.finalized = true;
        emit VoteFinalized(roundId);
    }

    function forOf(uint256 roundId, bytes32 projectId) external view returns (uint256) { return rounds[roundId].forWeight[projectId]; }
    function againstOf(uint256 roundId, bytes32 projectId) external view returns (uint256) { return rounds[roundId].againstWeight[projectId]; }
}
