"""
FastAPI backend entry point for multi-platform message forwarding system.
This application handles Telegram and Discord message forwarding with queue processing.
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database.db import engine, Base, get_db
from utils.env_loader import load_environment
from utils.logger import setup_logger
from services.session_manager import SessionManager
from services.queue_manager import QueueManager
from tasks.celery_config import celery_app

# Load environment variables
load_environment()

# Setup logging
logger = setup_logger()

# Initialize managers
session_manager = SessionManager()
queue_manager = QueueManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("Starting FastAPI application")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise
    
    # Initialize session manager
    try:
        await session_manager.initialize()
        logger.info("Session manager initialized")
    except Exception as e:
        logger.warning(f"Session manager initialization failed: {e}")
        # Continue without session manager for now
    
    # Initialize queue manager
    try:
        await queue_manager.initialize()
        logger.info("Queue manager initialized")
    except Exception as e:
        logger.warning(f"Queue manager initialization failed: {e}")
        # Continue without queue manager for now
    
    yield
    
    # Shutdown
    logger.info("Shutting down FastAPI application")
    await session_manager.cleanup()
    await queue_manager.cleanup()

# Create FastAPI application
app = FastAPI(
    title="Multi-Platform Message Forwarding API",
    description="Backend API for Telegram and Discord message forwarding with subscription management",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Replit dynamic domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register API routers
from api import auth, forwarding, analytics, admin, payments, realtime, telegram_auth

app.include_router(auth.router, prefix="/api")
app.include_router(forwarding.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(realtime.router, prefix="/api")
app.include_router(telegram_auth.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {
        "status": "healthy",
        "message": "Multi-Platform Message Forwarding API is running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint without API prefix."""
    return await api_health_check()

@app.get("/api/health") 
async def api_health_check():
    """Detailed health check endpoint."""
    try:
        # Check database connection
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # Check Redis connection
    try:
        if queue_manager.redis_client:
            redis_status = "healthy" if queue_manager.redis_client.ping() else "unhealthy"
        else:
            redis_status = "not_configured"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_status = "not_configured"
    
    # Check Celery worker status
    try:
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        celery_status = "healthy" if active_workers else "no_workers"
    except Exception as e:
        logger.error(f"Celery health check failed: {e}")
        celery_status = "not_configured"
    
    return {
        "status": "healthy" if all([
            db_status == "healthy",
            redis_status == "healthy",
            celery_status in ["healthy", "no_workers"]
        ]) else "unhealthy",
        "components": {
            "database": db_status,
            "redis": redis_status,
            "celery": celery_status
        }
    }

@app.get("/stats")
async def get_stats():
    """Get system statistics."""
    try:
        stats = {
            "telegram_sessions": await session_manager.get_telegram_session_count(),
            "discord_sessions": await session_manager.get_discord_session_count(),
            "active_queues": await queue_manager.get_active_queue_count(),
            "pending_tasks": await queue_manager.get_pending_task_count()
        }
        return stats
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system statistics")

if __name__ == "__main__":
    # Run the application
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )
