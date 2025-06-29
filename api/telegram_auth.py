"""
Telegram Bot Authentication API endpoints.
Handles OTP-based authentication for Telegram bot users.
"""
import asyncio
import logging
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram-auth", tags=["Telegram Bot Authentication"])

# In-memory OTP storage (in production, use Redis)
otp_storage: Dict[str, Dict] = {}

class OTPRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")

class OTPVerify(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")
    otp_code: str = Field(..., description="6-digit OTP code")

class TelegramAuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[Dict] = None

def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))

def clean_phone_number(phone: str) -> str:
    """Clean and normalize phone number."""
    # Remove all non-digit characters except +
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    
    # Ensure it starts with +
    if not cleaned.startswith('+'):
        cleaned = '+' + cleaned
    
    return cleaned

@router.post("/request-otp", response_model=TelegramAuthResponse)
async def request_otp(
    request: OTPRequest,
    db: Session = Depends(get_db)
):
    """
    Request OTP for Telegram bot authentication.
    In production, this would send SMS via Twilio or similar service.
    """
    try:
        phone_number = clean_phone_number(request.phone_number)
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        otp_storage[phone_number] = {
            'code': otp_code,
            'expires_at': datetime.utcnow() + timedelta(minutes=5),
            'attempts': 0
        }
        
        # In production, send SMS here
        logger.info(f"OTP generated for {phone_number}: {otp_code}")
        
        # For development, log the OTP
        print(f"📱 OTP for {phone_number}: {otp_code}")
        
        return TelegramAuthResponse(
            success=True,
            message="OTP sent successfully"
        )
        
    except Exception as e:
        logger.error(f"Error requesting OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp", response_model=TelegramAuthResponse)
async def verify_otp(
    request: OTPVerify,
    db: Session = Depends(get_db)
):
    """
    Verify OTP and authenticate user for Telegram bot.
    """
    try:
        phone_number = clean_phone_number(request.phone_number)
        otp_code = request.otp_code.strip()
        
        # Check if OTP exists
        if phone_number not in otp_storage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP request found for this phone number"
            )
        
        otp_data = otp_storage[phone_number]
        
        # Check if OTP expired
        if datetime.utcnow() > otp_data['expires_at']:
            del otp_storage[phone_number]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new one."
            )
        
        # Check attempts
        if otp_data['attempts'] >= 3:
            del otp_storage[phone_number]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Verify OTP
        if otp_code != otp_data['code']:
            otp_data['attempts'] += 1
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code"
            )
        
        # OTP verified successfully, clean up
        del otp_storage[phone_number]
        
        # Find or create user
        user = db.query(User).filter(User.email == f"telegram_{phone_number}@temp.com").first()
        
        if not user:
            # Create new user
            user = User(
                username=f"tg_{phone_number.replace('+', '').replace(' ', '')}",
                email=f"telegram_{phone_number}@temp.com",
                password_hash=hash_password("temp_password"),  # Temporary password
                plan="free",
                status="active",
                created_at=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create Telegram account entry
            telegram_account = TelegramAccount(
                user_id=user.id,
                phone_number=phone_number,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(telegram_account)
            db.commit()
        
        # Update last login (skip for now due to model constraints)
        # user.last_login = datetime.utcnow()
        # db.commit()
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # Prepare user data
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "plan": user.plan,
            "status": user.status,
            "phone_number": phone_number
        }
        
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.get("/linked-accounts")
async def get_linked_accounts(
    db: Session = Depends(get_db)
):
    """
    Get linked Telegram and Discord accounts for the user.
    This is a simplified version for the bot.
    """
    try:
        # For now, return empty accounts - this would be populated
        # when users actually connect their accounts
        return {
            "success": True,
            "telegram_accounts": [],
            "discord_accounts": []
        }
    except Exception as e:
        logger.error(f"Error getting linked accounts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get linked accounts"
        )

@router.get("/me")
async def get_current_user_telegram(
    db: Session = Depends(get_db)
):
    """
    Get current user information for Telegram bot.
    """
    try:
        # Simplified user info for bot
        return {
            "success": True,
            "id": 1,
            "username": "demo_user",
            "plan": "free",
            "plan_expiry": None
        }
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )