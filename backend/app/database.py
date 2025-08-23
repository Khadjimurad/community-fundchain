import os
import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging
from .models import Base

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./fundchain.db")
# Convert async URL to sync URL if needed
if DATABASE_URL.startswith("sqlite+aiosqlite://"):
    SYNC_DATABASE_URL = DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://")
else:
    SYNC_DATABASE_URL = os.getenv("SYNC_DATABASE_URL", "sqlite:///./fundchain.db")

# Create engines
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    future=True
)

sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    future=True
)

# Session makers
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions."""
    async with get_db_session() as session:
        yield session

def get_db_manager():
    """Get a database manager instance for utility operations."""
    return DatabaseManager()

async def init_database():
    """Initialize the database with all tables."""
    logger.info("Initializing database...")
    
    async with async_engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Create additional indexes if needed
        await create_additional_indexes(conn)
    
    logger.info("Database initialized successfully")

async def create_additional_indexes(conn):
    """Create additional database indexes for performance."""
    indexes = [
        # Composite indexes for common queries
        "CREATE INDEX IF NOT EXISTS idx_allocation_project_donor ON allocations(project_id, donor_address)",
        "CREATE INDEX IF NOT EXISTS idx_vote_round_project ON votes(round_id, project_id)",
        "CREATE INDEX IF NOT EXISTS idx_donation_donor_timestamp ON donations(donor_address, timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_project_status_category ON projects(status, category)",
        
        # Full-text search indexes (if supported)
        "CREATE INDEX IF NOT EXISTS idx_project_name_search ON projects(name)",
        "CREATE INDEX IF NOT EXISTS idx_project_description_search ON projects(description)",
    ]
    
    for index_sql in indexes:
        try:
            await conn.execute(text(index_sql))
        except Exception as e:
            logger.warning(f"Failed to create index: {index_sql}, error: {e}")

async def drop_database():
    """Drop all database tables (for testing/reset)."""
    logger.warning("Dropping all database tables...")
    
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    logger.info("Database tables dropped")

async def reset_database():
    """Reset the database by dropping and recreating all tables."""
    await drop_database()
    await init_database()

class DatabaseManager:
    """Database management utilities."""
    
    @staticmethod
    async def create_tables():
        """Create all database tables."""
        await init_database()
    
    @staticmethod
    async def reset_database():
        """Reset the database by dropping and recreating all tables."""
        await reset_database()
    
    @staticmethod
    def get_session():
        """Get a database session context manager."""
        return get_db_session()
    
    @staticmethod
    async def check_connection():
        """Check if database connection is working."""
        try:
            async with get_db_session() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return False
    
    @staticmethod
    async def get_table_counts():
        """Get row counts for all tables."""
        counts = {}
        tables = [
            'projects', 'members', 'donations', 'allocations', 
            'voting_rounds', 'votes', 'vote_results', 'payouts',
            'blockchain_events', 'indexer_state', 'aggregate_stats'
        ]
        
        async with get_db_session() as session:
            for table in tables:
                try:
                    result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    counts[table] = result.scalar()
                except Exception as e:
                    logger.warning(f"Failed to count {table}: {e}")
                    counts[table] = -1
        
        return counts
    
    @staticmethod
    async def vacuum_database():
        """Optimize database (SQLite VACUUM)."""
        try:
            async with async_engine.begin() as conn:
                await conn.execute(text("VACUUM"))
            logger.info("Database vacuum completed")
        except Exception as e:
            logger.error(f"Database vacuum failed: {e}")
    
    @staticmethod
    async def backup_database(backup_path: str):
        """Create a backup of the database."""
        if DATABASE_URL.startswith("sqlite"):
            import shutil
            try:
                # Extract file path from SQLite URL
                db_path = DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
                shutil.copy2(db_path, backup_path)
                logger.info(f"Database backed up to {backup_path}")
                return True
            except Exception as e:
                logger.error(f"Database backup failed: {e}")
                return False
        else:
            logger.warning("Backup not implemented for non-SQLite databases")
            return False

# Health check utilities
async def database_health_check():
    """Comprehensive database health check."""
    health_status = {
        "database_connected": False,
        "tables_exist": False,
        "table_counts": {},
        "last_activity": None,
        "errors": []
    }
    
    try:
        # Check connection
        health_status["database_connected"] = await DatabaseManager.check_connection()
        
        if health_status["database_connected"]:
            # Check tables
            health_status["table_counts"] = await DatabaseManager.get_table_counts()
            health_status["tables_exist"] = all(count >= 0 for count in health_status["table_counts"].values())
            
            # Get last activity timestamp
            async with get_db_session() as session:
                result = await session.execute(text("SELECT MAX(timestamp) FROM donations"))
                last_donation = result.scalar()
                if last_donation:
                    health_status["last_activity"] = last_donation.isoformat()
    
    except Exception as e:
        health_status["errors"].append(str(e))
        logger.error(f"Database health check failed: {e}")
    
    return health_status

# Database migration utilities
async def run_migrations():
    """Run any pending database migrations."""
    # For now, just ensure all tables exist
    # In production, you might want to use Alembic
    try:
        await init_database()
        logger.info("Migrations completed successfully")
        return True
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False