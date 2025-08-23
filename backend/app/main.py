import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .config import get_settings
from .database import init_database, database_health_check
from .indexer import indexer
from .routes import router
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

def get_cors_origins():
    """Parse CORS origins from settings."""
    origins = settings.api_cors_origins
    if origins == "*":
        return ["*"]
    return [origin.strip() for origin in origins.split(",") if origin.strip()]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting FundChain API...")
    
    indexer_task = None  # Initialize to None
    
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized")
        
        # Initialize and start blockchain indexer
        if settings.indexer_enabled:
            await indexer.initialize()
            
            # Start indexer in background
            indexer_task = asyncio.create_task(indexer.start_indexing())
            logger.info("Blockchain indexer started")
        else:
            logger.info("Blockchain indexer disabled")
        
        logger.info("FundChain API startup completed")
        
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    finally:
        # Shutdown
        logger.info("Shutting down FundChain API...")
        
        if settings.indexer_enabled and indexer_task:
            indexer.stop_indexing()
            try:
                await asyncio.wait_for(indexer_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Indexer shutdown timed out")
                indexer_task.cancel()
        
        logger.info("FundChain API shutdown completed")

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Traceable Community Fund API - Transparent, privacy-preserving community funding platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.debug else ["localhost", "127.0.0.1", settings.host]
)

# Include routers
app.include_router(router, prefix="/api/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint."""
    try:
        # Check database
        db_health = await database_health_check()
        
        # Check indexer status
        indexer_status = {
            "enabled": settings.indexer_enabled,
            "running": indexer.running if settings.indexer_enabled else False
        }
        
        # Overall health
        healthy = db_health["database_connected"] and db_health["tables_exist"]
        if settings.indexer_enabled:
            healthy = healthy and indexer_status["running"]
        
        status_code = 200 if healthy else 503
        
        return JSONResponse(
            status_code=status_code,
            content={
                "status": "healthy" if healthy else "unhealthy",
                "timestamp": db_health.get("last_activity"),
                "services": {
                    "database": db_health,
                    "indexer": indexer_status
                },
                "version": "1.0.0",
                "environment": settings.environment
            }
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": None
            }
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "description": "Traceable Community Fund API",
        "docs_url": "/docs" if settings.debug else "Documentation not available in production",
        "health_url": "/health",
        "api_base": "/api/v1"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if settings.debug:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(exc),
                "type": type(exc).__name__
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred"
            }
        )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
