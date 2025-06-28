"""
Celery worker entry point for background task processing.
This worker handles message forwarding tasks and session management.
"""

import os
import asyncio
from celery import Celery
from celery.signals import worker_ready, worker_shutdown

from utils.env_loader import load_environment
from utils.logger import setup_logger
from tasks.celery_config import celery_app
from services.session_manager import SessionManager

# Load environment variables
load_environment()

# Setup logging
logger = setup_logger()

# Initialize session manager
session_manager = SessionManager()

@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Handle worker startup."""
    logger.info("Celery worker is ready")
    
    # Initialize session manager in worker
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(session_manager.initialize())
        logger.info("Session manager initialized in worker")
    except Exception as e:
        logger.error(f"Failed to initialize session manager in worker: {e}")

@worker_shutdown.connect
def worker_shutdown_handler(sender=None, **kwargs):
    """Handle worker shutdown."""
    logger.info("Celery worker is shutting down")
    
    # Cleanup session manager
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(session_manager.cleanup())
        logger.info("Session manager cleaned up in worker")
    except Exception as e:
        logger.error(f"Failed to cleanup session manager in worker: {e}")

if __name__ == "__main__":
    # Start the Celery worker
    celery_app.start()
