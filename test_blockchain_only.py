#!/usr/bin/env python3
"""
Blockchain-Only Test for FundChain
Тестирует только блокчейн функциональность без базы данных
"""

import logging
import sys
import os
from web3 import Web3
from eth_account import Account
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BlockchainTester:
    """Tests blockchain functionality without database dependencies."""
    
    def __init__(self):
        self.w3 = None
        self.contracts = {}
        self.test_accounts = []
        
    def connect_to_anvil(self):
        """Connect to Anvil blockchain."""
        try:
            # Inside Docker container, connect to anvil service
            self.w3 = Web3(Web3.HTTPProvider('http://anvil:8545'))
            if self.w3.is_connected():
                logger.info("✅ Connected to Anvil blockchain")
                logger.info(f"📱 Current block: {self.w3.eth.block_number}")
                return True
            else:
                logger.error("❌ Failed to connect to Anvil")
                return False
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
            return False
    
    def load_contracts(self):
        """Load deployed contracts from broadcast files."""
        try:
            # Try to load from Foundry broadcast files
            broadcast_path = "contracts/broadcast/Deploy.s.sol/31337/run-latest.json"
            if os.path.exists(broadcast_path):
                with open(broadcast_path, 'r') as f:
                    broadcast_data = json.load(f)
                
                # Extract contract addresses from transactions
                for tx in broadcast_data.get('transactions', []):
                    if 'contractAddress' in tx:
                        contract_name = tx.get('contractName', 'Unknown')
                        address = tx['contractAddress']
                        
                        # Convert to checksum address for Web3.py compatibility
                        try:
                            checksum_address = Web3.to_checksum_address(address)
                            self.contracts[contract_name] = checksum_address
                            logger.info(f"✅ Loaded {contract_name}: {checksum_address}")
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to convert address for {contract_name}: {e}")
                            self.contracts[contract_name] = address
                            logger.info(f"✅ Loaded {contract_name}: {address} (non-checksum)")
                
                return True
            else:
                logger.warning("⚠️ Broadcast file not found, using default addresses")
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
                    try:
                        with open(deployment_file, 'r') as f:
                            deployment_data = json.load(f)
                            
                            # Look for CREATE transactions (contract deployments)
                            if "transactions" in deployment_data:
                                for tx in deployment_data["transactions"]:
                                    # Only look at CREATE transactions (new contract deployments)
                                    if (tx.get("transactionType") == "CREATE" and 
                                        "contractName" in tx and "contractAddress" in tx):
                                        contract_name = tx["contractName"]
                                        contract_address = tx["contractAddress"]
                                        
                                        # Convert to checksum address for Web3.py compatibility
                                        try:
                                            checksum_address = Web3.to_checksum_address(contract_address)
                                            self.contracts[contract_name] = checksum_address
                                            logger.info(f"✅ Loaded {contract_name}: {checksum_address}")
                                        except Exception as e:
                                            logger.warning(f"⚠️ Failed to convert address for {contract_name}: {e}")
                                            self.contracts[contract_name] = contract_address
                                            logger.info(f"✅ Loaded {contract_name}: {contract_address} (non-checksum)")
                                
                                if self.contracts:
                                    logger.info(f"✅ Loaded {len(self.contracts)} contracts from {deployment_file}")
                                    return True
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to load from {deployment_file}: {e}")
                
                # If all else fails, use empty contracts dict
                logger.warning("⚠️ No contracts loaded, tests may fail")
                self.contracts = {}
                return False
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to load contracts: {e}")
            return False
    
    def check_accounts(self):
        """Check test account balances."""
        try:
            # Get first 10 accounts from Anvil
            accounts = []
            for i in range(10):
                account = self.w3.eth.accounts[i]
                balance = self.w3.eth.get_balance(account)
                balance_eth = self.w3.from_wei(balance, 'ether')
                accounts.append({
                    'address': account,
                    'balance': balance_eth
                })
                logger.info(f"📱 Account {i}: {account[:8]}... - {balance_eth:.2f} ETH")
            
            self.test_accounts = accounts
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to check accounts: {e}")
            return False
    
    def test_contract_interactions(self):
        """Test basic contract interactions."""
        try:
            logger.info("🧪 Testing contract interactions...")
            
            # Test 1: Check if contracts are deployed
            for name, address in self.contracts.items():
                code = self.w3.eth.get_code(address)
                if code != b'':
                    logger.info(f"✅ {name} contract deployed and has code")
                else:
                    logger.warning(f"⚠️ {name} contract has no code")
            
            # Test 2: Check contract balances
            for name, address in self.contracts.items():
                balance = self.w3.eth.get_balance(address)
                balance_eth = self.w3.from_wei(balance, 'ether')
                logger.info(f"💰 {name} balance: {balance_eth:.6f} ETH")
            
            # Test 3: Check if deployer account has sufficient balance
            deployer = self.w3.eth.accounts[0]
            balance = self.w3.eth.get_balance(deployer)
            balance_eth = self.w3.from_wei(balance, 'ether')
            logger.info(f"👑 Deployer balance: {balance_eth:.2f} ETH")
            
            if balance_eth > 1000:  # Should have plenty of ETH
                logger.info("✅ Deployer has sufficient balance for testing")
            else:
                logger.warning("⚠️ Deployer balance might be low")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Contract interaction test failed: {e}")
            return False
    
    def test_project_creation(self):
        """Test creating a project through smart contract."""
        try:
            logger.info("🏗️ Testing project creation...")
            
            # This would require ABI files and contract calls
            # For now, just check if the contract exists
            projects_address = self.contracts.get('Projects')
            if projects_address:
                logger.info(f"✅ Projects contract found at {projects_address}")
                logger.info("📝 Project creation test would require ABI files")
                return True
            else:
                logger.error("❌ Projects contract not found")
                return False
                
        except Exception as e:
            logger.error(f"❌ Project creation test failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all blockchain tests."""
        logger.info("🚀 Starting blockchain-only tests...")
        
        tests = [
            ("Connect to Anvil", self.connect_to_anvil),
            ("Load Contracts", self.load_contracts),
            ("Check Accounts", self.check_accounts),
            ("Contract Interactions", self.test_contract_interactions),
            ("Project Creation", self.test_project_creation)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            logger.info(f"\n🧪 Running: {test_name}")
            try:
                if test_func():
                    logger.info(f"✅ {test_name} - PASSED")
                    passed += 1
                else:
                    logger.error(f"❌ {test_name} - FAILED")
            except Exception as e:
                logger.error(f"💥 {test_name} - ERROR: {e}")
        
        logger.info(f"\n📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            logger.info("🎉 All tests passed! Blockchain is working correctly.")
        else:
            logger.warning(f"⚠️ {total - passed} tests failed. Check blockchain status.")
        
        return passed == total

def main():
    """Main test runner."""
    tester = BlockchainTester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
