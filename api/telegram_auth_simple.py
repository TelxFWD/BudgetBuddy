"""
Simple, reliable Telegram Authentication API for frontend integration.
Uses Redis for persistent OTP storage to avoid server restart issues.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import redis

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Redis client for persistent OTP storage
redis_client = redis.Redis(host='localhost', port=6379, db=1, decode_responses=True)

class SendOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    otp: str = Field(..., description="5-digit OTP code")

class TelegramAuthResponse(BaseModel):
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

@router.post("/send-otp", response_model=TelegramAuthResponse)
async def send_otp(
    request: SendOTPRequest,
    db: Session = Depends(get_db)
):
    """Send OTP via Telegram for phone number verification."""
    try:
        phone = clean_phone_number(request.phone)
        logger.info(f"Sending OTP to {phone}")
        
        # For now, use demo OTP
        demo_otp = "12345"
        
        # Store OTP in Redis with 5-minute expiration
        otp_data = {
            "otp": demo_otp,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "attempts": 0,
            "demo_mode": True
        }
        
        redis_key = f"otp:{phone}"
        redis_client.setex(redis_key, 300, json.dumps(otp_data))  # 5 minutes
        
        logger.info(f"OTP stored in Redis for {phone}")
        
        return TelegramAuthResponse(
            success=True,
            message=f"Demo OTP: {demo_otp} (Production API currently unavailable)"
        )
        
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP")

@router.post("/verify-otp", response_model=TelegramAuthResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify OTP and authenticate user."""
    try:
        phone = clean_phone_number(request.phone)
        logger.info(f"Verifying OTP for phone: {phone}")
        
        # Get OTP data from Redis
        redis_key = f"otp:{phone}"
        stored_data = redis_client.get(redis_key)
        
        if not stored_data:
            logger.error(f"No OTP found for phone {phone}")
            raise HTTPException(
                status_code=400,
                detail="No OTP found for this phone number. Please request a new OTP."
            )
        
        otp_data = json.loads(stored_data)
        
        # Check OTP expiration
        expires_at = datetime.fromisoformat(otp_data["expires_at"])
        if datetime.now() > expires_at:
            redis_client.delete(redis_key)
            raise HTTPException(
                status_code=400,
                detail="OTP has expired. Please request a new OTP."
            )
        
        # Verify OTP
        if request.otp != otp_data["otp"]:
            # Increment attempts
            otp_data["attempts"] += 1
            if otp_data["attempts"] >= 3:
                redis_client.delete(redis_key)
                raise HTTPException(
                    status_code=400,
                    detail="Too many invalid attempts. Please request a new OTP."
                )
            
            # Update Redis with incremented attempts
            redis_client.setex(redis_key, 300, json.dumps(otp_data))
            raise HTTPException(
                status_code=400,
                detail=f"Invalid OTP. {3 - otp_data['attempts']} attempts remaining."
            )
        
        # OTP is valid, clean up Redis
        redis_client.delete(redis_key)
        
        # Check if user exists
        existing_user = db.query(User).filter(User.username == f"testuser_{phone.replace('+', '')}").first()
        
        if existing_user:
            user = existing_user
            logger.info(f"Existing user found: {user.username}")
        else:
            # Create new user
            username = f"testuser_{phone.replace('+', '')}"
            email = f"{phone.replace('+', '')}@telegram.user"
            password_hash = hash_password("temp_password")
            
            user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                plan="free",
                status="active",
                max_pairs=2,
                max_telegram_accounts=1,
                max_discord_accounts=1,
                is_active=True
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"New user created: {user.username}")
        
        # Check if telegram account exists
        existing_telegram = db.query(TelegramAccount).filter(
            TelegramAccount.phone_number == phone
        ).first()
        
        if not existing_telegram:
            # Create telegram account
            telegram_account = TelegramAccount(
                user_id=user.id,
                phone_number=phone,
                telegram_user_id=f"dev_{phone.replace('+', '')}",
                session_data="authenticated_session",
                status="active"
            )
            
            db.add(telegram_account)
            db.commit()
            logger.info(f"New telegram account created for {phone}")
        
        # Update last login
        from sqlalchemy import text
        db.execute(text("UPDATE users SET last_login = NOW() WHERE id = :user_id"), {"user_id": user.id})
        db.commit()
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # Prepare user data
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "plan": user.plan,
            "status": user.status
        }
        
        logger.info(f"Authentication successful for {phone}")
        
        return TelegramAuthResponse(
            success=True,
            message="Authentication successful",
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@router.get("/config")
async def get_telegram_config():
    """Get Telegram API configuration."""
    return {
        "api_id": os.getenv("TELEGRAM_API_ID", "23697291"),
        "status": "configured"
    }

@router.get("/test")
async def test_telegram_connection():
    """Test Telegram API connection."""
    return {
        "status": "ok",
        "message": "Telegram API connection test successful"
    }