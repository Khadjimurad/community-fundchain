#!/usr/bin/env python3
"""
Fund Anvil Accounts
Пополняет баланс всех 10 тестовых аккаунтов Anvil для тестирования
"""

import logging
import sys
import os
from web3 import Web3
from eth_account import Account

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AnvilAccountFunder:
    """Funds all Anvil test accounts with ETH."""
    
    def __init__(self):
        self.web3 = None
        self.deployer_account = None
        self.deployer_private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        
        # Anvil test accounts (first 10 accounts)
        self.test_accounts = [
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Account 0 (deployer)
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Account 1
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  # Account 2
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906",  # Account 3
            "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",  # Account 4
            "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",  # Account 5
            "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",  # Account 6
            "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",  # Account 7
            "0x10ECd8B004F1834802058e431F3498606746EfcF",  # Account 8
            "0x05Ac88aB43F4daCBa3D47BF7d9821AE4037Ab7a1"   # Account 9
        ]
        
        # Target balance for each account (in ETH)
        self.target_balance = Web3.to_wei(100, 'ether')  # 100 ETH per account
    
    def initialize_web3(self):
        """Initialize Web3 connection to Anvil."""
        try:
            # Try localhost first, then Docker container
            urls = [
                "http://localhost:8545",
                "http://anvil:8545"
            ]
            
            for url in urls:
                try:
                    self.web3 = Web3(Web3.HTTPProvider(url))
                    if self.web3.is_connected():
                        logger.info(f"✅ Connected to Anvil at {url}")
                        break
                except Exception as e:
                    logger.warning(f"⚠️ Failed to connect to {url}: {e}")
                    continue
            
            if not self.web3 or not self.web3.is_connected():
                raise Exception("Failed to connect to any Anvil instance")
            
            # Set deployer account
            self.deployer_account = Account.from_key(self.deployer_private_key)
            self.web3.eth.default_account = self.deployer_account.address
            
            # Check deployer balance
            deployer_balance = self.web3.eth.get_balance(self.deployer_account.address)
            logger.info(f"📱 Deployer account: {self.deployer_account.address}")
            logger.info(f"💰 Deployer balance: {self.web3.from_wei(deployer_balance, 'ether')} ETH")
            
            if deployer_balance < Web3.to_wei(1000, 'ether'):
                logger.warning("⚠️ Deployer balance is low, may not be able to fund all accounts")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Web3: {e}")
            raise
    
    def check_account_balances(self):
        """Check current balances of all test accounts."""
        try:
            logger.info("🔍 Checking current account balances...")
            
            total_needed = 0
            accounts_to_fund = []
            
            for i, address in enumerate(self.test_accounts):
                try:
                    balance = self.web3.eth.get_balance(address)
                    balance_eth = self.web3.from_wei(balance, 'ether')
                    
                    if balance < self.target_balance:
                        needed = self.target_balance - balance
                        total_needed += needed
                        accounts_to_fund.append({
                            'index': i,
                            'address': address,
                            'current_balance': balance,
                            'needed': needed
                        })
                        logger.info(f"   Account {i}: {balance_eth:.2f} ETH (needs {self.web3.from_wei(needed, 'ether'):.2f} ETH)")
                    else:
                        logger.info(f"   Account {i}: {balance_eth:.2f} ETH ✅ (sufficient)")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to check balance for Account {i}: {e}")
                    continue
            
            logger.info(f"📊 Total ETH needed: {self.web3.from_wei(total_needed, 'ether'):.2f} ETH")
            logger.info(f"📋 Accounts to fund: {len(accounts_to_fund)}")
            
            return accounts_to_fund, total_needed
            
        except Exception as e:
            logger.error(f"❌ Failed to check account balances: {e}")
            raise
    
    def fund_accounts(self, accounts_to_fund):
        """Fund accounts that need ETH."""
        try:
            if not accounts_to_fund:
                logger.info("✅ All accounts already have sufficient balance")
                return
            
            logger.info(f"💰 Funding {len(accounts_to_fund)} accounts...")
            
            funded_count = 0
            failed_count = 0
            
            for account_info in accounts_to_fund:
                try:
                    account_index = account_info['index']
                    address = account_info['address']
                    needed = account_info['needed']
                    
                    logger.info(f"💰 Funding Account {account_index}: {address[:8]}...")
                    
                    # Build transaction
                    txn = {
                        'from': self.deployer_account.address,
                        'to': address,
                        'value': needed,
                        'nonce': self.web3.eth.get_transaction_count(self.deployer_account.address),
                        'gas': 21000,
                        'gasPrice': self.web3.eth.gas_price
                    }
                    
                    # Sign and send transaction
                    signed_txn = self.web3.eth.account.sign_transaction(txn, self.deployer_private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
                    
                    # Wait for transaction receipt
                    receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    if receipt.status == 1:
                        # Check new balance
                        new_balance = self.web3.eth.get_balance(address)
                        new_balance_eth = self.web3.from_wei(new_balance, 'ether')
                        
                        logger.info(f"   ✅ Funded successfully!")
                        logger.info(f"      Sent: {self.web3.from_wei(needed, 'ether'):.2f} ETH")
                        logger.info(f"      New balance: {new_balance_eth:.2f} ETH")
                        logger.info(f"      Transaction: {tx_hash.hex()}")
                        
                        funded_count += 1
                    else:
                        logger.warning(f"   ❌ Transaction failed")
                        failed_count += 1
                        
                except Exception as e:
                    logger.warning(f"   ❌ Failed to fund Account {account_index}: {e}")
                    failed_count += 1
                    continue
            
            logger.info(f"📊 Funding completed: {funded_count} successful, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"❌ Failed to fund accounts: {e}")
            raise
    
    def verify_funding(self):
        """Verify that all accounts now have sufficient balance."""
        try:
            logger.info("🔍 Verifying funding results...")
            
            all_sufficient = True
            insufficient_accounts = []
            
            for i, address in enumerate(self.test_accounts):
                try:
                    balance = self.web3.eth.get_balance(address)
                    balance_eth = self.web3.from_wei(balance, 'ether')
                    
                    if balance >= self.target_balance:
                        logger.info(f"   Account {i}: {balance_eth:.2f} ETH ✅ (sufficient)")
                    else:
                        logger.warning(f"   Account {i}: {balance_eth:.2f} ETH ❌ (insufficient)")
                        all_sufficient = False
                        insufficient_accounts.append(i)
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to verify Account {i}: {e}")
                    all_sufficient = False
                    insufficient_accounts.append(i)
                    continue
            
            if all_sufficient:
                logger.info("🎉 All accounts have sufficient balance!")
            else:
                logger.warning(f"⚠️ {len(insufficient_accounts)} accounts still have insufficient balance")
                logger.warning(f"   Insufficient accounts: {insufficient_accounts}")
            
            return all_sufficient
            
        except Exception as e:
            logger.error(f"❌ Failed to verify funding: {e}")
            raise
    
    def run_funding(self):
        """Run the complete account funding process."""
        try:
            logger.info("🚀 Starting Anvil account funding process...")
            
            # Initialize Web3
            self.initialize_web3()
            
            # Check current balances
            accounts_to_fund, total_needed = self.check_account_balances()
            
            if accounts_to_fund:
                # Fund accounts
                self.fund_accounts(accounts_to_fund)
                
                # Verify funding
                self.verify_funding()
            else:
                logger.info("✅ All accounts already have sufficient balance")
            
            logger.info("🎉 Account funding process completed!")
            
        except Exception as e:
            logger.error(f"❌ Account funding failed: {e}")
            raise

def main():
    """Main function."""
    try:
        funder = AnvilAccountFunder()
        funder.run_funding()
        
    except Exception as e:
        logger.error(f"❌ Main execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
