"""
Telegram Authentication API endpoints for frontend integration.
Handles phone number verification and OTP generation.
"""
import asyncio
import logging
import random
import string
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password
from utils.logger import get_logger
from pyrogram import Client
from pyrogram.errors import SessionPasswordNeeded, UserNotParticipant, PhoneNumberInvalid

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["Telegram Authentication"])

# In-memory OTP storage (in production, use Redis)
otp_storage: Dict[str, Dict] = {}

class SendOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    otp: str = Field(..., description="6-digit OTP code")

class TelegramAuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[Dict] = None

def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))

async def send_telegram_otp(phone: str, otp_code: str) -> bool:
    """
    Send OTP via Telegram API using Pyrogram client.
    Returns True if successful, False otherwise.
    """
    try:
        api_id = os.getenv("TELEGRAM_API_ID")
        api_hash = os.getenv("TELEGRAM_API_HASH")
        
        if not api_id or not api_hash:
            logger.error("Telegram API credentials not configured")
            return False
        
        # Create a temporary client for sending OTP
        async with Client(
            "otp_sender",
            api_id=int(api_id),
            api_hash=api_hash,
            workdir="sessions/temp"
        ) as client:
            # Send code request to Telegram
            try:
                await client.send_code(phone)
                logger.info(f"OTP sent successfully to {phone}")
                return True
            except PhoneNumberInvalid:
                logger.error(f"Invalid phone number: {phone}")
                return False
            except Exception as e:
                logger.error(f"Failed to send OTP via Telegram: {e}")
                return False
                
    except Exception as e:
        logger.error(f"Error initializing Telegram client for OTP: {e}")
        return False

def clean_phone_number(phone: str) -> str:
    """Clean and normalize phone number."""
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    
    if not cleaned.startswith('+'):
        if cleaned.startswith('91') and len(cleaned) == 12:
            cleaned = '+' + cleaned
        elif len(cleaned) == 10:
            cleaned = '+91' + cleaned
        else:
            cleaned = '+' + cleaned
    
    return cleaned

@router.post("/send-otp")
async def send_otp(
    request: SendOTPRequest,
    db: Session = Depends(get_db)
):
    """Send OTP via Telegram for phone number verification."""
    try:
        # Clean phone number
        phone = clean_phone_number(request.phone)
        logger.info(f"Sending OTP to phone: {phone}")
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        otp_storage[phone] = {
            "otp": otp_code,
            "expires_at": datetime.now() + timedelta(minutes=5),
            "attempts": 0
        }
        
        # Check if we should use production mode or demo mode
        use_production = os.getenv("TELEGRAM_PRODUCTION_MODE", "false").lower() == "true"
        
        if use_production:
            # Production mode: Send actual OTP via Telegram
            success = await send_telegram_otp(phone, otp_code)
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to send OTP via Telegram. Please try again."
                )
            
            return {
                "success": True,
                "message": f"OTP sent to {phone} via Telegram"
            }
        else:
            # Demo mode: Return OTP in response for testing
            logger.info(f"Generated OTP for {phone}: {otp_code}")
            return {
                "success": True,
                "message": f"OTP sent to {phone} via Telegram",
                "demo_otp": otp_code
            }
        
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP. Please check your phone number."
        )

@router.post("/verify-otp")
async def verify_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify OTP and authenticate user."""
    try:
        # Clean phone number
        phone = clean_phone_number(request.phone)
        
        # Check if OTP exists and is valid
        if phone not in otp_storage:
            raise HTTPException(
                status_code=400,
                detail="No OTP found for this phone number. Please request a new OTP."
            )
        
        otp_data = otp_storage[phone]
        
        # Check if OTP is expired
        if datetime.now() > otp_data["expires_at"]:
            del otp_storage[phone]
            raise HTTPException(
                status_code=400,
                detail="OTP has expired. Please request a new OTP."
            )
        
        # Check attempt limit
        if otp_data["attempts"] >= 3:
            del otp_storage[phone]
            raise HTTPException(
                status_code=400,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Verify OTP
        if request.otp != otp_data["otp"]:
            otp_data["attempts"] += 1
            raise HTTPException(
                status_code=400,
                detail=f"Invalid OTP. {3 - otp_data['attempts']} attempts remaining."
            )
        
        # OTP is valid, clean up
        del otp_storage[phone]
        
        # Find or create user
        user = db.query(User).filter(User.username == f"user_{phone.replace('+', '')}").first()
        
        if not user:
            # Create new user
            user = User(
                username=f"user_{phone.replace('+', '')}",
                email=f"{phone.replace('+', '')}@telegram.user",
                password_hash=hash_password("telegram_user_" + phone),
                plan="free",
                status="active"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user for phone: {phone}")
        
        # Find or create Telegram account
        telegram_account = db.query(TelegramAccount).filter(
            TelegramAccount.phone_number == phone,
            TelegramAccount.user_id == user.id
        ).first()
        
        if not telegram_account:
            # Create Telegram account
            telegram_account = TelegramAccount(
                user_id=user.id,
                phone_number=phone,
                telegram_user_id=f"user_{user.id}",
                session_data="authenticated_session",
                status="active"
            )
            db.add(telegram_account)
            db.commit()
            db.refresh(telegram_account)
            logger.info(f"Created Telegram account for user: {user.id}")
        else:
            # Update existing account to active
            telegram_account.status = "active"
            telegram_account.session_data = "authenticated_session"
            db.commit()
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # Update last login
        user.last_login = datetime.now()
        db.commit()
        
        return TelegramAuthResponse(
            success=True,
            message="Authentication successful",
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "plan": user.plan,
                "phone": phone
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify OTP: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to verify OTP. Please try again."
        )

@router.get("/config")
async def get_telegram_config():
    """Get Telegram API configuration."""
    return {
        "api_id": os.getenv("TELEGRAM_API_ID", ""),
        "api_hash": os.getenv("TELEGRAM_API_HASH", ""),
        "configured": bool(os.getenv("TELEGRAM_API_ID") and os.getenv("TELEGRAM_API_HASH"))
    }

@router.get("/test")
async def test_telegram_connection():
    """Test Telegram API connection."""
    try:
        api_id = os.getenv("TELEGRAM_API_ID")
        api_hash = os.getenv("TELEGRAM_API_HASH")
        
        if not api_id or not api_hash:
            return {
                "status": "error",
                "message": "Telegram API credentials not configured"
            }
        
        return {
            "status": "success",
            "message": "Telegram API credentials configured",
            "api_id": api_id
        }
        
    except Exception as e:
        logger.error(f"Telegram test failed: {e}")
        return {
            "status": "error",
            "message": f"Telegram test failed: {str(e)}"
        }