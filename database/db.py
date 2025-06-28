"""
Database connection and session management for SQLAlchemy.
Handles PostgreSQL database connections and provides session factory.
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from utils.env_loader import get_database_url
from utils.logger import setup_logger

logger = setup_logger()

# Get database URL from environment
DATABASE_URL = get_database_url()

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=os.getenv("ENVIRONMENT") == "development",
    # Connection pool settings
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Database event listeners
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite pragmas if using SQLite (for development)."""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log SQL statements in development mode."""
    if os.getenv("ENVIRONMENT") == "development":
        logger.debug(f"SQL: {statement}")
        if parameters:
            logger.debug(f"Parameters: {parameters}")

def get_db() -> Session:
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_tables():
    """Create all database tables."""
    try:
        # Import all models to ensure they're registered
        from database import models
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise

def drop_tables():
    """Drop all database tables (use with caution)."""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.warning("All database tables dropped")
        
    except Exception as e:
        logger.error(f"Failed to drop database tables: {e}")
        raise

def check_database_connection() -> bool:
    """Check if database connection is working."""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            return result.fetchone()[0] == 1
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False

def get_database_info() -> dict:
    """Get database information and statistics."""
    try:
        with engine.connect() as connection:
            # Get database version
            if "postgresql" in DATABASE_URL:
                version_result = connection.execute("SELECT version()")
                version = version_result.fetchone()[0]
            elif "sqlite" in DATABASE_URL:
                version_result = connection.execute("SELECT sqlite_version()")
                version = f"SQLite {version_result.fetchone()[0]}"
            else:
                version = "Unknown"
            
            # Get connection pool info
            pool = engine.pool
            
            return {
                "database_url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
                "version": version,
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
            
    except Exception as e:
        logger.error(f"Failed to get database info: {e}")
        return {"error": str(e)}

class DatabaseManager:
    """Database manager for handling database operations."""
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    def get_session(self) -> Session:
        """Get a new database session."""
        return self.SessionLocal()
    
    def execute_raw_sql(self, sql: str, params: dict = None) -> any:
        """Execute raw SQL query."""
        try:
            with self.engine.connect() as connection:
                if params:
                    result = connection.execute(sql, params)
                else:
                    result = connection.execute(sql)
                return result.fetchall()
        except Exception as e:
            logger.error(f"Failed to execute raw SQL: {e}")
            raise
    
    def backup_database(self, backup_path: str) -> bool:
        """Create a database backup (PostgreSQL only)."""
        if "postgresql" not in DATABASE_URL:
            logger.error("Database backup is only supported for PostgreSQL")
            return False
        
        try:
            import subprocess
            import urllib.parse
            
            # Parse database URL
            parsed = urllib.parse.urlparse(DATABASE_URL)
            
            # Construct pg_dump command
            cmd = [
                "pg_dump",
                "-h", parsed.hostname,
                "-p", str(parsed.port),
                "-U", parsed.username,
                "-d", parsed.path[1:],  # Remove leading slash
                "-f", backup_path,
                "--no-password"
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            env["PGPASSWORD"] = parsed.password
            
            # Execute backup
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Database backup created successfully: {backup_path}")
                return True
            else:
                logger.error(f"Database backup failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Database backup error: {e}")
            return False
    
    def get_table_stats(self) -> dict:
        """Get statistics for all tables."""
        try:
            stats = {}
            
            # Import models to get table names
            from database import models
            
            with self.engine.connect() as connection:
                for table in Base.metadata.tables.values():
                    try:
                        result = connection.execute(f"SELECT COUNT(*) FROM {table.name}")
                        count = result.fetchone()[0]
                        stats[table.name] = {"row_count": count}
                    except Exception as e:
                        stats[table.name] = {"error": str(e)}
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get table stats: {e}")
            return {"error": str(e)}
    
    def vacuum_database(self) -> bool:
        """Vacuum database (PostgreSQL only)."""
        if "postgresql" not in DATABASE_URL:
            logger.warning("VACUUM is only supported for PostgreSQL")
            return False
        
        try:
            # VACUUM requires autocommit mode
            connection = self.engine.connect()
            connection.execute("commit")
            connection.execute("VACUUM")
            connection.close()
            
            logger.info("Database VACUUM completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database VACUUM failed: {e}")
            return False

# Global database manager instance
db_manager = DatabaseManager()

# Health check functions
def database_health_check() -> dict:
    """Comprehensive database health check."""
    health_info = {
        "status": "unknown",
        "connection": False,
        "tables_exist": False,
        "info": {},
        "stats": {}
    }
    
    try:
        # Check connection
        health_info["connection"] = check_database_connection()
        
        if health_info["connection"]:
            # Get database info
            health_info["info"] = get_database_info()
            
            # Check if tables exist
            from database import models
            with engine.connect() as connection:
                result = connection.execute(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
                    if "postgresql" in DATABASE_URL
                    else "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
                )
                table_count = result.fetchone()[0]
                health_info["tables_exist"] = table_count > 0
            
            # Get table stats
            health_info["stats"] = db_manager.get_table_stats()
            
            # Determine overall status
            if health_info["connection"] and health_info["tables_exist"]:
                health_info["status"] = "healthy"
            else:
                health_info["status"] = "degraded"
        else:
            health_info["status"] = "unhealthy"
    
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_info["status"] = "unhealthy"
        health_info["error"] = str(e)
    
    return health_info

# Initialize database on import
def initialize_database():
    """Initialize database connection and create tables if needed."""
    try:
        # Check connection
        if not check_database_connection():
            raise Exception("Could not connect to database")
        
        logger.info("Database connection established successfully")
        
        # Create tables if they don't exist
        from database import models
        Base.metadata.create_all(bind=engine)
        
        logger.info("Database initialization completed")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

# Auto-initialize when module is imported (only in production)
if os.getenv("ENVIRONMENT") != "test":
    try:
        initialize_database()
    except Exception as e:
        logger.warning(f"Database auto-initialization failed: {e}")
