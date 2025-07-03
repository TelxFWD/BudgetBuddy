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
from pyrogram.client import Client
from pyrogram.errors import SessionPasswordNeeded, UserNotParticipant, PhoneNumberInvalid

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["Telegram Authentication"])

# In-memory OTP storage (in production, use Redis)
otp_storage: Dict[str, Dict] = {}

class SendOTPRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")

class VerifyOTPRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")
    otp_code: str = Field(..., description="5-digit OTP code")

class TelegramAuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[Dict] = None

def generate_otp() -> str:
    """Generate a 5-digit OTP code (matching Telegram's format)."""
    return ''.join(random.choices(string.digits, k=5))

async def send_telegram_otp_production(phone: str) -> dict:
    """
    Send OTP via Telegram API using production method.
    This uses Telegram's send_code method to request verification code.
    Returns dict with success status and phone_code_hash.
    """
    try:
        api_id = os.getenv("TELEGRAM_API_ID")
        api_hash = os.getenv("TELEGRAM_API_HASH")
        
        if not api_id or not api_hash:
            logger.error("Telegram API credentials not configured")
            return {"success": False, "error": "API credentials not configured"}
        
        from pyrogram.client import Client
        from pyrogram.errors import PhoneNumberInvalid, PhoneNumberBanned
        
        # Create session directory if it doesn't exist
        os.makedirs("sessions/otp", exist_ok=True)
        
        # Create a client for OTP sending
        client = Client(
            "otp_session",
            api_id=int(api_id),
            api_hash=api_hash,
            workdir="sessions/otp"
        )
        
        try:
            await client.connect()
            
            # Send verification code via Telegram
            sent_code = await client.send_code(phone)
            
            logger.info(f"OTP sent successfully to {phone} via Telegram")
            
            return {
                "success": True,
                "phone_code_hash": sent_code.phone_code_hash,
                "phone": phone,
                "message": f"OTP sent to {phone} via Telegram"
            }
            
        except PhoneNumberInvalid:
            logger.error(f"Invalid phone number: {phone}")
            return {"success": False, "error": "Invalid phone number"}
        except PhoneNumberBanned:
            logger.error(f"Phone number banned: {phone}")
            return {"success": False, "error": "Phone number is banned"}
        except Exception as e:
            logger.error(f"Failed to send OTP via Telegram: {e}")
            return {"success": False, "error": f"Failed to send OTP: {str(e)}"}
        finally:
            try:
                await client.disconnect()
            except:
                pass
                
    except Exception as e:
        logger.error(f"Error in production OTP sending: {e}")
        return {"success": False, "error": f"System error: {str(e)}"}

