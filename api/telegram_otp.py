
"""
Telegram OTP Authentication System
Simple phone-based authentication with OTP verification
"""
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
router = APIRouter(prefix="/api/telegram", tags=["Telegram OTP"])

# In-memory OTP storage (use Redis in production)
otp_storage: Dict[str, Dict] = {}

class SendOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code") 
    otp: str = Field(..., description="6-digit OTP code")
    session_string: Optional[str] = Field(None, description="Session string from send-otp")
    phone_code_hash: Optional[str] = Field(None, description="Phone code hash from send-otp")

class OTPResponse(BaseModel):
    success: bool
    message: str
    session_string: Optional[str] = None
    phone_code_hash: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[Dict] = None

def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))

def generate_session_string() -> str:
    """Generate a mock session string for demo purposes."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

def generate_phone_code_hash() -> str:
    """Generate a mock phone code hash for demo purposes."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

def clean_phone_number(phone: str) -> str:
    """Clean and normalize phone number."""
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
    if not cleaned.startswith('+'):
        cleaned = '+' + cleaned
    return cleaned

@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(
    request: SendOTPRequest,
    db: Session = Depends(get_db)
):
    """Send OTP to phone number for authentication."""
    try:
        phone_number = clean_phone_number(request.phone)
        logger.info(f"OTP requested for phone: {phone_number}")

        # Generate OTP and session data
        otp_code = generate_otp()
        session_string = generate_session_string()
        phone_code_hash = generate_phone_code_hash()

        # Store OTP with 5-minute expiration
        otp_storage[phone_number] = {
            'code': otp_code,
            'session_string': session_string,
            'phone_code_hash': phone_code_hash,
            'expires_at': datetime.utcnow() + timedelta(minutes=5),
            'attempts': 0
        }

        # Log OTP for development (in production, send via SMS)
        logger.info(f"Generated OTP for {phone_number}: {otp_code}")
        print(f"📱 OTP for {phone_number}: {otp_code}")

        return OTPResponse(
            success=True,
            message="OTP sent successfully",
            session_string=session_string,
            phone_code_hash=phone_code_hash
        )

    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp", response_model=OTPResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify OTP and authenticate user."""
    try:
        phone_number = clean_phone_number(request.phone)
        otp_code = request.otp.strip()

        logger.info(f"OTP verification attempt for {phone_number}")

        # Check if OTP exists
        if phone_number not in otp_storage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found. Please request a new OTP."
            )

        otp_data = otp_storage[phone_number]

        # Check expiration
        if datetime.utcnow() > otp_data['expires_at']:
            del otp_storage[phone_number]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="OTP expired. Please request a new one."
            )

        # Check attempts
        if otp_data['attempts'] >= 3:
            del otp_storage[phone_number]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )

        # Verify session data if provided
        if request.session_string and request.session_string != otp_data['session_string']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session data"
            )

        if request.phone_code_hash and request.phone_code_hash != otp_data['phone_code_hash']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone code hash"
            )

        # Verify OTP
        if otp_code != otp_data['code']:
            otp_data['attempts'] += 1
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code"
            )

        # OTP verified - clean up
        del otp_storage[phone_number]

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
            "phone_number": phone_number
        }

        logger.info(f"User {user.id} authenticated successfully")

        return OTPResponse(
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
