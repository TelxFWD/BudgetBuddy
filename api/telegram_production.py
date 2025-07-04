"""
Production Telegram OTP Authentication System
Sends real OTPs via Telegram using Telethon client
"""
import os
import json
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
import redis

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["Production Telegram Authentication"])

# Get Telegram API credentials
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "23697291"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "b3a10e33ef507e864ed7018df0495ca8")

# In-memory session storage for simplicity
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

def store_session_data(phone: str, data: Dict) -> None:
    """Store session data in Redis with expiration."""
    key = f"telegram_session:{phone}"
    redis_client.setex(key, 600, json.dumps(data))  # 10 minutes expiry
    logger.info(f"Stored session data for {phone}")

def get_session_data(phone: str) -> Optional[Dict]:
    """Retrieve session data from Redis."""
    key = f"telegram_session:{phone}"
    data = redis_client.get(key)
    if data and isinstance(data, str):
        return json.loads(data)
    return None

async def create_telegram_client(phone: str) -> TelegramClient:
    """Create and initialize a Telegram client for a specific phone number."""
    session_name = f"session_{phone.replace('+', '').replace(' ', '')}"
    
    client = TelegramClient(
        StringSession(),
        TELEGRAM_API_ID,
        TELEGRAM_API_HASH
    )
    
    await client.connect()
    return client

@router.post("/send-otp", response_model=AuthResponse)
async def send_otp_production(
    request: PhoneRequest,
    db: Session = Depends(get_db)
):
    """Send OTP via Telegram for authentication."""
    try:
        phone_number = clean_phone_number(request.phone)
        logger.info(f"Production OTP requested for phone: {phone_number}")

        # Create Telegram client
        client = await create_telegram_client(phone_number)
        
        # Store client for later use
        active_clients[phone_number] = client
        
        try:
            # Send code request
            sent_code = await client.send_code_request(phone_number)
            
            # Store session data
            session_data = {
                'phone_code_hash': sent_code.phone_code_hash,
                'session_string': client.session.save(),
                'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
            }
            
            store_session_data(phone_number, session_data)
            
            logger.info(f"OTP sent successfully to {phone_number} via Telegram")
            
            return AuthResponse(
                success=True,
                message="OTP sent successfully via Telegram"
            )
            
        except PhoneNumberBannedError:
            await client.disconnect()
            if phone_number in active_clients:
                del active_clients[phone_number]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is banned from Telegram"
            )
        except FloodWaitError as e:
            await client.disconnect()
            if phone_number in active_clients:
                del active_clients[phone_number]
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limited. Please wait {e.seconds} seconds"
            )
        except Exception as e:
            await client.disconnect()
            if phone_number in active_clients:
                del active_clients[phone_number]
            logger.error(f"Error sending OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP via Telegram"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_otp_production: {e}")
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
        
        logger.info(f"Production OTP verification for {phone_number}")
        
        # Get session data
        session_data = get_session_data(phone_number)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active session found. Please request a new OTP."
            )
        
        # Check expiration
        expires_at = datetime.fromisoformat(session_data['expires_at'])
        if datetime.utcnow() > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session expired. Please request a new one."
            )
        
        # Get the client
        client = active_clients.get(phone_number)
        if not client:
            # Recreate client from session
            client = TelegramClient(
                StringSession(session_data['session_string']),
                TELEGRAM_API_ID,
                TELEGRAM_API_HASH
            )
            await client.connect()
        
        try:
            # Verify the OTP
            await client.sign_in(
                phone=phone_number,
                code=otp_code,
                phone_code_hash=session_data['phone_code_hash']
            )
            
            # Get user info from Telegram
            me = await client.get_me()
            telegram_user_id = str(me.id) if me else None
            
            # Disconnect client
            await client.disconnect()
            if phone_number in active_clients:
                del active_clients[phone_number]
            
            # Clean up session data
            redis_client.delete(f"telegram_session:{phone_number}")
            
            # Find or create user
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
                
                # Create Telegram account
                telegram_account = TelegramAccount(
                    user_id=user.id,
                    telegram_user_id=telegram_user_id,
                    phone_number=phone_number,
                    status="active"
                )
                db.add(telegram_account)
                db.commit()
            else:
                # Update existing telegram account
                telegram_account = db.query(TelegramAccount).filter(
                    TelegramAccount.user_id == user.id,
                    TelegramAccount.phone_number == phone_number
                ).first()
                
                if telegram_account:
                    telegram_account.telegram_user_id = telegram_user_id
                    telegram_account.status = "active"
                    db.commit()
                else:
                    # Create new telegram account for existing user
                    telegram_account = TelegramAccount(
                        user_id=user.id,
                        telegram_user_id=telegram_user_id,
                        phone_number=phone_number,
                        status="active"
                    )
                    db.add(telegram_account)
                    db.commit()
            
            # Generate tokens
            access_token = create_access_token(data={"sub": str(user.id)})
            refresh_token = create_refresh_token(data={"sub": str(user.id)})
            
            # User data
            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "plan": user.plan,
                "status": user.status,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            
            logger.info(f"User {user.id} authenticated successfully via production Telegram OTP")
            
            return AuthResponse(
                success=True,
                message="Authentication successful",
                access_token=access_token,
                refresh_token=refresh_token,
                user=user_data
            )
            
        except PhoneCodeInvalidError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code"
            )
        except PhoneCodeExpiredError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code expired. Please request a new one."
            )
        except SessionPasswordNeededError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication enabled. Please disable it and try again."
            )
        except Exception as e:
            logger.error(f"Error verifying OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP or verification failed"
            )
        finally:
            # Ensure client is disconnected
            try:
                if client and client.is_connected():
                    await client.disconnect()
                if phone_number in active_clients:
                    del active_clients[phone_number]
            except:
                pass

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in verify_otp_production: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )