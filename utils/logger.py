"""
Logging configuration and setup for the application.
Provides centralized logging with proper formatting and levels.
"""

import os
import logging
import logging.handlers
from typing import Optional

def setup_logger(name: Optional[str] = None, level: Optional[str] = None) -> logging.Logger:
    """Setup and configure application logger."""
    
    # Get logger name
    logger_name = name or "message_forwarding"
    logger = logging.getLogger(logger_name)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Get log level from environment
    log_level = level or os.getenv("LOG_LEVEL", "INFO")
    try:
        log_level_int = getattr(logging, log_level.upper())
    except AttributeError:
        log_level_int = logging.INFO
    
    logger.setLevel(log_level_int)
    
    # Get log format from environment
    log_format = os.getenv(
        "LOG_FORMAT", 
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    formatter = logging.Formatter(log_format)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level_int)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if log file is specified)
    log_file = os.getenv("LOG_FILE")
    if log_file:
        try:
            # Create log directory if it doesn't exist
            log_dir = os.path.dirname(log_file)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir)
            
            # Rotating file handler
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5
            )
            file_handler.setLevel(log_level_int)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
            
        except Exception as e:
            logger.warning(f"Failed to setup file logging: {e}")
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name."""
    return logging.getLogger(name)

def set_log_level(level: str) -> None:
    """Set the log level for all loggers."""
    try:
        log_level_int = getattr(logging, level.upper())
        logging.getLogger().setLevel(log_level_int)
        
        # Update all existing loggers
        for logger_name in logging.Logger.manager.loggerDict:
            logger = logging.getLogger(logger_name)
            logger.setLevel(log_level_int)
            
            # Update all handlers
            for handler in logger.handlers:
                handler.setLevel(log_level_int)
                
    except AttributeError:
        logging.getLogger().warning(f"Invalid log level: {level}")

def configure_sqlalchemy_logging(level: str = "WARNING") -> None:
    """Configure SQLAlchemy logging to reduce verbosity."""
    try:
        log_level_int = getattr(logging, level.upper())
        logging.getLogger("sqlalchemy.engine").setLevel(log_level_int)
        logging.getLogger("sqlalchemy.dialects").setLevel(log_level_int)
        logging.getLogger("sqlalchemy.pool").setLevel(log_level_int)
        logging.getLogger("sqlalchemy.orm").setLevel(log_level_int)
    except AttributeError:
        pass

def configure_external_library_logging() -> None:
    """Configure logging for external libraries to reduce noise."""
    # Redis
    logging.getLogger("redis").setLevel(logging.WARNING)
    
    # Celery
    logging.getLogger("celery").setLevel(logging.WARNING)
    
    # Pyrogram
    logging.getLogger("pyrogram").setLevel(logging.WARNING)
    
    # Discord.py
    logging.getLogger("discord").setLevel(logging.WARNING)
    
    # HTTP libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    
    # Asyncio
    logging.getLogger("asyncio").setLevel(logging.WARNING)

class DatabaseLogHandler(logging.Handler):
    """Custom log handler that stores logs in the database."""
    
    def __init__(self):
        super().__init__()
        self.buffer = []
        self.buffer_size = 100
    
    def emit(self, record):
        """Emit a log record to the database."""
        try:
            # Format the record
            log_entry = {
                "timestamp": record.created,
                "level": record.levelname,
                "logger": record.name,
                "message": self.format(record),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            }
            
            # Add to buffer
            self.buffer.append(log_entry)
            
            # Flush buffer if it's full
            if len(self.buffer) >= self.buffer_size:
                self.flush_buffer()
                
        except Exception:
            self.handleError(record)
    
    def flush_buffer(self):
        """Flush the log buffer to the database."""
        if not self.buffer:
            return
        
        try:
            from database.db import get_db
            from database.models import ErrorLog
            
            db = next(get_db())
            
            # Save logs to database
            for log_entry in self.buffer:
                if log_entry["level"] in ["ERROR", "CRITICAL"]:
                    error_log = ErrorLog(
                        error_type="application_error",
                        error_message=log_entry["message"],
                        user_id=None,  # System error
                        telegram_account_id=None,
                        discord_account_id=None
                    )
                    db.add(error_log)
            
            db.commit()
            db.close()
            
            # Clear buffer
            self.buffer.clear()
            
        except Exception as e:
            # Don't let logging errors crash the application
            print(f"Failed to flush log buffer to database: {e}")
            self.buffer.clear()

def setup_database_logging():
    """Setup database logging handler."""
    try:
        db_handler = DatabaseLogHandler()
        db_handler.setLevel(logging.ERROR)
        
        # Add to root logger
        root_logger = logging.getLogger()
        root_logger.addHandler(db_handler)
        
    except Exception as e:
        logging.getLogger().warning(f"Failed to setup database logging: {e}")

# Initialize logging configuration
def initialize_logging():
    """Initialize the complete logging system."""
    # Setup main logger
    setup_logger()
    
    # Configure external libraries
    configure_external_library_logging()
    
    # Configure SQLAlchemy logging
    configure_sqlalchemy_logging()
    
    # Setup database logging
    setup_database_logging()
    
    logging.getLogger().info("Logging system initialized")

# Auto-initialize when module is imported
initialize_logging()

# Create default logger instance for easy importing
logger = setup_logger()
