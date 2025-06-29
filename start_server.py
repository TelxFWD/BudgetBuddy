#!/usr/bin/env python3
"""
Startup script for the Message Forwarding API.
Loads environment variables and starts the FastAPI server with proper configuration.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path('.') / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✓ Loaded environment variables from {env_path}")
else:
    print("⚠ No .env file found, using system environment variables only")

# Check for required PostgreSQL environment variables from Replit
postgresql_vars = ['DATABASE_URL', 'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']
missing_vars = []

for var in postgresql_vars:
    if not os.getenv(var):
        missing_vars.append(var)

if missing_vars:
    print(f"⚠ Missing PostgreSQL environment variables: {', '.join(missing_vars)}")
    print("  Using SQLite fallback database for development")
else:
    print("✓ PostgreSQL environment variables detected")

# Set default values for missing configuration
defaults = {
    'SECRET_KEY': 'dev-secret-key-change-in-production',
    'JWT_SECRET_KEY': 'jwt-dev-secret-key-change-in-production',
    'REDIS_URL': 'redis://localhost:6379/0',
    'ENVIRONMENT': 'development',
    'LOG_LEVEL': 'INFO'
}

for key, value in defaults.items():
    if not os.getenv(key):
        os.environ[key] = value
        print(f"✓ Set default {key}")

# Import and run the main application
if __name__ == "__main__":
    print("🚀 Starting Message Forwarding API server...")
    
    # Import after environment setup
    import uvicorn
    from main import app
    
    # Get server configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    environment = os.getenv("ENVIRONMENT", "development")
    
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Environment: {environment}")
    
    # Start the server
    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=(environment == "development"),
        log_level="info"
    )