// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
import "forge-std/Script.sol";
import "../src/Treasury.sol";
import "../src/Projects.sol";
import "../src/GovernanceSBT.sol";
import "../src/BallotCommitReveal.sol";
import "../src/CommunityMultisig.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        Treasury treasury = new Treasury();
        Projects projects = new Projects();
        GovernanceSBT sbt = new GovernanceSBT();
        BallotCommitReveal ballot = new BallotCommitReveal(address(sbt));
        address[] memory owners = new address[](1);
        owners[0] = msg.sender;
        CommunityMultisig multisig = new CommunityMultisig(owners, 1);
        vm.stopBroadcast();
    }
}
