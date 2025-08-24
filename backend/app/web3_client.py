from web3 import Web3
import json
import os
from .config import get_settings

class Web3Client:
    def __init__(self):
        # Connect to Anvil
        self.w3 = Web3(Web3.HTTPProvider("http://anvil:8545"))
        
        # Contract addresses (from deployment)
        self.contract_addresses = {
            "GovernanceSBT": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "BallotCommitReveal": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
            "Projects": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            "Treasury": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
        }
        
        # Contract ABIs
        self.contract_abis = {}
        self.load_contract_abis()
        
        # Contract instances
        self.contracts = {}
        self.initialize_contracts()
    
    def load_contract_abis(self):
        """Load contract ABIs from compiled contracts."""
        try:
            # Try to load from out directory
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
                        self.contract_abis[contract_name] = contract_data['abi']
                        print(f"✅ Loaded ABI for {contract_name}")
                else:
                    print(f"⚠️ ABI file not found: {abi_path}")
                    
        except Exception as e:
            print(f"❌ Error loading contract ABIs: {e}")
    
    def initialize_contracts(self):
        """Initialize contract instances."""
        try:
            for contract_name, address in self.contract_addresses.items():
                if contract_name in self.contract_abis:
                    abi = self.contract_abis[contract_name]
                    self.contracts[contract_name] = self.w3.eth.contract(
                        address=address,
                        abi=abi
                    )
                    print(f"✅ Initialized {contract_name} contract")
                else:
                    print(f"⚠️ No ABI for {contract_name}")
                    
        except Exception as e:
            print(f"❌ Error initializing contracts: {e}")
    
    def get_contract(self, contract_name: str):
        """Get contract instance by name."""
        return self.contracts.get(contract_name)
    
    def is_connected(self) -> bool:
        """Check if connected to blockchain."""
        return self.w3.is_connected()
    
    def get_latest_block(self):
        """Get latest block number."""
        return self.w3.eth.block_number

# Global instance
_web3_client = None

def get_web3_client() -> Web3Client:
    """Get or create web3 client instance."""
    global _web3_client
    if _web3_client is None:
        _web3_client = Web3Client()
    return _web3_client

# Legacy compatibility
w3 = Web3(Web3.HTTPProvider("http://anvil:8545"))
