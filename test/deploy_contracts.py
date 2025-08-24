#!/usr/bin/env python3
"""
Deploy Contracts to Anvil
Развертывает смарт-контракты на локальном Anvil блокчейне
"""

import json
import os
import logging
from web3 import Web3
from eth_account import Account

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ContractDeployer:
    """Deploys smart contracts to Anvil blockchain."""
    
    def __init__(self):
        self.web3 = None
        self.account = None
        self.contracts = {}
        self.deployed_addresses = {}
        
        # Anvil configuration
        self.anvil_url = "http://anvil:8545"
        self.private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Anvil account 0
        
        # Contract paths
        self.contract_paths = {
            "GovernanceSBT": "out/GovernanceSBT.sol/GovernanceSBT.json",
            "Projects": "out/Projects.sol/Projects.json",
            "Treasury": "out/Treasury.sol/Treasury.json",
            "BallotCommitReveal": "out/BallotCommitReveal.sol/BallotCommitReveal.json",
            "CommunityMultisig": "out/CommunityMultisig.sol/CommunityMultisig.json"
        }
    
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
            logger.info(f"💰 Balance: {self.web3.from_wei(self.web3.eth.get_balance(self.account.address), 'ether')} ETH")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Web3: {e}")
            raise
    
    def load_contract_abi(self, contract_name):
        """Load contract ABI and bytecode."""
        try:
            contract_path = self.contract_paths[contract_name]
            
            if not os.path.exists(contract_path):
                raise Exception(f"Contract file not found: {contract_path}")
            
            with open(contract_path, 'r') as f:
                contract_data = json.load(f)
            
            abi = contract_data['abi']
            bytecode = contract_data['bytecode']['object']
            
            # Remove 0x prefix if present
            if bytecode.startswith('0x'):
                bytecode = bytecode[2:]
            
            return abi, bytecode
            
        except Exception as e:
            logger.error(f"❌ Failed to load {contract_name} ABI: {e}")
            raise
    
    def deploy_contract(self, contract_name, *args):
        """Deploy a single contract."""
        try:
            logger.info(f"🚀 Deploying {contract_name}...")
            
            # Load contract ABI and bytecode
            abi, bytecode = self.load_contract_abi(contract_name)
            
            # Create contract instance
            contract = self.web3.eth.contract(abi=abi, bytecode=bytecode)
            
            # Build constructor transaction
            constructor_txn = contract.constructor(*args).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 5000000,  # High gas limit for deployment
                'gasPrice': self.web3.eth.gas_price
            })
            
            # Sign and send transaction
            signed_txn = self.web3.eth.account.sign_transaction(constructor_txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction receipt
            tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if tx_receipt.status == 1:
                contract_address = tx_receipt.contractAddress
                self.deployed_addresses[contract_name] = contract_address
                logger.info(f"✅ {contract_name} deployed at: {contract_address}")
                logger.info(f"   Transaction: {tx_hash.hex()}")
                return contract_address
            else:
                raise Exception(f"Deployment transaction failed for {contract_name}")
                
        except Exception as e:
            logger.error(f"❌ Failed to deploy {contract_name}: {e}")
            raise
    
    def deploy_all_contracts(self):
        """Deploy all contracts in the correct order."""
        try:
            logger.info("🚀 Starting contract deployment...")
            
            # 1. Deploy GovernanceSBT first (no constructor args)
            governance_sbt = self.deploy_contract("GovernanceSBT")
            
            # 2. Deploy Projects
            projects = self.deploy_contract("Projects")
            
            # 3. Deploy Treasury
            treasury = self.deploy_contract("Treasury")
            
            # 4. Deploy BallotCommitReveal (requires GovernanceSBT address)
            ballot = self.deploy_contract("BallotCommitReveal", governance_sbt)
            
            # 5. Deploy CommunityMultisig
            multisig_owners = [
                self.account.address,  # deployer
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Test address 1
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"   # Test address 2
            ]
            multisig = self.deploy_contract("CommunityMultisig", multisig_owners, 2)
            
            logger.info("✅ All contracts deployed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Contract deployment failed: {e}")
            return False
    
    def configure_contracts(self):
        """Configure cross-contract relationships."""
        try:
            logger.info("🔗 Configuring contract relationships...")
            
            # Get deployed addresses
            governance_sbt = self.deployed_addresses["GovernanceSBT"]
            projects = self.deployed_addresses["Projects"]
            treasury = self.deployed_addresses["Treasury"]
            ballot = self.deployed_addresses["BallotCommitReveal"]
            
            # 1. Configure GovernanceSBT contract
            governance_sbt_contract = self.web3.eth.contract(
                address=governance_sbt,
                abi=self.load_contract_abi("GovernanceSBT")[0]
            )
            
            # Set configuration through admin functions
            # Note: We need to call these functions as admin (deployer)
            logger.info("✅ GovernanceSBT contract configured (using default values)")
            
            # 2. Configure Projects contract
            projects_contract = self.web3.eth.contract(
                address=projects,
                abi=self.load_contract_abi("Projects")[0]
            )
            
            # Set default max active per category
            txn = projects_contract.functions.setDefaultMaxActivePerCategory(10).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            self.web3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info("✅ Projects contract configured")
            
            # 3. Configure Treasury contract
            treasury_contract = self.web3.eth.contract(
                address=treasury,
                abi=self.load_contract_abi("Treasury")[0]
            )
            
            # Link Treasury with Projects and GovernanceSBT
            txn = treasury_contract.functions.setContracts(projects, governance_sbt).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            self.web3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info("✅ Treasury contract configured")
            
            # 4. Configure BallotCommitReveal contract
            ballot_contract = self.web3.eth.contract(
                address=ballot,
                abi=self.load_contract_abi("BallotCommitReveal")[0]
            )
            
            # Set default durations and cancellation threshold
            txn = ballot_contract.functions.setDefaultDurations(
                7 * 24 * 3600,  # 7 days commit duration
                3 * 24 * 3600   # 3 days reveal duration
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Set cancellation threshold
            txn = ballot_contract.functions.setDefaultCancellationThreshold(66).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Link Ballot with Treasury
            txn = ballot_contract.functions.setTreasury(treasury).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_txn = self.web3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            self.web3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info("✅ BallotCommitReveal contract configured")
            
            logger.info("✅ All contract relationships configured!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Contract configuration failed: {e}")
            return False
    
    def save_deployment_info(self):
        """Save deployment information to file."""
        try:
            deployment_info = {
                "network": "anvil",
                "deployer": self.account.address,
                "deployment_time": self.web3.eth.get_block('latest')['timestamp'],
                "contracts": self.deployed_addresses
            }
            
            # Save to file
            with open("deployed_contracts.json", 'w') as f:
                json.dump(deployment_info, f, indent=2)
            
            logger.info("✅ Deployment information saved to deployed_contracts.json")
            
            # Print summary
            logger.info("\n📋 DEPLOYMENT SUMMARY:")
            logger.info("=" * 50)
            for contract_name, address in self.deployed_addresses.items():
                logger.info(f"   {contract_name}: {address}")
            logger.info("=" * 50)
            
        except Exception as e:
            logger.error(f"❌ Failed to save deployment info: {e}")
    
    def run_deployment(self):
        """Run complete deployment process."""
        try:
            # Initialize Web3
            self.initialize_web3()
            
            # Deploy contracts
            if not self.deploy_all_contracts():
                return False
            
            # Configure contracts
            if not self.configure_contracts():
                return False
            
            # Save deployment info
            self.save_deployment_info()
            
            logger.info("🎉 Contract deployment completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"💥 Deployment failed: {e}")
            return False


def main():
    """Main function to run contract deployment."""
    deployer = ContractDeployer()
    
    try:
        success = deployer.run_deployment()
        return 0 if success else 1
        
    except KeyboardInterrupt:
        logger.info("🛑 Deployment interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"💥 Deployment failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
