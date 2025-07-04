
#!/usr/bin/env python3
"""
Start the session manager to handle Telegram forwarding.
This should be run as a background process.
"""

import asyncio
import os
import sys
import logging

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.session_manager import session_manager
from utils.logger import logger

async def main():
    """Main function to start session manager."""
    try:
        logger.info("🚀 Starting Telegram Session Manager...")
        
        # Initialize and start all clients
        await session_manager.start_all_clients()
        
    except KeyboardInterrupt:
        logger.info("👋 Session Manager stopped by user")
    except Exception as e:
        logger.error(f"❌ Session Manager failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
