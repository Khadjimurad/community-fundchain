from web3 import Web3
from .config import settings
w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