async def verify_telegram_otp_production(phone: str, otp_code: str, phone_code_hash: str) -> dict:
    """
    Verify OTP via Telegram API using production method.
    Returns dict with success status and user data.
    """
    try:
        api_id = os.getenv("TELEGRAM_API_ID")
        api_hash = os.getenv("TELEGRAM_API_HASH")
        
        if not api_id or not api_hash:
            logger.error("Telegram API credentials not configured")
            return {"success": False, "error": "API credentials not configured"}
        
        from pyrogram.client import Client
        from pyrogram.errors import PhoneCodeInvalid, PhoneCodeExpired, SessionPasswordNeeded
        
        # Create session directory if it doesn't exist
        os.makedirs("sessions/otp", exist_ok=True)
        
        # Create a client for OTP verification
        client = Client(
            "otp_session",
            api_id=int(api_id),
            api_hash=api_hash,
            workdir="sessions/otp"
        )
        
        try:
            await client.connect()
            
            # Sign in with the verification code
            signed_in = await client.sign_in(phone, phone_code_hash, otp_code)
            
            # Get user info
            me = await client.get_me()
            
            logger.info(f"User successfully authenticated via Telegram: {me.id}")
            
            return {
                "success": True,
                "user_data": {
                    "telegram_id": me.id,
                    "phone": phone,
                    "first_name": me.first_name,
                    "last_name": me.last_name,
                    "username": me.username
                }
            }
            
        except PhoneCodeInvalid:
            logger.error(f"Invalid verification code for {phone}")
            return {"success": False, "error": "Invalid verification code"}
        except PhoneCodeExpired:
            logger.error(f"Verification code expired for {phone}")
            return {"success": False, "error": "Verification code has expired"}
        except SessionPasswordNeeded:
            logger.error(f"Two-factor authentication required for {phone}")
            return {"success": False, "error": "Two-factor authentication required. Please use a different method."}
        except Exception as e:
            logger.error(f"Failed to verify OTP via Telegram: {e}")
            return {"success": False, "error": f"Verification failed: {str(e)}"}
        finally:
            try:
                await client.disconnect()
            except:
                pass
                
    except Exception as e:
        logger.error(f"Error in production OTP verification: {e}")
        return {"success": False, "error": f"System error: {str(e)}"}

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
        phone = clean_phone_number(request.phone_number)
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
            result = await send_telegram_otp_production(phone)
            if not result["success"]:
                raise HTTPException(
                    status_code=500,
                    detail=result.get("error", "Failed to send OTP via Telegram. Please try again.")
                )
            
            # Store phone_code_hash instead of OTP for production verification
            otp_storage[phone] = {
                "phone_code_hash": result["phone_code_hash"],
                "expires_at": datetime.now() + timedelta(minutes=5),
                "attempts": 0
            }
            
            return {
                "success": True,
                "message": result["message"]
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
        logger.info(f"OTP verification request - Phone: {request.phone_number}, OTP: {request.otp_code}")
        
        # Clean phone number
        phone = clean_phone_number(request.phone_number)
        logger.info(f"Cleaned phone number: {phone}")
        
        # Check if OTP exists and is valid
        if phone not in otp_storage:
            logger.error(f"No OTP found for phone: {phone}")
            raise HTTPException(
                status_code=400,
                detail="No OTP found for this phone number. Please request a new OTP."
            )
        
        otp_data = otp_storage[phone]
        logger.info(f"OTP data found for {phone}: {otp_data}")
        
        # Check if OTP is expired
        if datetime.now() > otp_data["expires_at"]:
            logger.error(f"OTP expired for phone: {phone}")
            del otp_storage[phone]
            raise HTTPException(
                status_code=400,
                detail="OTP has expired. Please request a new OTP."
            )
        
        # Check attempt limit
        if otp_data["attempts"] >= 3:
            logger.error(f"Too many attempts for phone: {phone}")
            del otp_storage[phone]
            raise HTTPException(
                status_code=400,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Check if production mode is enabled
        use_production = os.getenv("TELEGRAM_PRODUCTION_MODE", "false").lower() == "true"
        
        if use_production:
            # Production mode: Verify OTP via Telegram API
            if "phone_code_hash" not in otp_data:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid verification session. Please request a new OTP."
                )
            
            result = await verify_telegram_otp_production(phone, request.otp_code, otp_data["phone_code_hash"])
            if not result["success"]:
                otp_data["attempts"] += 1
                error_detail = result.get("error", "Invalid OTP")
                if otp_data["attempts"] >= 3:
                    del otp_storage[phone]
                    error_detail += " Too many failed attempts. Please request a new OTP."
                else:
                    error_detail += f" {3 - otp_data['attempts']} attempts remaining."
                raise HTTPException(status_code=400, detail=error_detail)
            
            # Store user data from Telegram
            telegram_user_data = result["user_data"]
            
        else:
            # Demo mode: Verify stored OTP
            if request.otp_code != otp_data["otp"]:
                otp_data["attempts"] += 1
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid OTP. {3 - otp_data['attempts']} attempts remaining."
                )
            
            # Demo user data
            telegram_user_data = {
                "telegram_id": f"demo_{phone.replace('+', '')}",
                "phone": phone,
                "first_name": "Demo",
                "last_name": "User",
                "username": f"demo_user_{phone.replace('+', '')}"
            }
        
        # OTP is valid, clean up
        del otp_storage[phone]
        
        # Create username from Telegram data or phone
        username = telegram_user_data.get("username") or f"user_{phone.replace('+', '')}"
        
        # Find or create user
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            # Create new user with Telegram data
            user = User(
                username=username,
                email=f"{phone.replace('+', '')}@telegram.user",
                password_hash=hash_password("telegram_user_" + phone),
                plan="free",
                status="active"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user for phone: {phone} with username: {username}")
        
        # Find or create Telegram account
        telegram_account = db.query(TelegramAccount).filter(
            TelegramAccount.phone_number == phone
        ).first()
        
        if not telegram_account:
            # Create Telegram account with production data
            telegram_account = TelegramAccount(
                user_id=user.id,
                phone_number=phone,
                telegram_user_id=str(telegram_user_data.get("telegram_id", f"demo_{user.id}")),
                session_data="authenticated_session",
                status="active"
            )
            db.add(telegram_account)
            db.commit()
            db.refresh(telegram_account)
            logger.info(f"Created Telegram account for user: {user.id} with Telegram ID: {telegram_user_data.get('telegram_id')}")
        else:
            # Update existing account with new data
            telegram_account.telegram_user_id = str(telegram_user_data.get("telegram_id", telegram_account.telegram_user_id))
            telegram_account.status = "active"
            telegram_account.session_data = "authenticated_session"
            telegram_account.user_id = user.id
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