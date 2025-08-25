import os
from functools import lru_cache
from typing import Optional
# Temporary fix for BaseSettings compatibility
try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    try:
        from pydantic import BaseSettings
    except ImportError:
        # If neither works, create a minimal BaseSettings class
        from pydantic import BaseModel
        class BaseSettings(BaseModel):
            class Config:
                env_file = ".env"
                case_sensitive = False
from pydantic import Field

class Settings(BaseSettings):
    # Application
    app_name: str = "FundChain API"
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # Server
    host: str = Field(default="127.0.0.1", env="HOST")
    port: int = Field(default=8000, env="PORT")
    backend_host: str = Field(default="127.0.0.1", env="HOST")
    backend_port: int = Field(default=8000, env="PORT")
    
    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///./fundchain.db", env="DATABASE_URL")
    
    # Blockchain
    rpc_url: str = Field(default="http://anvil:8545", env="RPC_URL")
    web3_provider_uri: str = Field(default="http://anvil:8545", env="WEB3_PROVIDER_URI")
    chain_id: int = Field(default=31337, env="CHAIN_ID")
    start_block: int = Field(default=0, env="START_BLOCK")
    
    # Contract addresses
    treasury_address: Optional[str] = Field(default=None, env="TREASURY_ADDRESS")
    projects_address: Optional[str] = Field(default=None, env="PROJECTS_ADDRESS")
    governance_sbt_address: Optional[str] = Field(default=None, env="GOVERNANCE_SBT_ADDRESS")
    ballot_address: Optional[str] = Field(default=None, env="BALLOT_ADDRESS")
    multisig_address: Optional[str] = Field(default=None, env="MULTISIG_ADDRESS")
    
    # Indexer settings
    indexer_enabled: bool = Field(default=False, env="INDEXER_ENABLED")
    indexer_poll_interval: int = Field(default=5, env="INDEXER_POLL_INTERVAL")
    indexer_batch_size: int = Field(default=1000, env="INDEXER_BATCH_SIZE")
    
    # Privacy and k-anonymity
    k_anonymity_threshold: int = Field(default=5, env="K_ANONYMITY_THRESHOLD")
    enable_privacy_filters: bool = Field(default=True, env="ENABLE_PRIVACY_FILTERS")
    
    # API settings
    api_rate_limit: int = Field(default=100, env="API_RATE_LIMIT")  # requests per minute
    api_cors_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000", env="CORS_ORIGINS")
    
    # Cache settings
    cache_ttl: int = Field(default=300, env="CACHE_TTL")  # seconds
    enable_caching: bool = Field(default=True, env="ENABLE_CACHING")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")  # json or text
    
    # Security
    secret_key: str = Field(default="your-secret-key-change-in-production", env="SECRET_KEY")
    
    # Export settings
    max_export_records: int = Field(default=10000, env="MAX_EXPORT_RECORDS")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()