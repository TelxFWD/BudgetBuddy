#!/usr/bin/env python3
"""
Database initialization script.
Creates all tables from SQLAlchemy models.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import engine
from database.models import Base  # Import Base from models
from database import models  # Import all models to register them
from utils.logger import setup_logger

logger = setup_logger()

def init_database():
    """Initialize database with all tables."""
    try:
        logger.info("Starting database initialization...")
        
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("All database tables created successfully")
        
        # Verify tables were created
        with engine.connect() as connection:
            if "postgresql" in str(engine.url):
                result = connection.execute(text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                ))
            else:
                result = connection.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ))
            
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"Created tables: {', '.join(tables)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    if success:
        print("Database initialization completed successfully!")
        sys.exit(0)
    else:
        print("Database initialization failed!")
        sys.exit(1)