"""
Telegram OTP Authentication using Telethon client.
Proper implementation of Telegram client authentication without Bot API.
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Optional
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneNumberBannedError
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["Telegram OTP Authentication"])

# Get Telegram API credentials
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "23697291"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "b3a10e33ef507e864ed7018df0495ca8")

# In-memory storage for OTP sessions (in production, use Redis)
otp_sessions: Dict[str, Dict] = {}

class PhoneRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class OTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    otp_code: str = Field(..., description="OTP code received via Telegram")

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

async def create_telegram_client() -> TelegramClient:
    """Create and return a Telegram client."""
    client = TelegramClient(
        StringSession(),
        TELEGRAM_API_ID,
        TELEGRAM_API_HASH
    )
    await client.connect()
    return client

@router.post("/send-otp", response_model=AuthResponse)
async def send_otp(request: PhoneRequest, db: Session = Depends(get_db)):
    """
    Send OTP code to phone number using Telegram client.
    """
    try:
        phone = clean_phone_number(request.phone)
        logger.info(f"Sending OTP to phone: {phone}")
        
        # Create Telegram client
        client = await create_telegram_client()
        
        try:
            # Send code request
            sent_code = await client.send_code_request(phone)
            
            # Store session data
            session_string = client.session.save() if client.session else ""
            otp_sessions[phone] = {
                'phone_code_hash': sent_code.phone_code_hash,
                'session_string': session_string,
                'expires_at': datetime.utcnow() + timedelta(minutes=5),
                'attempts': 0
            }
            
            logger.info(f"OTP sent successfully to {phone}")
            
            return AuthResponse(
                success=True,
                message="OTP sent to your Telegram account"
            )
            
        except PhoneNumberBannedError:
            logger.error(f"Phone number {phone} is banned from Telegram")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is banned from Telegram"
            )
        except Exception as e:
            logger.error(f"Error sending OTP to {phone}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP. Please check your phone number."
            )
        finally:
            await client.disconnect()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_otp: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """
    Verify OTP code and authenticate user.
    """
    try:
        phone = clean_phone_number(request.phone)
        otp_code = request.otp_code.strip()
        
        # Check if session exists
        if phone not in otp_sessions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP session found. Please request a new OTP."
            )
        
        session_data = otp_sessions[phone]
        
        # Check if session expired
        if datetime.utcnow() > session_data['expires_at']:
            del otp_sessions[phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session expired. Please request a new OTP."
            )
        
        # Check attempts
        if session_data['attempts'] >= 3:
            del otp_sessions[phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Create client from stored session
        client = TelegramClient(
            StringSession(session_data['session_string']),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH
        )
        
        await client.connect()
        
        try:
            # Verify the code
            user = await client.sign_in(
                phone=phone,
                code=otp_code,
                phone_code_hash=session_data['phone_code_hash']
            )
            
            # Clean up session
            del otp_sessions[phone]
            
            # Get user information from signed in user
            me = await client.get_me()
            telegram_user_id = me.id
            username = me.username or f"user_{telegram_user_id}"
            
            # Find or create user in database
            db_user = db.query(User).filter(
                User.email == f"telegram_{phone}@autoforwardx.com"
            ).first()
            
            if not db_user:
                # Create new user
                db_user = User(
                    username=username,
                    email=f"telegram_{phone}@autoforwardx.com",
                    password_hash=hash_password("telegram_auth"),
                    plan="free",
                    status="active",
                    created_at=datetime.utcnow()
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
                
                # Create Telegram account entry
                telegram_account = TelegramAccount(
                    user_id=db_user.id,
                    telegram_user_id=telegram_user_id,
                    phone_number=phone,
                    session_data=client.session.save(),
                    status="active",
                    created_at=datetime.utcnow()
                )
                db.add(telegram_account)
                db.commit()
                
                logger.info(f"Created new user for phone {phone}")
            else:
                # Update existing user's Telegram account
                telegram_account = db.query(TelegramAccount).filter(
                    TelegramAccount.user_id == db_user.id
                ).first()
                
                if telegram_account:
                    telegram_account.session_data = client.session.save()
                    telegram_account.status = "active"
                    telegram_account.last_seen = datetime.utcnow()
                    db.commit()
                
                logger.info(f"Updated existing user for phone {phone}")
            
            # Generate JWT tokens
            access_token = create_access_token(data={"sub": str(db_user.id)})
            refresh_token = create_refresh_token(data={"sub": str(db_user.id)})
            
            # Prepare user data
            user_data = {
                "id": db_user.id,
                "username": db_user.username,
                "email": db_user.email,
                "plan": db_user.plan,
                "status": db_user.status,
                "phone": phone
            }
            
            return AuthResponse(
                success=True,
                message="Authentication successful",
                access_token=access_token,
                refresh_token=refresh_token,
                user=user_data
            )
            
        except PhoneCodeInvalidError:
            session_data['attempts'] += 1
            remaining_attempts = 3 - session_data['attempts']
            
            if remaining_attempts <= 0:
                del otp_sessions[phone]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid OTP. Too many attempts. Please request a new OTP."
                )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining_attempts} attempts remaining."
            )
        except SessionPasswordNeededError:
            # 2FA is enabled
            del otp_sessions[phone]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Two-factor authentication is enabled. Please disable 2FA to use this service."
            )
        finally:
            await client.disconnect()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in verify_otp: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )

@router.get("/client-info")
async def get_client_info():
    """Get Telegram client information for testing."""
    try:
        client = await create_telegram_client()
        try:
            is_connected = client.is_connected()
            return {
                "success": True,
                "api_id": TELEGRAM_API_ID,
                "api_hash": TELEGRAM_API_HASH[:10] + "...",
                "connected": is_connected
            }
        finally:
            await client.disconnect()
    except Exception as e:
        logger.error(f"Error getting client info: {e}")
        return {
            "success": False,
            "error": str(e)
        }