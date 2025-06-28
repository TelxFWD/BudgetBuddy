"""
Environment variable loader and validator.
Handles loading and validation of all environment variables required by the application.
"""

import os
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def load_environment() -> Dict[str, Any]:
    """Load and validate environment variables."""
    # Load .env file if it exists
    load_dotenv()
    
    # Required environment variables (none for Replit compatibility)
    required_vars = []
    
    # Optional environment variables with defaults
    optional_vars = {
        "DATABASE_URL": "sqlite:///./message_forwarding.db",
        "ENVIRONMENT": "production",
        "HOST": "0.0.0.0",
        "PORT": "5000",
        "LOG_LEVEL": "INFO",
        "SESSION_CHECK_INTERVAL": "300",
        "SESSION_RETRY_ATTEMPTS": "3",
        "SESSION_RETRY_DELAY": "30",
        "RATE_LIMIT_FREE_PLAN": "10",
        "RATE_LIMIT_PRO_PLAN": "100",
        "RATE_LIMIT_ELITE_PLAN": "1000",
        "REDIS_URL": "redis://localhost:6379/0",
        "SECRET_KEY": "dev-secret-key-change-in-production",
        "TELEGRAM_API_ID": "",
        "TELEGRAM_API_HASH": ""
    }
    
    # Validate required variables
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    # Set defaults for optional variables
    for var, default in optional_vars.items():
        if not os.getenv(var):
            os.environ[var] = default
    
    # Database configuration
    database_config = {
        "DATABASE_URL": os.getenv("DATABASE_URL"),
        "PGHOST": os.getenv("PGHOST"),
        "PGPORT": os.getenv("PGPORT"),
        "PGDATABASE": os.getenv("PGDATABASE"),
        "PGUSER": os.getenv("PGUSER"),
        "PGPASSWORD": os.getenv("PGPASSWORD")
    }
    
    # Redis configuration
    redis_config = {
        "REDIS_URL": os.getenv("REDIS_URL"),
        "REDIS_HOST": os.getenv("REDIS_HOST", "localhost"),
        "REDIS_PORT": int(os.getenv("REDIS_PORT", 6379)),
        "REDIS_DB": int(os.getenv("REDIS_DB", 0))
    }
    
    # Application configuration
    app_config = {
        "ENVIRONMENT": os.getenv("ENVIRONMENT"),
        "SECRET_KEY": os.getenv("SECRET_KEY"),
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY"),
        "API_SECRET": os.getenv("API_SECRET"),
        "HOST": os.getenv("HOST"),
        "PORT": int(os.getenv("PORT", "5000"))
    }
    
    # Telegram configuration
    telegram_api_id = os.getenv("TELEGRAM_API_ID")
    telegram_config = {
        "TELEGRAM_API_ID": int(telegram_api_id) if telegram_api_id and telegram_api_id.strip() else 0,
        "TELEGRAM_API_HASH": os.getenv("TELEGRAM_API_HASH"),
        "TELEGRAM_BOT_TOKEN": os.getenv("TELEGRAM_BOT_TOKEN")
    }
    
    # Discord configuration
    discord_config = {
        "DISCORD_BOT_TOKEN": os.getenv("DISCORD_BOT_TOKEN"),
        "DISCORD_CLIENT_ID": os.getenv("DISCORD_CLIENT_ID"),
        "DISCORD_CLIENT_SECRET": os.getenv("DISCORD_CLIENT_SECRET")
    }
    
    # Payment configuration
    payment_config = {
        "PAYPAL_CLIENT_ID": os.getenv("PAYPAL_CLIENT_ID"),
        "PAYPAL_CLIENT_SECRET": os.getenv("PAYPAL_CLIENT_SECRET"),
        "NOWPAYMENTS_API_KEY": os.getenv("NOWPAYMENTS_API_KEY")
    }
    
    # Rate limiting configuration
    rate_limit_config = {
        "RATE_LIMIT_FREE_PLAN": int(os.getenv("RATE_LIMIT_FREE_PLAN") or "10"),
        "RATE_LIMIT_PRO_PLAN": int(os.getenv("RATE_LIMIT_PRO_PLAN") or "100"),
        "RATE_LIMIT_ELITE_PLAN": int(os.getenv("RATE_LIMIT_ELITE_PLAN") or "1000")
    }
    
    # Session configuration
    session_config = {
        "SESSION_CHECK_INTERVAL": int(os.getenv("SESSION_CHECK_INTERVAL") or "300"),
        "SESSION_RETRY_ATTEMPTS": int(os.getenv("SESSION_RETRY_ATTEMPTS") or "3"),
        "SESSION_RETRY_DELAY": int(os.getenv("SESSION_RETRY_DELAY") or "30")
    }
    
    # Logging configuration
    logging_config = {
        "LOG_LEVEL": os.getenv("LOG_LEVEL"),
        "LOG_FORMAT": os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    }
    
    config = {
        "database": database_config,
        "redis": redis_config,
        "app": app_config,
        "telegram": telegram_config,
        "discord": discord_config,
        "payment": payment_config,
        "rate_limit": rate_limit_config,
        "session": session_config,
        "logging": logging_config
    }
    
    logger.info("Environment variables loaded and validated successfully")
    return config

def get_database_url() -> str:
    """Get the database URL from environment variables."""
    return os.getenv("DATABASE_URL", "")

def get_redis_url() -> str:
    """Get the Redis URL from environment variables."""
    return os.getenv("REDIS_URL", "redis://localhost:6379/0")

def is_development() -> bool:
    """Check if running in development mode."""
    return os.getenv("ENVIRONMENT", "production").lower() == "development"

def is_production() -> bool:
    """Check if running in production mode."""
    return os.getenv("ENVIRONMENT", "production").lower() == "production"

def get_secret_key() -> str:
    """Get the application secret key."""
    return os.getenv("SECRET_KEY", "")

def get_jwt_secret() -> str:
    """Get the JWT secret key."""
    return os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", ""))

def get_telegram_config() -> Dict[str, Any]:
    """Get Telegram configuration."""
    api_id = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")
    
    if not api_id or not api_hash:
        raise ValueError("Telegram API credentials not found")
    
    return {
        "api_id": int(api_id),
        "api_hash": api_hash,
        "bot_token": os.getenv("TELEGRAM_BOT_TOKEN")
    }

def get_discord_config() -> Dict[str, Any]:
    """Get Discord configuration."""
    return {
        "bot_token": os.getenv("DISCORD_BOT_TOKEN"),
        "client_id": os.getenv("DISCORD_CLIENT_ID"),
        "client_secret": os.getenv("DISCORD_CLIENT_SECRET")
    }

def get_payment_config() -> Dict[str, Any]:
    """Get payment gateway configuration."""
    return {
        "paypal": {
            "client_id": os.getenv("PAYPAL_CLIENT_ID"),
            "client_secret": os.getenv("PAYPAL_CLIENT_SECRET")
        },
        "nowpayments": {
            "api_key": os.getenv("NOWPAYMENTS_API_KEY")
        }
    }

def validate_required_env_vars() -> bool:
    """Validate that all required environment variables are set."""
    try:
        load_environment()
        return True
    except ValueError as e:
        logger.error(f"Environment validation failed: {e}")
        return False
