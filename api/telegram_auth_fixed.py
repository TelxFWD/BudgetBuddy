"""
Fixed Telegram OTP Authentication with proper session management.
Uses Telethon client with session persistence between send-otp and verify-otp.
"""
import os
import json
from datetime import datetime, timedelta
from typing import Dict, Optional
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError, 
    PhoneCodeInvalidError, 
    PhoneNumberBannedError,
    PhoneCodeExpiredError,
    PhoneCodeEmptyError
)
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TelegramAccount
from api.auth import create_access_token, create_refresh_token, hash_password
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["Telegram Authentication Fixed"])

# Get Telegram API credentials
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "23697291"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "b3a10e33ef507e864ed7018df0495ca8")

# Redis setup for session storage
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# In-memory storage for OTP sessions (fallback if Redis fails)
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

def store_session_data(phone: str, data: Dict) -> None:
    """Store session data in Redis with fallback to memory."""
    try:
        # Store in Redis with 5 minute expiration
        redis_client.setex(f"otp_session:{phone}", 300, json.dumps(data))
        logger.info(f"Session stored in Redis for {phone}")
    except Exception as e:
        logger.warning(f"Failed to store in Redis, using memory: {e}")
        # Fallback to in-memory storage
        otp_sessions[phone] = data

def get_session_data(phone: str) -> Optional[Dict]:
    """Get session data from Redis with fallback to memory."""
    try:
        # Try Redis first
        data = redis_client.get(f"otp_session:{phone}")
        if data:
            logger.info(f"Session retrieved from Redis for {phone}")
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Failed to retrieve from Redis, using memory: {e}")
    
    # Fallback to in-memory storage
    return otp_sessions.get(phone)

def delete_session_data(phone: str) -> None:
    """Delete session data from both Redis and memory."""
    try:
        redis_client.delete(f"otp_session:{phone}")
        logger.info(f"Session deleted from Redis for {phone}")
    except Exception as e:
        logger.warning(f"Failed to delete from Redis: {e}")
    
    # Also remove from memory
    otp_sessions.pop(phone, None)

@router.post("/send-otp", response_model=AuthResponse)
async def send_otp(request: PhoneRequest, db: Session = Depends(get_db)):
    """
    Send OTP code using Telethon client with proper session storage.
    """
    try:
        phone = clean_phone_number(request.phone)
        logger.info(f"Sending OTP to phone: {phone}")
        
        # Create new Telegram client
        client = TelegramClient(
            StringSession(),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH
        )
        
        await client.connect()
        logger.info(f"Telegram client connected for {phone}")
        
        try:
            # Send code request
            sent_code = await client.send_code_request(phone)
            logger.info(f"Code request sent for {phone}, type: {sent_code.type}")
            
            # Save session string
            session_string = client.session.save()
            logger.info(f"Session saved for {phone}, length: {len(session_string)}")
            
            # Store session data with all required info
            session_data = {
                'phone_code_hash': sent_code.phone_code_hash,
                'session_string': session_string,
                'phone': phone,
                'expires_at': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
                'attempts': 0,
                'created_at': datetime.utcnow().isoformat()
            }
            
            store_session_data(phone, session_data)
            logger.info(f"OTP session stored for {phone}: hash={sent_code.phone_code_hash[:10]}...")
            
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
            logger.error(f"Error sending OTP to {phone}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {str(e)}"
            )
        finally:
            await client.disconnect()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_otp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """
    Verify OTP code using stored session and phone_code_hash.
    """
    try:
        phone = clean_phone_number(request.phone)
        otp_code = request.otp_code.strip()
        
        logger.info(f"Verifying OTP for {phone}, code length: {len(otp_code)}")
        
        # Check if session exists
        session_data = get_session_data(phone)
        if not session_data:
            logger.error(f"No OTP session found for {phone}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP session found. Please request a new OTP."
            )
        
        logger.info(f"Retrieved session for {phone}: created={session_data.get('created_at')}")
        
        # Check if session expired
        expires_at = datetime.fromisoformat(session_data['expires_at'])
        if datetime.utcnow() > expires_at:
            logger.error(f"OTP session expired for {phone}")
            delete_session_data(phone)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session expired. Please request a new OTP."
            )
        
        # Check attempts
        if session_data['attempts'] >= 3:
            logger.error(f"Too many attempts for {phone}")
            delete_session_data(phone)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Restore client from stored session
        client = TelegramClient(
            StringSession(session_data['session_string']),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH
        )
        
        await client.connect()
        logger.info(f"Client restored and connected for {phone}")
        
        try:
            # Verify the code with stored phone_code_hash
            logger.info(f"Attempting sign_in for {phone} with code={otp_code}, hash={session_data['phone_code_hash'][:10]}...")
            
            user = await client.sign_in(
                phone=phone,
                code=otp_code,
                phone_code_hash=session_data['phone_code_hash']
            )
            
            logger.info(f"Sign-in successful for {phone}")
            
            # Clean up session
            delete_session_data(phone)
            
            # Get user information
            me = await client.get_me()
            telegram_user_id = me.id
            username = me.username or f"user_{telegram_user_id}"
            
            logger.info(f"Retrieved user info: id={telegram_user_id}, username={username}")
            
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
            
            logger.info(f"Authentication successful for {phone}")
            
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
            
            logger.warning(f"Invalid OTP for {phone}, attempts: {session_data['attempts']}")
            
            # Update session data with new attempt count
            store_session_data(phone, session_data)
            
            if remaining_attempts <= 0:
                delete_session_data(phone)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid OTP. Too many attempts. Please request a new OTP."
                )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining_attempts} attempts remaining."
            )
        except PhoneCodeExpiredError:
            logger.error(f"OTP expired for {phone}")
            delete_session_data(phone)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new one."
            )
        except PhoneCodeEmptyError:
            logger.error(f"Empty OTP code for {phone}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter the OTP code."
            )
        except SessionPasswordNeededError:
            logger.error(f"2FA enabled for {phone}")
            delete_session_data(phone)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Two-factor authentication is enabled. Please disable 2FA to use this service."
            )
        finally:
            await client.disconnect()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in verify_otp for {phone}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )

@router.get("/session-debug/{phone}")
async def debug_session(phone: str):
    """Debug endpoint to check stored session data."""
    clean_phone = clean_phone_number(phone)
    session_data = get_session_data(clean_phone)
    
    if not session_data:
        return {"error": "No session found"}
    
    return {
        "phone": clean_phone,
        "has_session": bool(session_data.get('session_string')),
        "has_hash": bool(session_data.get('phone_code_hash')),
        "session_length": len(session_data.get('session_string', '')),
        "hash_preview": session_data.get('phone_code_hash', '')[:10] + "..." if session_data.get('phone_code_hash') else None,
        "created_at": session_data.get('created_at'),
        "expires_at": session_data.get('expires_at'),
        "attempts": session_data.get('attempts', 0)
    }

@router.get("/client-info")
async def get_client_info():
    """Get Telegram client information for testing."""
    try:
        client = TelegramClient(
            StringSession(),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH
        )
        await client.connect()
        
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