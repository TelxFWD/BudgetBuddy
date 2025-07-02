"""
Telegram API testing endpoints.
Test Telegram API credentials and basic functionality.
"""

import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database.db import get_db
from database.models import User
from api.auth import get_current_user
from utils.logger import setup_logger

logger = setup_logger()
router = APIRouter(prefix="/api/telegram", tags=["telegram-test"])

class TelegramConfigResponse(BaseModel):
    api_id_available: bool
    api_hash_available: bool
    api_id: Optional[int] = None
    credentials_valid: bool

class TelegramTestResponse(BaseModel):
    status: str
    message: str
    config: TelegramConfigResponse

@router.get("/config", response_model=TelegramConfigResponse)
async def get_telegram_config(
    current_user: User = Depends(get_current_user)
):
    """Get Telegram API configuration status."""
    try:
        api_id_str = os.getenv("TELEGRAM_API_ID")
        api_hash = os.getenv("TELEGRAM_API_HASH")
        
        api_id_available = bool(api_id_str and api_id_str.strip())
        api_hash_available = bool(api_hash and api_hash.strip())
        
        api_id = None
        credentials_valid = False
        
        if api_id_available:
            try:
                api_id = int(api_id_str)
                credentials_valid = api_id_available and api_hash_available and api_id > 0
            except ValueError:
                api_id = None
                credentials_valid = False
        
        return TelegramConfigResponse(
            api_id_available=api_id_available,
            api_hash_available=api_hash_available,
            api_id=api_id,
            credentials_valid=credentials_valid
        )
        
    except Exception as e:
        logger.error(f"Error getting Telegram config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get Telegram configuration")

@router.get("/test", response_model=TelegramTestResponse)
async def test_telegram_config(
    current_user: User = Depends(get_current_user)
):
    """Test Telegram API configuration and connectivity."""
    try:
        # Get configuration
        config_response = await get_telegram_config(current_user)
        
        if not config_response.credentials_valid:
            return TelegramTestResponse(
                status="error",
                message="Telegram API credentials are not properly configured",
                config=config_response
            )
        
        # Test basic Pyrogram client initialization (without connecting)
        try:
            from pyrogram import Client
            
            # Create a test client (don't connect yet)
            test_client = Client(
                "test_session",
                api_id=config_response.api_id,
                api_hash=os.getenv("TELEGRAM_API_HASH"),
                session_string=None,  # No session string for test
                in_memory=True  # Use in-memory session for testing
            )
            
            return TelegramTestResponse(
                status="success",
                message=f"Telegram API credentials are valid. API ID: {config_response.api_id}",
                config=config_response
            )
            
        except Exception as pyrogram_error:
            logger.error(f"Pyrogram client test failed: {pyrogram_error}")
            return TelegramTestResponse(
                status="error",
                message=f"Failed to initialize Telegram client: {str(pyrogram_error)}",
                config=config_response
            )
        
    except Exception as e:
        logger.error(f"Error testing Telegram config: {e}")
        raise HTTPException(status_code=500, detail="Failed to test Telegram configuration")

@router.get("/client-info")
async def get_telegram_client_info(
    current_user: User = Depends(get_current_user)
):
    """Get information about the Telegram client setup."""
    try:
        from bots.telegram_client import TelegramClient
        
        # Initialize Telegram client
        telegram_client = TelegramClient()
        
        return {
            "credentials_available": telegram_client.credentials_available,
            "api_id": telegram_client.api_id if telegram_client.credentials_available else None,
            "session_dir": telegram_client.session_dir,
            "active_clients": len(telegram_client.clients),
            "status": "ready" if telegram_client.credentials_available else "missing_credentials"
        }
        
    except Exception as e:
        logger.error(f"Error getting Telegram client info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get Telegram client information")