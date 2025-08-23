// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
import "forge-std/Script.sol";
import "../src/Treasury.sol";
import "../src/Projects.sol";
import "../src/GovernanceSBT.sol";
import "../src/BallotCommitReveal.sol";
import "../src/CommunityMultisig.sol";

contract Deploy is Script {
    // Deployment configuration
    struct DeploymentConfig {
        address[] multisigOwners;
        uint256 multisigRequired;
        uint256 sbtWeightCap;
        uint256 sbtBaseDonationUnit;
        uint256 sbtMinimumDonation;
        uint256 defaultCommitDuration;
        uint256 defaultRevealDuration;
        uint256 defaultCancellationThreshold;
        uint256 defaultMaxActivePerCategory;
        bool globalSoftCapEnabled;
    }
    
    // Deployed contract addresses
    Treasury public treasury;
    Projects public projects;
    GovernanceSBT public governanceSBT;
    BallotCommitReveal public ballot;
    CommunityMultisig public multisig;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Get deployment configuration
        DeploymentConfig memory config = getDeploymentConfig(deployer);
        
        // Deploy contracts in dependency order
        deployContracts(config);
        
        // Configure cross-contract relationships
        configureContracts();
        
        // Initialize with demo data if local network
        if (block.chainid == 31337) { // Anvil
            initializeDemoData();
        }
        
        vm.stopBroadcast();
        
        // Log deployment results
        logDeploymentResults();
        
        // Write deployment artifacts
        writeDeploymentArtifacts();
    }
    
    function getDeploymentConfig(address deployer) internal pure returns (DeploymentConfig memory) {
        address[] memory owners = new address[](3);
        owners[0] = deployer;
        owners[1] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Test address 1
        owners[2] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Test address 2
        
        return DeploymentConfig({
            multisigOwners: owners,
            multisigRequired: 2,
            sbtWeightCap: 100,
            sbtBaseDonationUnit: 1 ether,
            sbtMinimumDonation: 0.1 ether,
            defaultCommitDuration: 7 days,
            defaultRevealDuration: 3 days,
            defaultCancellationThreshold: 66,
            defaultMaxActivePerCategory: 10,
            globalSoftCapEnabled: false
        });
    }
    
    function deployContracts(DeploymentConfig memory config) internal {
        console.log("\\n=== Deploying Contracts ===");
        
        // 1. Deploy GovernanceSBT first
        console.log("Deploying GovernanceSBT...");
        governanceSBT = new GovernanceSBT();
        console.log("GovernanceSBT deployed at:", address(governanceSBT));
        
        // Configure SBT
        governanceSBT.setConfiguration(
            config.sbtWeightCap,
            config.sbtBaseDonationUnit,
            config.sbtMinimumDonation
        );
        
        // 2. Deploy Projects
        console.log("Deploying Projects...");
        projects = new Projects();
        console.log("Projects deployed at:", address(projects));
        
        // Configure Projects
        projects.setDefaultMaxActivePerCategory(config.defaultMaxActivePerCategory);
        projects.setGlobalSoftCap(config.globalSoftCapEnabled);
        
        // 3. Deploy Treasury
        console.log("Deploying Treasury...");
        treasury = new Treasury();
        console.log("Treasury deployed at:", address(treasury));
        
        // 4. Deploy BallotCommitReveal
        console.log("Deploying BallotCommitReveal...");
        ballot = new BallotCommitReveal(address(governanceSBT));
        console.log("BallotCommitReveal deployed at:", address(ballot));
        
        // Configure Ballot
        ballot.setDefaultDurations(config.defaultCommitDuration, config.defaultRevealDuration);
        ballot.setDefaultCancellationThreshold(config.defaultCancellationThreshold);
        
        // 5. Deploy CommunityMultisig
        console.log("Deploying CommunityMultisig...");
        multisig = new CommunityMultisig(config.multisigOwners, config.multisigRequired);
        console.log("CommunityMultisig deployed at:", address(multisig));
    }
    
    function configureContracts() internal {
        console.log("\\n=== Configuring Contract Relationships ===");
        
        // Link Treasury with Projects and SBT
        console.log("Linking Treasury with Projects and GovernanceSBT...");
        treasury.setContracts(address(projects), address(governanceSBT));
        
        // Link Ballot with Treasury
        console.log("Linking BallotCommitReveal with Treasury...");
        ballot.setTreasury(address(treasury));
        
        console.log("Contract configuration completed.");
    }
    
    function initializeDemoData() internal {
        console.log("\\n=== Initializing Demo Data ===");
        
        // Create demo projects
        bytes32 project1Id = keccak256("demo-project-1");
        bytes32 project2Id = keccak256("demo-project-2");
        bytes32 project3Id = keccak256("demo-project-3");
        
        projects.createProject(
            project1Id,
            "Community Well",
            "Clean water access for the community",
            10 ether, // target
            7 ether,  // soft cap
            15 ether, // hard cap
            "infrastructure",
            0, // no deadline
            true // soft cap enabled
        );
        
        projects.createProject(
            project2Id,
            "Medical Supplies",
            "Emergency medical supplies for local clinic",
            5 ether,  // target
            3 ether,  // soft cap
            8 ether,  // hard cap
            "healthcare",
            block.timestamp + 30 days, // 30 day deadline
            true // soft cap enabled
        );
        
        projects.createProject(
            project3Id,
            "School Equipment",
            "Computers and learning materials for local school",
            15 ether, // target
            10 ether, // soft cap
            20 ether, // hard cap
            "education",
            0, // no deadline
            false // hard target required
        );
        
        // Mint demo SBTs
        address deployer = msg.sender;
        governanceSBT.mint(deployer, 5 ether); // Give deployer an SBT with 5 ETH worth
        
        console.log("Demo data initialized:");
        console.log("- 3 demo projects created");
        console.log("- 1 SBT minted for deployer");
    }
    
    function logDeploymentResults() internal view {
        console.log("\\n=== Deployment Results ===");
        console.log("Treasury:", address(treasury));
        console.log("Projects:", address(projects));
        console.log("GovernanceSBT:", address(governanceSBT));
        console.log("BallotCommitReveal:", address(ballot));
        console.log("CommunityMultisig:", address(multisig));
        console.log("\\nDeployment completed successfully!");
    }
    
    function writeDeploymentArtifacts() internal {
        string memory chainId = vm.toString(block.chainid);
        string memory deploymentsDir = string.concat("./deployments/", chainId);
        
        // Create deployments directory structure
        vm.createDir(deploymentsDir, true);
        
        // Write consolidated deployment info
        string memory deploymentInfo = string.concat(
            '{',
            '"chainId":', vm.toString(block.chainid), ',',
            '"deployer":"', vm.toString(msg.sender), '",',
            '"timestamp":', vm.toString(block.timestamp), ',',
            '"contracts":{',
            '"Treasury":"', vm.toString(address(treasury)), '",',
            '"Projects":"', vm.toString(address(projects)), '",',
            '"GovernanceSBT":"', vm.toString(address(governanceSBT)), '",',
            '"BallotCommitReveal":"', vm.toString(address(ballot)), '",',
            '"CommunityMultisig":"', vm.toString(address(multisig)), '"',
            '}',
            '}'
        );
        
        vm.writeFile(
            string.concat(deploymentsDir, "/deployment.json"),
            deploymentInfo
        );
        
        // Write .env format for easy backend integration
        string memory envContent = string.concat(
            "# Contract Addresses - Chain ID: ", chainId, "\\n",
            "TREASURY_ADDRESS=", vm.toString(address(treasury)), "\\n",
            "PROJECTS_ADDRESS=", vm.toString(address(projects)), "\\n",
            "GOVERNANCE_SBT_ADDRESS=", vm.toString(address(governanceSBT)), "\\n",
            "BALLOT_ADDRESS=", vm.toString(address(ballot)), "\\n",
            "MULTISIG_ADDRESS=", vm.toString(address(multisig)), "\\n"
        );
        
        vm.writeFile(
            string.concat(deploymentsDir, "/contracts.env"),
            envContent
        );
        
        console.log("\\nDeployment artifacts written to:", deploymentsDir);
    }
}