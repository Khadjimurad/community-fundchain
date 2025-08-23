from pydantic import BaseModel
import os

class Settings(BaseModel):
    rpc_url: str = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    treasury_address: str = os.getenv("TREASURY_ADDRESS", "")
    projects_address: str = os.getenv("PROJECTS_ADDRESS", "")
    sbt_address: str = os.getenv("SBT_ADDRESS", "")
    ballot_address: str = os.getenv("BALLOT_ADDRESS", "")
    multisig_address: str = os.getenv("MULTISIG_ADDRESS", "")

settings = Settings()
