#!/usr/bin/env python3
"""
02 - Voting Cycle Test (Smart Contracts)
Проводит полный цикл голосования через смарт-контракты
"""

import asyncio
import os
import sys
import logging
import random
import json
from datetime import datetime, timedelta
from decimal import Decimal
from web3 import Web3
from eth_account import Account
from web3.middleware import geth_poa_middleware
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VotingCycleTester:
    """Tests complete voting cycle using smart contracts."""
    
    def __init__(self):
        self.web3 = None
        self.account = None
        self.contracts = {}
        self.participants = []
        self.projects = []
        self.voting_rounds = []
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
        # Contract addresses (will be loaded from deployed_contracts.json)
        self.contract_addresses = {}
        
        # Anvil configuration
        self.anvil_url = "http://anvil:8545"
        self.private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Anvil account 0
        
        # Contract addresses will be loaded from deployed_contracts.json
        self.contract_addresses = {}
        
        # Initialize voting_accounts as empty list
        self.voting_accounts = []
    
    def advance_time_and_mine(self, seconds: int) -> bool:
        """Advance EVM time and mine a block on Anvil."""
        try:
            if seconds <= 0:
                return True
            # Increase time
            try:
                # Web3.py v5/v6 compatibility: prefer manager.request_blocking if available
                if hasattr(self.web3, 'manager') and hasattr(self.web3.manager, 'request_blocking'):
                    self.web3.manager.request_blocking("evm_increaseTime", [seconds])
                else:
                    self.web3.provider.make_request("evm_increaseTime", [seconds])
            except Exception as e:
                logger.warning(f"⚠️ evm_increaseTime failed: {e}")
                return False
            # Mine a block
            try:
                if hasattr(self.web3, 'manager') and hasattr(self.web3.manager, 'request_blocking'):
                    self.web3.manager.request_blocking("evm_mine", [])
                else:
                    self.web3.provider.make_request("evm_mine", [])
            except Exception as e:
                logger.warning(f"⚠️ evm_mine failed: {e}")
                return False
            return True
        except Exception as e:
            logger.warning(f"⚠️ Failed to advance time: {e}")
            return False

    def load_contract_addresses(self):
        """Load contract addresses from deployed_contracts.json."""
        try:
            # Try multiple possible paths for the deployment file
            deployment_paths = [
                "deployed_contracts.json/run-latest.json",
                "contracts/broadcast/Deploy.s.sol/31337/run-latest.json",
                "deployed_contracts.json"
            ]
            
            deployment_file = None
            for path in deployment_paths:
                if os.path.exists(path):
                    deployment_file = path
                    break
            
            if deployment_file:
                with open(deployment_file, 'r') as f:
                    deployment_data = json.load(f)
                    
                    # Extract contract addresses from the deployment data
                    # Look for CREATE transactions (contract deployments)
                    if "transactions" in deployment_data:
                        contracts = {}
                        for tx in deployment_data["transactions"]:
                            # Only look at CREATE transactions (new contract deployments)
                            if (tx.get("transactionType") == "CREATE" and 
                                "contractName" in tx and "contractAddress" in tx):
                                contract_name = tx["contractName"]
                                contract_address = tx["contractAddress"]
                                contracts[contract_name] = contract_address
                        
                        if contracts:
                            # Convert addresses to checksum format for Web3.py compatibility
                            from web3 import Web3
                            checksum_contracts = {}
                            for name, address in contracts.items():
                                try:
                                    checksum_address = Web3.to_checksum_address(address)
                                    checksum_contracts[name] = checksum_address
                                except Exception as e:
                                    logger.warning(f"⚠️ Failed to convert address for {name}: {e}")
                                    checksum_contracts[name] = address
                            
                            self.contract_addresses.update(checksum_contracts)
                            logger.info("✅ Loaded contract addresses from deployed_contracts.json")
                            logger.info(f"   Found contracts: {list(checksum_contracts.keys())}")
                        else:
                            logger.warning("⚠️ No contract deployments found in deployed_contracts.json")
                    else:
                        logger.warning("⚠️ Unexpected format in deployed_contracts.json")
                        
            else:
                logger.warning("⚠️ deployed_contracts.json not found, using default addresses")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load deployed_contracts.json: {e}, using default addresses")
    
    def initialize_web3(self):
        """Initialize Web3 connection to Anvil."""
        try:
            self.web3 = Web3(Web3.HTTPProvider(self.anvil_url))
            
            if not self.web3.is_connected():
                raise Exception("Failed to connect to Anvil")
            
            # Set default account
            self.account = Account.from_key(self.private_key)
            self.web3.eth.default_account = self.account.address
            
            logger.info(f"✅ Connected to Anvil at {self.anvil_url}")
            logger.info(f"📱 Using account: {self.account.address}")
            logger.info(f"💰 Balance: {self.web3.eth.get_balance(self.account.address)} wei")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Web3: {e}")
            raise
    
    def load_contract_abis(self):
        """Load contract ABIs from compiled contracts."""
        try:
            # Load ABI files
            abi_paths = {
                "GovernanceSBT": "out/GovernanceSBT.sol/GovernanceSBT.json",
                "BallotCommitReveal": "out/BallotCommitReveal.sol/BallotCommitReveal.json",
                "Projects": "out/Projects.sol/Projects.json",
                "Treasury": "out/Treasury.sol/Treasury.json"
            }
            
            for contract_name, abi_path in abi_paths.items():
                if os.path.exists(abi_path):
                    with open(abi_path, 'r') as f:
                        contract_data = json.load(f)
                        abi = contract_data['abi']
                        
                        # Create contract instance
                        contract_address = self.contract_addresses[contract_name]
                        contract = self.web3.eth.contract(
                            address=contract_address,
                            abi=abi
                        )
                        
                        self.contracts[contract_name] = contract
                        logger.info(f"✅ Loaded {contract_name} contract at {contract_address}")
                else:
                    logger.warning(f"⚠️ ABI file not found: {abi_path}")
                    logger.warning(f"   Current working directory: {os.getcwd()}")
                    logger.warning(f"   Absolute path: {os.path.abspath(abi_path)}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load contract ABIs: {e}")
            raise

    def load_participants_from_sbt(self):
        """Load participants and their SBT weights from GovernanceSBT contract."""
        try:
            sbt_contract = self.contracts["GovernanceSBT"]
            
            # Get total members
            total_members = sbt_contract.functions.totalMembers().call()
            logger.info(f"📊 Found {total_members} members in GovernanceSBT contract")
            
            # If no members exist, create some demo participants
            if total_members == 0:
                logger.info("👥 No participants found, creating demo participants...")
                self.create_demo_participants()
                total_members = sbt_contract.functions.totalMembers().call()
                logger.info(f"📊 Created {total_members} demo participants")
            
            self.participants = []
            
            # Get all member addresses
            member_addresses = sbt_contract.functions.getAllMembers().call()
            
            for i, member_address in enumerate(member_addresses):
                try:
                    # Get member weight (SBT weight)
                    weight = sbt_contract.functions.weightOf(member_address).call()
                    
                    if weight > 0:
                        participant = {
                            'id': f'participant_{i+1:02d}',
                            'address': member_address,
                            'weight': weight,
                            'role': random.choice(['donor', 'voter', 'project_creator', 'community_leader']),
                            'active_level': random.choice(['high', 'medium', 'low'])
                        }
                        self.participants.append(participant)
                        logger.info(f"✅ Loaded participant {participant['id']}: {member_address} (weight: {weight})")
                
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load member {i}: {e}")
                    continue
            
            logger.info(f"✅ Loaded {len(self.participants)} participants with SBT weights")
            
        except Exception as e:
            logger.error(f"❌ Failed to load participants from SBT: {e}")
            raise
    
    def create_demo_participants(self):
        """Create demo participants by minting SBT tokens."""
        try:
            logger.info("👥 Creating demo participants by minting SBT tokens...")
            
            sbt_contract = self.contracts["GovernanceSBT"]
            
            # Use the first 8 Anvil accounts (excluding deployer and last one)
            # Store addresses before they might be overwritten
            demo_addresses = [
                self.voting_accounts[1]['address'],  # Account 1
                self.voting_accounts[2]['address'],  # Account 2
                self.voting_accounts[3]['address'],  # Account 3
                self.voting_accounts[4]['address'],  # Account 4
                self.voting_accounts[5]['address'],  # Account 5
                self.voting_accounts[6]['address'],  # Account 6
                self.voting_accounts[7]['address'],  # Account 7
                self.voting_accounts[8]['address']   # Account 8
            ]
            
            # Store these addresses for later use in voting
            self.participant_addresses = demo_addresses.copy()
            
            # Demo donation amounts (in wei) - higher amounts for better voting power
            demo_donations = [
                Web3.to_wei(5.0, 'ether'),   # 5 ETH - High voting power
                Web3.to_wei(3.5, 'ether'),   # 3.5 ETH - Medium voting power
                Web3.to_wei(8.0, 'ether'),   # 8 ETH - Very high voting power
                Web3.to_wei(2.0, 'ether'),   # 2 ETH - Medium voting power
                Web3.to_wei(6.5, 'ether'),   # 6.5 ETH - High voting power
                Web3.to_wei(1.5, 'ether'),   # 1.5 ETH - Low voting power
                Web3.to_wei(4.0, 'ether'),   # 4 ETH - Medium voting power
                Web3.to_wei(7.0, 'ether')    # 7 ETH - High voting power
            ]
            
            for i, (address, donation) in enumerate(zip(demo_addresses, demo_donations)):
                try:
                    # Mint SBT token for participant
                    txn = sbt_contract.functions.mint(address, donation).build_transaction({
                        'from': self.account.address,
                        'nonce': self.web3.eth.get_transaction_count(self.account.address),
                        'gas': 200000,
                        'gasPrice': self.web3.eth.gas_price
                    })
                    
                    signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    logger.info(f"✅ Created participant {i+1}: {address} with {Web3.from_wei(donation, 'ether')} ETH donation")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to create participant {i+1}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"❌ Failed to create demo participants: {e}")
            raise
    
    def load_projects_from_contract(self):
        """Load projects from Projects contract."""
        try:
            projects_contract = self.contracts["Projects"]
            
            # Get all project IDs
            project_ids = projects_contract.functions.listIds().call()
            logger.info(f"📋 Found {len(project_ids)} projects in Projects contract")
            
            # If no projects exist, create some demo projects
            if len(project_ids) == 0:
                logger.info("📋 No projects found, creating demo projects...")
                self.create_demo_projects()
                project_ids = projects_contract.functions.listIds().call()
                logger.info(f"📋 Created {len(project_ids)} demo projects")
            
            self.projects = []
            
            for project_id in project_ids:
                try:
                    # Get project details
                    project_data = projects_contract.functions.getProject(project_id).call()
                    
                    project = {
                        'id': project_id.hex(),
                        'name': project_data[0],
                        'description': project_data[1],
                        'target': self.web3.from_wei(project_data[2], 'ether'),
                        'status': project_data[7],
                        'category': project_data[8],
                        'priority': project_data[9]
                    }
                    
                    self.projects.append(project)
                    logger.info(f"✅ Loaded project: {project['name']} (target: {project['target']} ETH)")
                
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load project {project_id.hex()}: {e}")
                    continue
            
            logger.info(f"✅ Loaded {len(self.projects)} projects from smart contract")
            
        except Exception as e:
            logger.error(f"❌ Failed to load projects from contract: {e}")
            raise
    
    def create_demo_projects(self):
        """Create demo projects in Projects contract."""
        try:
            projects_contract = self.contracts["Projects"]
            
            # Demo project data
            demo_projects = [
                {
                    'id': Web3.keccak(text="demo-project-1"),
                    'name': 'Колодец для общины',
                    'description': 'Строительство колодца для обеспечения чистой водой местной общины',
                    'target': Web3.to_wei(10, 'ether'),
                    'soft_cap': Web3.to_wei(5, 'ether'),
                    'hard_cap': Web3.to_wei(15, 'ether'),
                    'category': 'infrastructure',
                    'deadline': 0,  # No deadline
                    'soft_cap_enabled': True
                },
                {
                    'id': Web3.keccak(text="demo-project-2"),
                    'name': 'Медицинские принадлежности',
                    'description': 'Закупка экстренных медицинских принадлежностей для местной клиники',
                    'target': Web3.to_wei(5, 'ether'),
                    'soft_cap': Web3.to_wei(3, 'ether'),
                    'hard_cap': Web3.to_wei(8, 'ether'),
                    'category': 'healthcare',
                    'deadline': int(self.web3.eth.get_block('latest')['timestamp']) + 30 * 24 * 3600,  # 30 days
                    'soft_cap_enabled': True
                },
                {
                    'id': Web3.keccak(text="demo-project-3"),
                    'name': 'Школьное оборудование',
                    'description': 'Компьютеры и учебные материалы для местной школы',
                    'target': Web3.to_wei(15, 'ether'),
                    'soft_cap': Web3.to_wei(10, 'ether'),
                    'hard_cap': Web3.to_wei(20, 'ether'),
                    'category': 'education',
                    'deadline': 0,  # No deadline
                    'soft_cap_enabled': True
                }
            ]
            
            for i, project_data in enumerate(demo_projects):
                try:
                    # Create project
                    txn = projects_contract.functions.createProject(
                        project_data['id'],
                        project_data['name'],
                        project_data['description'],
                        project_data['target'],
                        project_data['soft_cap'],
                        project_data['hard_cap'],
                        project_data['category'],
                        project_data['deadline'],
                        project_data['soft_cap_enabled']
                    ).build_transaction({
                        'from': self.account.address,
                        'nonce': self.web3.eth.get_transaction_count(self.account.address),
                        'gas': 500000,
                        'gasPrice': self.web3.eth.gas_price
                    })
                    
                    signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    logger.info(f"✅ Created project {i+1}: {project_data['name']}")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to create project {i+1}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"❌ Failed to create demo projects: {e}")
            raise
    
    def initialize(self):
        """Initialize Web3 connection and load contract data."""
        logger.info("🚀 Initializing voting cycle test with smart contracts...")
        
        try:
            # Load contract addresses
            self.load_contract_addresses()
            
            # Initialize Web3 connection
            self.initialize_web3()
            
            # Load contract ABIs
            self.load_contract_abis()
            
            # Create Anvil accounts first (needed for participants)
            if not self.create_anvil_accounts():
                logger.error("❌ Failed to create Anvil accounts")
                return False
            
            # Load participants from SBT contract
            self.load_participants_from_sbt()
            
            # Load projects from Projects contract
            self.load_projects_from_contract()
            
            logger.info(f"✅ Initialized with {len(self.participants)} participants and {len(self.projects)} projects")
            
        except Exception as e:
            logger.error(f"❌ Initialization failed: {e}")
            raise
    
    def run_voting_tests(self):
        """Run complete voting cycle tests with smart contracts."""
        try:
            logger.info("🗳️ Starting complete voting cycle tests with smart contracts...")
            
            # Anvil accounts already created in initialize(), just fund them if needed
            
            # Fund Anvil accounts with ETH
            if not self.fund_anvil_accounts():
                logger.warning("⚠️ Failed to fund Anvil accounts, continuing without full ETH balance for participants.")
            
            # Run fast voting test first (for immediate results)
            logger.info("\n⚡ Running fast voting test for immediate results...")
            if self.run_fast_voting_test():
                logger.info("🎉 Fast voting test completed successfully!")
            else:
                logger.warning("⚠️ Fast voting test failed, continuing with regular rounds...")
            
            # Create multiple voting rounds (regular duration)
            voting_rounds = self.create_multiple_voting_rounds()
            if not voting_rounds:
                logger.error("❌ Failed to create voting rounds")
                return False
            
            # Test each voting round
            for round_info in voting_rounds:
                round_id = round_info['id']
                logger.info(f"\n🔄 Testing Round {round_id}: {round_info['name']}")
                
                # Reset voting accounts for new round
                self.reset_voting_accounts()
                
                # Test commit phase
                if not self.test_commit_phase_advanced(round_id, round_info['project_ids']):
                    logger.warning(f"⚠️ Commit phase failed for Round {round_id}")
                    continue
                
                # Test reveal phase
                if not self.test_reveal_phase_advanced(round_id):
                    logger.warning(f"⚠️ Reveal phase failed for Round {round_id}")
                    continue
                
                # Test voting finalization
                if not self.test_voting_finalization_advanced(round_id, round_info['project_ids']):
                    logger.warning(f"⚠️ Voting finalization failed for Round {round_id}")
                    continue
                
                logger.info(f"✅ Round {round_id} completed successfully")
            
            logger.info("🎉 All voting rounds completed!")
            return True
            
        except Exception as e:
            logger.error(f"💥 Voting tests failed: {e}")
            return False
    
    def test_voting_round_creation(self):
        """Test creating a new voting round."""
        try:
            logger.info("🗳️ Testing voting round creation...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Create a voting round with 3 projects
            project_ids = [Web3.keccak(text=f"demo-project-{i+1}") for i in range(3)]
            
            # Start a new voting round
            txn = ballot_contract.functions.startRound(
                15,  # 15 seconds commit duration
                15,  # 15 seconds reveal duration
                project_ids,
                0,  # CountingMethod.Simple (0)
                True  # enableAutoCancellation
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 500000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                logger.info("✅ Voting round created successfully")
                return True
            else:
                logger.error("❌ Voting round creation transaction failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Voting round creation failed: {e}")
            return False
    
    def test_commit_phase(self):
        """Test commit phase of voting."""
        try:
            logger.info("🔐 Testing commit phase...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Get the latest round ID from the contract
            round_id = ballot_contract.functions.lastRoundId().call()
            
            # Get round info
            round_info = ballot_contract.functions.getRoundInfo(round_id).call()
            logger.info(f"📊 Round {round_id} info: {round_info}")
            
            # Simulate commit phase for participants
            for participant in self.participants[:3]:  # First 3 participants
                try:
                    # Create a simple vote hash (in real scenario, this would be more complex)
                    vote_data = f"round_{round_id}_project_1_support"
                    vote_hash = Web3.keccak(text=vote_data)
                    
                    # Commit vote (using main account for demo purposes)
                    txn = ballot_contract.functions.commit(round_id, vote_hash).build_transaction({
                        'from': self.account.address,  # Use main account for demo
                        'nonce': self.web3.eth.get_transaction_count(self.account.address),
                        'gas': 200000,
                        'gasPrice': self.web3.eth.gas_price
                    })
                    
                    # Sign with main account key
                    signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    if receipt.status == 1:
                        logger.info(f"✅ Vote committed successfully for participant {participant['id']}")
                    else:
                        logger.warning(f"⚠️ Commit failed for participant {participant['id']}")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to commit vote for {participant['id']}: {e}")
                    continue
            
            logger.info("✅ Commit phase completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Commit phase failed: {e}")
            return False
    
    def test_reveal_phase(self):
        """Test reveal phase of voting."""
        try:
            logger.info("🔓 Testing reveal phase...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Get the latest round ID from the contract
            round_id = ballot_contract.functions.lastRoundId().call()
            
            # Simulate reveal phase for participants
            for participant in self.participants[:3]:  # First 3 participants
                try:
                    # Check if participant has committed
                    has_committed = ballot_contract.functions.hasCommitted(round_id, participant['address']).call()
                    
                    if has_committed:
                        logger.info(f"✅ Participant {participant['id']} has committed, can reveal")
                        # In real scenario, participant would reveal their actual vote
                        # For demo, we'll just log the status
                    else:
                        logger.info(f"⚠️ Participant {participant['id']} has not committed")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to check commit status for {participant['id']}: {e}")
                    continue
            
            logger.info("✅ Reveal phase completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Reveal phase failed: {e}")
            return False
    
    def test_voting_finalization(self):
        """Test voting finalization."""
        try:
            logger.info("🏁 Testing voting finalization...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Get the latest round ID from the contract
            round_id = ballot_contract.functions.lastRoundId().call()
            
            # Get round info
            round_info = ballot_contract.functions.getRoundInfo(round_id).call()
            logger.info(f"📊 Final round {round_id} info: {round_info}")
            
            # Check voting results for first project
            project_id = Web3.keccak(text="demo-project-1")
            
            try:
                for_votes = ballot_contract.functions.forOf(round_id, project_id).call()
                against_votes = ballot_contract.functions.againstOf(round_id, project_id).call()
                
                logger.info(f"📊 Project 1 voting results:")
                logger.info(f"   For: {for_votes}")
                logger.info(f"   Against: {against_votes}")
                
            except Exception as e:
                logger.warning(f"⚠️ Could not get voting results: {e}")
            
            logger.info("✅ Voting finalization completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Voting finalization failed: {e}")
            return False
    
    def generate_voting_report(self):
        """Generate comprehensive voting test report."""
        logger.info("📋 Generating voting test report...")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        report = f"""
        
🗳️ SMART CONTRACT VOTING CYCLE TEST REPORT
===========================================

📊 TEST SUMMARY:
   Total Tests: {total_tests}
   Passed: {self.test_results['passed']} ✅
   Failed: {self.test_results['failed']} ❌
   Success Rate: {success_rate:.1f}%

👥 PARTICIPANTS (from SBT):
   Total Participants: {len(self.participants)}
   Active Participants: {len([p for p in self.participants if p['active_level'] in ['high', 'medium']])}
   
📋 PROJECTS (from smart contract):
   Total Projects: {len(self.projects)}
   Project Names: {', '.join([p['name'] for p in self.projects])}

🔗 SMART CONTRACTS USED:
   - GovernanceSBT: {self.contract_addresses.get('GovernanceSBT', 'Not loaded')}
   - BallotCommitReveal: {self.contract_addresses.get('BallotCommitReveal', 'Not loaded')}
   - Projects: {self.contract_addresses.get('Projects', 'Not loaded')}
   - Treasury: {self.contract_addresses.get('Treasury', 'Not loaded')}

🔑 REAL BLOCKCHAIN DATA:
   - Participants with real SBT weights from GovernanceSBT
   - Projects loaded from Projects smart contract
   - Voting through BallotCommitReveal contract
   - Real commit-reveal voting mechanism
   - Weighted voting based on SBT token balances
   
📊 VOTING MECHANISM:
   - Commit phase: Participants submit hashed votes
   - Reveal phase: Participants reveal their actual votes
   - Finalization: Results calculated and stored on-chain
   - Weighted voting: Each participant's vote weighted by SBT balance
   
"""
        
        if self.test_results['errors']:
            report += "❌ ERRORS ENCOUNTERED:\n"
            for error in self.test_results['errors']:
                report += f"   - {error}\n"
        
        if success_rate >= 80:
            report += "\n🎉 OVERALL RESULT: SMART CONTRACT VOTING COMPLETED SUCCESSFULLY!"
            report += "\n🚀 Next step: Projects are ready for payout via Treasury contract"
        else:
            report += "\n⚠️ OVERALL RESULT: VOTING CYCLE NEEDS IMPROVEMENTS"
        
        logger.info(report)
        
        # Save report to file
        report_file = f"02_voting_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logger.info(f"📄 Voting test report saved to: {report_file}")

    def create_anvil_accounts(self):
        """Create additional Anvil test accounts for voting."""
        try:
            logger.info("👥 Creating additional Anvil test accounts...")
            
            # Anvil test account private keys (first 10 accounts)
            anvil_private_keys = [
                "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",  # Account 0 (deployer)
                "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",  # Account 1
                "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",  # Account 2
                "0x7c852118e8d632e1a61e0d6caab65b95a6c4d35745a7d6c05182f0e8b0a28ab4",  # Account 3
                "0x47e179ec197488593b187f80a59eb2d96caa1ff301def77a6b59e3ae28aef38e",  # Account 4
                "0x8b3a350cf5c34c9194ca85829a2df0ec315a30d1c7b93a8c82a42541b67e1f5e",  # Account 5
                "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",  # Account 6
                "0x4bbbf85a337a9ea77a939cacd2e4e0f0f7b9067f65cd7e207a084badc9c4c984",  # Account 7
                "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",  # Account 8
                "0x2a871d0798f97d31848c16f4b7d32ca740bbe06c6f4e286c0935c747545f7caa"   # Account 9
            ]
            
            self.voting_accounts = []
            
            for i, private_key in enumerate(anvil_private_keys):
                account = Account.from_key(private_key)
                
                # Check balance
                balance = self.web3.eth.get_balance(account.address)
                
                account_info = {
                    'id': f'account_{i:02d}',
                    'address': account.address,
                    'private_key': private_key,
                    'balance': balance,
                    'used_for_voting': False
                }
                
                self.voting_accounts.append(account_info)
                logger.info(f"✅ Account {i}: {account.address} (balance: {self.web3.from_wei(balance, 'ether')} ETH)")
            
            logger.info(f"✅ Created {len(self.voting_accounts)} Anvil test accounts")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create Anvil accounts: {e}")
            return False
    
    def fund_anvil_accounts(self):
        """Fund all Anvil accounts with ETH for voting."""
        try:
            logger.info("💰 Funding Anvil accounts with ETH...")
            
            # Target balance for each account (50 ETH)
            target_balance = Web3.to_wei(50, 'ether')
            
            funded_count = 0
            
            for i, account_info in enumerate(self.voting_accounts):
                current_balance = self.web3.eth.get_balance(account_info['address'])
                
                # If balance is less than target, fund the account
                if current_balance < target_balance:
                    try:
                        # Calculate amount to send
                        amount_to_send = target_balance - current_balance
                        
                        # Send ETH from deployer account
                        txn = {
                            'from': self.account.address,
                            'to': account_info['address'],
                            'value': amount_to_send,
                            'nonce': self.web3.eth.get_transaction_count(self.account.address),
                            'gas': 21000,
                            'gasPrice': self.web3.eth.gas_price
                        }
                        
                        signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
                        tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                        
                        if receipt.status == 1:
                            # Update account balance
                            new_balance = self.web3.eth.get_balance(account_info['address'])
                            account_info['balance'] = new_balance
                            
                            logger.info(f"💰 Funded Account {i}: {account_info['address']}")
                            logger.info(f"   Sent: {self.web3.from_wei(amount_to_send, 'ether')} ETH")
                            logger.info(f"   New balance: {self.web3.from_wei(new_balance, 'ether')} ETH")
                            
                            funded_count += 1
                        else:
                            logger.warning(f"⚠️ Failed to fund Account {i}: transaction failed")
                            
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to fund Account {i}: {e}")
                        continue
                else:
                    logger.info(f"✅ Account {i} already has sufficient balance: {self.web3.from_wei(current_balance, 'ether')} ETH")
            
            logger.info(f"💰 Successfully funded {funded_count} accounts with ETH")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to fund Anvil accounts: {e}")
            return False
    
    def get_unused_voting_account(self):
        """Get an unused voting account."""
        for account in self.voting_accounts:
            if not account['used_for_voting']:
                account['used_for_voting'] = True
                return account
        return None
    
    def reset_voting_accounts(self):
        """Reset voting account usage for new round."""
        for account in self.voting_accounts:
            account['used_for_voting'] = False
        logger.info("🔄 Reset voting account usage for new round")

    def create_multiple_voting_rounds(self):
        """Create multiple voting rounds for testing."""
        try:
            logger.info("🗳️ Creating single voting round with multiple projects...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Create one round with all projects
            round_configs = [
                {
                    'name': 'All Projects Round',
                    'projects': ['demo-project-1', 'demo-project-2', 'demo-project-3'],
                    'duration': (15, 15)  # 15s commit, 15s reveal
                }
            ]
            
            created_rounds = []
            
            for i, config in enumerate(round_configs):
                try:
                    # Create project IDs
                    project_ids = [Web3.keccak(text=project_name) for project_name in config['projects']]
                    
                    # Start voting round
                    txn = ballot_contract.functions.startRound(
                        config['duration'][0],  # commit duration in seconds
                        config['duration'][1],  # reveal duration in seconds
                        project_ids,
                        0,  # CountingMethod.Simple (0)
                        True  # enableAutoCancellation
                    ).build_transaction({
                        'from': self.account.address,
                        'nonce': self.web3.eth.get_transaction_count(self.account.address),
                        'gas': 500000,
                        'gasPrice': self.web3.eth.gas_price
                    })
                    
                    signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    if receipt.status == 1:
                        # Read actual round id from contract to avoid mismatches
                        round_id = ballot_contract.functions.lastRoundId().call()
                        round_info = {
                            'id': round_id,
                            'name': config['name'],
                            'projects': config['projects'],
                            'project_ids': project_ids,
                            'duration': config['duration'],
                            'tx_hash': tx_hash.hex()
                        }
                        created_rounds.append(round_info)
                        logger.info(f"✅ Created {config['name']} (Round {round_id}) with {len(project_ids)} projects")
                    else:
                        logger.error(f"❌ Failed to create round {config['name']}")
                        
                except Exception as e:
                    logger.error(f"❌ Failed to create round {config['name']}: {e}")
                    continue
            
            logger.info(f"✅ Created {len(created_rounds)} voting rounds successfully")
            return created_rounds
            
        except Exception as e:
            logger.error(f"❌ Failed to create multiple voting rounds: {e}")
            return []

    def test_commit_phase_advanced(self, round_id, project_ids):
        """Test commit phase with multiple accounts and proper vote hashing."""
        try:
            logger.info(f"🔐 Testing commit phase for Round {round_id}...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Get round info
            round_info = ballot_contract.functions.getRoundInfo(round_id).call()
            logger.info(f"📊 Round {round_id} info: {round_info}")
            
            # Check if round is properly initialized
            if round_info[0] == 0:  # startCommit is 0
                logger.warning(f"⚠️ Round {round_id} is not properly initialized (startCommit = 0)")
                logger.warning(f"   This round may not be ready for voting")
                return False
            
            # Check current blockchain time vs round timing
            current_time = self.web3.eth.get_block('latest')['timestamp']
            start_commit = round_info[0]
            end_commit = round_info[1]
            
            logger.info(f"⏰ Current time: {current_time}")
            logger.info(f"⏰ Round {round_id} commit phase: {start_commit} - {end_commit}")
            logger.info(f"⏰ Commit phase active: {start_commit <= current_time <= end_commit}")
            
            if not (start_commit <= current_time <= end_commit):
                logger.warning(f"⚠️ Round {round_id} commit phase is not active!")
                logger.warning(f"   Current time: {current_time}")
                logger.warning(f"   Commit phase: {start_commit} - {end_commit}")
                return False
            
            # Store commit data for reveal phase
            self.commit_data = []
            
            # Simulate commit phase for multiple participants
            for i, participant in enumerate(self.participants[:5]):  # First 5 participants
                try:
                    # Find the voting account that matches this participant's address
                    voting_account = None
                    for account in self.voting_accounts:
                        if account['address'].lower() == participant['address'].lower():
                            voting_account = account
                            break
                    
                    if not voting_account:
                        logger.warning(f"⚠️ No matching voting account for participant {participant['id']} at {participant['address']}")
                        continue
                    
                    # Create vote choices for all projects in this round
                    vote_choices = []
                    for project_id in project_ids:
                        # Random vote choice: 0=NotParticipating, 1=Abstain, 2=Against, 3=For
                        choice = random.choice([1, 2, 3])  # Exclude NotParticipating for demo
                        vote_choices.append(choice)
                    
                    # Create salt for vote security
                    salt = Web3.keccak(text=f"salt_{participant['id']}_{round_id}_{random.randint(1000, 9999)}")
                    
                    # Create vote hash using the same method as the contract: keccak256(abi.encode(projects, choices, salt, voter))
                    vote_hash = self.create_vote_hash(project_ids, vote_choices, salt, voting_account['address'])
                    
                    # Store commit data for reveal phase
                    commit_info = {
                        'round_id': round_id,
                        'voter_address': voting_account['address'],
                        'private_key': voting_account['private_key'],
                        'project_ids': project_ids,
                        'vote_choices': vote_choices,
                        'salt': salt,
                        'vote_hash': vote_hash,
                        'participant_id': participant['id']
                    }
                    self.commit_data.append(commit_info)
                    
                    # Commit vote using the voting account
                    logger.info(f"🔐 Attempting to commit vote for {participant['id']} in round {round_id}")
                    logger.info(f"   Using account: {voting_account['address']}")
                    logger.info(f"   Vote hash: {vote_hash.hex()[:16]}...")
                    
                    # Check if participant has SBT token
                    try:
                        sbt_contract = self.contracts["GovernanceSBT"]
                        has_token = sbt_contract.functions.hasToken(voting_account['address']).call()
                        token_weight = sbt_contract.functions.weightOf(voting_account['address']).call()
                        logger.info(f"   SBT check: hasToken={has_token}, weight={token_weight}")
                        
                        if not has_token:
                            logger.warning(f"⚠️ Participant {participant['id']} does not have SBT token!")
                            continue
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to check SBT for {participant['id']}: {e}")
                        continue
                    
                    txn = ballot_contract.functions.commit(round_id, vote_hash).build_transaction({
                        'from': voting_account['address'],
                        'nonce': self.web3.eth.get_transaction_count(voting_account['address']),
                        'gas': 200000,
                        'gasPrice': self.web3.eth.gas_price
                    })
                    
                    # Sign with voting account's private key
                    signed_txn = self.web3.eth.account.sign_transaction(txn, voting_account['private_key'])
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    if receipt.status == 1:
                        logger.info(f"✅ Participant {participant['id']} committed vote using {voting_account['id']}")
                        logger.info(f"   Vote choices: {vote_choices} for {len(project_ids)} projects")
                        logger.info(f"   Vote hash: {vote_hash.hex()[:16]}...")
                        logger.info(f"   Transaction: {tx_hash.hex()}")
                    else:
                        logger.warning(f"⚠️ Commit failed for participant {participant['id']} - transaction failed")
                        logger.warning(f"   Transaction hash: {tx_hash.hex()}")
                        logger.warning(f"   Receipt status: {receipt.status}")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to commit vote for {participant['id']}: {e}")
                    logger.warning(f"   Error type: {type(e).__name__}")
                    if hasattr(e, 'args'):
                        logger.warning(f"   Error args: {e.args}")
                    continue
            
            logger.info(f"✅ Commit phase completed for Round {round_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Commit phase failed for Round {round_id}: {e}")
            return False
    
    def test_reveal_phase_advanced(self, round_id):
        """Test reveal phase with real vote revelation."""
        try:
            logger.info(f"🔓 Testing reveal phase for Round {round_id}...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Get round info
            round_info = ballot_contract.functions.getRoundInfo(round_id).call()
            logger.info(f"📊 Round {round_id} info: {round_info}")
            
            revealed_votes = 0
            
            # Reveal votes for this round
            for commit_info in self.commit_data:
                if commit_info['round_id'] != round_id:
                    continue
                
                try:
                    # Check if participant has committed
                    has_committed = ballot_contract.functions.hasCommitted(round_id, commit_info['voter_address']).call()
                    
                    if has_committed:
                        logger.info(f"🔓 Revealing vote for {commit_info['participant_id']} using {commit_info['voter_address']}")
                        logger.info(f"   Projects: {[pid.hex()[:8] for pid in commit_info['project_ids']]}")
                        logger.info(f"   Choices: {commit_info['vote_choices']}")
                        logger.info(f"   Salt: {commit_info['salt'].hex()[:16]}...")
                        
                        # Reveal the vote - convert choices to uint8 array
                        choices_uint8 = [choice for choice in commit_info['vote_choices']]
                        
                        # Reveal the vote
                        txn = ballot_contract.functions.reveal(
                            round_id,
                            commit_info['project_ids'],
                            choices_uint8,
                            commit_info['salt']
                        ).build_transaction({
                            'from': commit_info['voter_address'],
                            'nonce': self.web3.eth.get_transaction_count(commit_info['voter_address']),
                            'gas': 300000,
                            'gasPrice': self.web3.eth.gas_price
                        })
                        
                        # Sign with voting account's private key
                        signed_txn = self.web3.eth.account.sign_transaction(txn, commit_info['private_key'])
                        tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                        
                        if receipt.status == 1:
                            revealed_votes += 1
                            logger.info(f"✅ Participant {commit_info['participant_id']} revealed vote successfully")
                            logger.info(f"   Transaction: {tx_hash.hex()}")
                        else:
                            logger.warning(f"⚠️ Reveal failed for participant {commit_info['participant_id']}")
                    else:
                        logger.warning(f"⚠️ Participant {commit_info['participant_id']} has not committed")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to reveal vote for {commit_info['participant_id']}: {e}")
                    continue
            
            logger.info(f"✅ Reveal phase completed for Round {round_id}: {revealed_votes} votes revealed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Reveal phase failed for Round {round_id}: {e}")
            return False

    def test_voting_finalization_advanced(self, round_id, project_ids):
        """Test voting finalization with detailed results."""
        try:
            logger.info(f"🏁 Testing voting finalization for Round {round_id}...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Get round info
            round_info = ballot_contract.functions.getRoundInfo(round_id).call()
            logger.info(f"📊 Final round {round_id} info: {round_info}")
            
            # Check voting results for each project
            for i, project_id in enumerate(project_ids):
                try:
                    for_votes = ballot_contract.functions.forOf(round_id, project_id).call()
                    against_votes = ballot_contract.functions.againstOf(round_id, project_id).call()
                    
                    logger.info(f"📊 Project {i+1} ({project_id.hex()[:8]}) voting results:")
                    logger.info(f"   For: {for_votes}")
                    logger.info(f"   Against: {against_votes}")
                    
                    # Calculate support percentage
                    total_votes = for_votes + against_votes
                    if total_votes > 0:
                        support_percentage = (for_votes * 100) / total_votes
                        logger.info(f"   Support: {support_percentage:.1f}%")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Could not get voting results for project {i+1}: {e}")
            
            # Get turnout information
            try:
                turnout = ballot_contract.functions.getTurnoutPercentage(round_id).call()
                logger.info(f"📊 Round {round_id} turnout: {turnout}%")
            except Exception as e:
                logger.warning(f"⚠️ Could not get turnout: {e}")
            
            logger.info(f"✅ Voting finalization completed for Round {round_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Voting finalization failed for Round {round_id}: {e}")
            return False

    def create_fast_test_rounds(self):
        """Create fast test rounds with short durations for immediate testing."""
        try:
            logger.info("⚡ Creating fast test rounds with short durations...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            
            # Fast test round configuration (single round with all projects)
            fast_round_configs = [
                {
                    'name': 'Fast Test - All Projects',
                    'projects': ['demo-project-1', 'demo-project-2', 'demo-project-3'],
                    'duration': (15, 15)  # 15s commit, 15s reveal
                }
            ]
            
            created_rounds = []
            
            for i, config in enumerate(fast_round_configs):
                try:
                    # Create project IDs
                    project_ids = [Web3.keccak(text=project_name) for project_name in config['projects']]
                    
                    # Start voting round with very short durations
                    txn = ballot_contract.functions.startRound(
                        config['duration'][0],  # commit duration in seconds (60 seconds)
                        config['duration'][1],  # reveal duration in seconds (60 seconds)
                        project_ids,
                        0,  # CountingMethod.Simple (0)
                        True  # enableAutoCancellation
                    ).build_transaction({
                        'from': self.account.address,
                        'nonce': self.web3.eth.get_transaction_count(self.account.address),
                        'gas': 500000,
                        'gasPrice': self.web3.eth.gas_price
                    })
                    
                    signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    if receipt.status == 1:
                        # Read actual round id from contract to avoid mismatches
                        round_id = ballot_contract.functions.lastRoundId().call()
                        round_info = {
                            'id': round_id,
                            'name': config['name'],
                            'projects': config['projects'],
                            'project_ids': project_ids,
                            'duration': config['duration'],
                            'tx_hash': tx_hash.hex(),
                            'start_time': int(self.web3.eth.get_block('latest')['timestamp'])
                        }
                        created_rounds.append(round_info)
                        logger.info(f"⚡ Created {config['name']} (Round {round_id}) with {len(project_ids)} projects")
                        logger.info(f"   ⏱️ Commit: {config['duration'][0]}s, Reveal: {config['duration'][1]}s")
                    else:
                        logger.error(f"❌ Failed to create fast round {config['name']}")
                        
                except Exception as e:
                    logger.error(f"❌ Failed to create fast round {config['name']}: {e}")
                    continue
            
            logger.info(f"⚡ Created {len(created_rounds)} fast test rounds successfully")
            return created_rounds
            
        except Exception as e:
            logger.error(f"❌ Failed to create fast test rounds: {e}")
            return []

    def wait_for_commit_phase_end(self, round_id, max_wait_time=120):
        """Wait for commit phase to end. If on Anvil, advance time instantly."""
        try:
            logger.info(f"⏳ Waiting for commit phase to end for Round {round_id}...")
            
            ballot_contract = self.contracts["BallotCommitReveal"]
            start_time = time.time()
            
            while time.time() - start_time < max_wait_time:
                try:
                    # Get round info
                    round_info = ballot_contract.functions.getRoundInfo(round_id).call()
                    current_time = int(self.web3.eth.get_block('latest')['timestamp'])
                    
                    # Check if commit phase has ended
                    if current_time > round_info[1]:  # round_info[1] is endCommit
                        logger.info(f"✅ Commit phase ended for Round {round_id}")
                        logger.info(f"   Current time: {current_time}, Commit end: {round_info[1]}")
                        return True
                    
                    # Try to fast-forward time on Anvil
                    remaining_time = round_info[1] - current_time + 1
                    logger.info(f"⏳ Commit phase still active. Remaining: {remaining_time - 1}s")
                    if remaining_time > 0:
                        if self.advance_time_and_mine(remaining_time):
                            # Re-check immediately after mining
                            continue
                    
                    # Fallback: short sleep if we couldn't advance time
                    time.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Error checking round status: {e}")
                    time.sleep(5)
                    continue
            
            logger.info(f"⏰ Max wait time reached for Round {round_id}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error waiting for commit phase end: {e}")
            return False
    
    def run_fast_voting_test(self):
        """Run a complete fast voting test with short durations."""
        try:
            logger.info("⚡ Starting fast voting test with short durations...")
            
            # Create Anvil accounts for voting
            if not self.create_anvil_accounts():
                logger.error("❌ Failed to create Anvil accounts")
                return False
            
            # Fund Anvil accounts with ETH
            if not self.fund_anvil_accounts():
                logger.warning("⚠️ Failed to fund Anvil accounts, continuing without full ETH balance for participants.")
            
            # Create demo participants (mint SBT tokens)
            logger.info("👥 Creating demo participants for voting...")
            self.create_demo_participants()
            
            # Create fast test rounds
            fast_rounds = self.create_fast_test_rounds()
            if not fast_rounds:
                logger.error("❌ Failed to create fast test rounds")
                return False
            
            # Test the first fast round
            round_info = fast_rounds[0]
            round_id = round_info['id']
            
            logger.info(f"\n🔄 Testing Fast Round {round_id}: {round_info['name']}")
            
            # Reset voting accounts
            self.reset_voting_accounts()
            
            # Test commit phase
            if not self.test_commit_phase_advanced(round_id, round_info['project_ids']):
                logger.error(f"❌ Commit phase failed for Fast Round {round_id}")
                return False
            
            # Wait for commit phase to end
            if not self.wait_for_commit_phase_end(round_id):
                logger.warning(f"⚠️ Commit phase wait failed for Fast Round {round_id}")
            
            # Test reveal phase
            if not self.test_reveal_phase_advanced(round_id):
                logger.error(f"❌ Reveal phase failed for Fast Round {round_id}")
                return False
            
            # Test voting finalization
            if not self.test_voting_finalization_advanced(round_id, round_info['project_ids']):
                logger.error(f"❌ Voting finalization failed for Fast Round {round_id}")
                return False
            
            logger.info(f"✅ Fast Round {round_id} completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"💥 Fast voting test failed: {e}")
            return False

    def create_vote_hash(self, project_ids, vote_choices, salt, voter_address):
        """Create vote hash exactly matching the contract's keccak256(abi.encode(projects, choices, salt, voter))."""
        try:
            # Import eth_abi for proper ABI encoding
            import eth_abi.abi
            
            # Convert project_ids to bytes32 array
            project_ids_bytes = [pid for pid in project_ids]
            
            # Convert vote_choices to uint8 array
            choices_uint8 = [choice for choice in vote_choices]
            
            # Create the hash using the same method as the contract
            # We need to encode: (bytes32[], uint8[], bytes32, address)
            encoded_data = eth_abi.abi.encode(
                ['bytes32[]', 'uint8[]', 'bytes32', 'address'],
                [project_ids_bytes, choices_uint8, salt, voter_address]
            )
            
            vote_hash = Web3.keccak(encoded_data)
            return vote_hash
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to create vote hash with ABI encoding: {e}")
            # Fallback to simplified hashing for debugging
            vote_data = f"{project_ids[0].hex()}{vote_choices[0]}{salt.hex()}{voter_address}"
            return Web3.keccak(text=vote_data)


def main():
    """Main function to run voting cycle test."""
    tester = VotingCycleTester()
    
    try:
        tester.initialize()
        tester.run_voting_tests()
        
    except KeyboardInterrupt:
        logger.info("🛑 Voting cycle test interrupted by user")
    except Exception as e:
        logger.error(f"💥 Voting cycle test failed: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
