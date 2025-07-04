"""
Simple Production Telegram OTP Authentication System
Uses Telethon for real Telegram OTP delivery
"""
import os
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError, 
    PhoneCodeInvalidError, 
    PhoneNumberBannedError,
    PhoneCodeExpiredError,
    FloodWaitError
)
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["Production Telegram OTP"])

# Get Telegram API credentials
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "23697291"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "b3a10e33ef507e864ed7018df0495ca8")

# In-memory session storage
session_storage: Dict[str, Dict[str, Any]] = {}

class PhoneRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class OTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    otp: str = Field(..., description="OTP code received via Telegram")

class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[Dict] = None

def clean_phone_number(phone: str) -> str:
    """Clean and normalize phone number."""
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    if not cleaned.startswith('+'):
        cleaned = '+' + cleaned
    return cleaned

@router.post("/send-otp", response_model=AuthResponse)
async def send_otp_production(
    request: PhoneRequest,
    db: Session = Depends(get_db)
):
    """Send OTP via Telegram for authentication."""
    try:
        phone_number = clean_phone_number(request.phone)
        logger.info(f"Production OTP request for: {phone_number}")

        # Create Telegram client
        client = TelegramClient(
            StringSession(),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH
        )
        
        await client.connect()
        
        try:
            # Request OTP from Telegram
            sent_code = await client.send_code_request(phone_number)
            
            # Store session data
            session_storage[phone_number] = {
                'phone_code_hash': sent_code.phone_code_hash,
                'client_session': client.session.save(),
                'expires_at': datetime.utcnow() + timedelta(minutes=10)
            }
            
            # Keep client connected for verification
            # Don't disconnect here as we need it for verification
            
            logger.info(f"Real OTP sent via Telegram to {phone_number}")
            
            return AuthResponse(
                success=True,
                message="OTP sent via Telegram successfully"
            )
            
        except PhoneNumberBannedError:
            await client.disconnect()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is banned from Telegram"
            )
        except FloodWaitError as e:
            await client.disconnect()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limited. Please wait {e.seconds} seconds"
            )
        except Exception as e:
            await client.disconnect()
            logger.error(f"Error sending OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP via Telegram"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp_production(
    request: OTPRequest,
    db: Session = Depends(get_db)
):
    """Verify OTP and authenticate user."""
    try:
        phone_number = clean_phone_number(request.phone)
        otp_code = request.otp.strip()
        
        logger.info(f"OTP verification for {phone_number}")
        
        # Get session data
        session_data = session_storage.get(phone_number)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active session found. Please request a new OTP."
            )
        
        # Check expiration
        if datetime.utcnow() > session_data['expires_at']:
            del session_storage[phone_number]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session expired. Please request a new one."
            )
        
        # Create client from stored session
        client = TelegramClient(
            StringSession(session_data['client_session']),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH
        )
        
        await client.connect()
        
        try:
            # Verify the OTP with Telegram
            user_obj = await client.sign_in(
                phone=phone_number,
                code=otp_code,
                phone_code_hash=session_data['phone_code_hash']
            )
            
            # Get Telegram user ID
            telegram_user_id = str(user_obj.id) if user_obj else None
            
            # Clean up
            await client.disconnect()
            del session_storage[phone_number]
            
            # Find or create user in our database
            email = f"telegram_{phone_number.replace('+', '').replace(' ', '')}@autoforwardx.com"
            user = db.query(User).filter(User.email == email).first()
            
            if not user:
                # Create new user
                username = f"user_{phone_number.replace('+', '').replace(' ', '')}"
                user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password("temp_password"),
                    plan="free",
                    status="active"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                # Create Telegram account record
                telegram_account = TelegramAccount(
                    user_id=user.id,
                    telegram_user_id=telegram_user_id,
                    phone_number=phone_number,
                    status="active"
                )
                db.add(telegram_account)
                db.commit()
            
            # Generate JWT tokens
            access_token = create_access_token(data={"sub": str(user.id)})
            refresh_token = create_refresh_token(data={"sub": str(user.id)})
            
            # User data for response
            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "plan": user.plan,
                "status": user.status,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            
            logger.info(f"User {user.id} authenticated successfully via Telegram OTP")
            
            return AuthResponse(
                success=True,
                message="Authentication successful",
                access_token=access_token,
                refresh_token=refresh_token,
                user=user_data
            )
            
        except PhoneCodeInvalidError:
            await client.disconnect()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code"
            )
        except PhoneCodeExpiredError:
            await client.disconnect()
            del session_storage[phone_number]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code expired. Please request a new one."
            )
        except SessionPasswordNeededError:
            await client.disconnect()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication enabled. Please disable it and try again."
            )
        except Exception as e:
            await client.disconnect()
            logger.error(f"Error verifying OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP or verification failed"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )