"""
Accounts API endpoints for managing Telegram and Discord account connections.
Handles session management, authentication flows, and account operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import logging
import secrets
import time

from database.db import get_db
from database.models import User, TelegramAccount, DiscordAccount
from api.auth import get_current_user
from utils.plan_rules import PlanValidator, check_plan_expired, get_upgrade_message

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class TelegramAccountResponse(BaseModel):
    id: int
    phone: str
    username: Optional[str] = None
    status: str
    sessions: int
    lastActive: Optional[str] = None
    
    class Config:
        from_attributes = True

class DiscordAccountResponse(BaseModel):
    id: int
    username: str
    status: str
    guilds: int
    lastActive: Optional[str] = None
    
    class Config:
        from_attributes = True

class TelegramSessionRequest(BaseModel):
    phone: str

class DiscordBotRequest(BaseModel):
    bot_token: str
    bot_name: Optional[str] = None

class AuthUrlResponse(BaseModel):
    auth_url: str
    state: str

# Telegram Account Endpoints
@router.get("/accounts/telegram")
async def get_telegram_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all Telegram accounts for the current user."""
    try:
        accounts = db.query(TelegramAccount).filter(
            TelegramAccount.user_id == current_user.id
        ).all()
        
        result = []
        for account in accounts:
            # Simple status logic based on account status
            status = "connected" if account.status == "active" else "disconnected"
            sessions = 1 if account.status == "active" else 0
            last_active = "Recently active" if account.status == "active" else "Inactive"
            
            result.append({
                "id": account.id,
                "phone": account.phone_number,
                "username": account.telegram_user_id or f"@User{account.id}",
                "status": status,
                "sessions": sessions,
                "lastActive": last_active
            })
        
        return result
    except Exception as e:
        logger.error(f"Failed to get Telegram accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve Telegram accounts")

@router.get("/accounts/discord")
async def get_discord_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all Discord accounts for the current user."""
    try:
        accounts = db.query(DiscordAccount).filter(
            DiscordAccount.user_id == current_user.id
        ).all()
        
        result = []
        for account in accounts:
            # Simple status logic
            status = "connected" if account.is_active else "disconnected"
            guilds = 2 if account.is_active else 0
            last_active = "Recently active" if account.is_active else "Inactive"
            
            result.append({
                "id": account.id,
                "username": account.bot_username or f"Bot#{account.id}",
                "status": status,
                "guilds": guilds,
                "lastActive": last_active
            })
        
        return result
    except Exception as e:
        logger.error(f"Failed to get Discord accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve Discord accounts")

@router.post("/telegram/session/initiate")
async def initiate_telegram_session(
    request: TelegramSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate Telegram session creation process."""
    try:
        # Check plan limitations
        if current_user.plan == "free":
            existing_count = db.query(TelegramAccount).filter(
                TelegramAccount.user_id == current_user.id
            ).count()
            if existing_count >= 1:
                raise HTTPException(
                    status_code=403, 
                    detail="Free plan limited to 1 Telegram account. Upgrade to add more."
                )
        
        # Check if phone already exists
        existing = db.query(TelegramAccount).filter_by(
            phone_number=request.phone,
            user_id=current_user.id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        
        # Create demo account for testing
        try:
            new_account = TelegramAccount(
                user_id=current_user.id,
                phone_number=request.phone,
                telegram_user_id=f"demo_user_{current_user.id}",
                session_data="demo_session_data",
                status="pending_verification"
            )
            
            db.add(new_account)
            db.commit()
            db.refresh(new_account)
            
            return {
                "status": "success",
                "message": "Telegram account added successfully.",
                "session_id": new_account.id,
                "phone": request.phone
            }
        except Exception as e:
            logger.error(f"Failed to create Telegram account: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create Telegram account")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in initiate_telegram_session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/discord/auth-url", response_model=AuthUrlResponse)
async def get_discord_auth_url(
    current_user: User = Depends(get_current_user)
):
    """Get Discord OAuth2 authorization URL."""
    try:
        # Check plan limitations
        if current_user.plan == "free":
            raise HTTPException(
                status_code=403,
                detail="Discord support requires Pro or Elite plan. Please upgrade."
            )
        
        # Generate Discord OAuth2 URL
        # In a real implementation, you would use Discord's OAuth2 flow
        # For demo purposes, return a placeholder
        state = f"user_{current_user.id}_{int(time.time())}"
        
        auth_url = f"https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=8&scope=bot&state={state}"
        
        return AuthUrlResponse(
            auth_url=auth_url,
            state=state
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Discord auth URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate authorization URL")

@router.post("/telegram/session/reconnect/{session_id}")
async def reconnect_telegram_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reconnect a Telegram session."""
    try:
        # Verify session belongs to user
        account = db.query(TelegramAccount).filter(
            TelegramAccount.id == session_id,
            TelegramAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Attempt to reconnect - demo implementation
        try:
            # Update account status
            account.is_active = True
            db.commit()
            
            return {
                "status": "success",
                "message": "Session reconnected successfully",
                "session_status": "connected"
            }
        except Exception as e:
            logger.error(f"Failed to reconnect Telegram session {session_id}: {e}")
            db.rollback()
            return {
                "status": "error",
                "message": "Failed to reconnect session. Please try again or re-add the account."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in reconnect_telegram_session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/discord/session/reconnect/{session_id}")
async def reconnect_discord_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reconnect a Discord session."""
    try:
        # Verify session belongs to user
        account = db.query(DiscordAccount).filter(
            DiscordAccount.id == session_id,
            DiscordAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Attempt to reconnect - demo implementation
        try:
            # Update account status
            account.is_active = True
            db.commit()
            
            return {
                "status": "success",
                "message": "Discord bot reconnected successfully",
                "session_status": "connected"
            }
        except Exception as e:
            logger.error(f"Failed to reconnect Discord session {session_id}: {e}")
            db.rollback()
            return {
                "status": "error",
                "message": "Failed to reconnect Discord bot. Please check bot token and permissions."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in reconnect_discord_session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/telegram/session/switch/{session_id}")
async def switch_telegram_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch active Telegram session."""
    try:
        # Verify session belongs to user
        account = db.query(TelegramAccount).filter(
            TelegramAccount.id == session_id,
            TelegramAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Set all other sessions as inactive
        db.query(TelegramAccount).filter(
            TelegramAccount.user_id == current_user.id
        ).update({"is_active": False})
        
        # Set this session as active
        account.is_active = True
        db.commit()
        
        return {
            "status": "success",
            "message": f"Switched to account {account.username or account.phone}",
            "active_session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error switching Telegram session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/discord/session/switch/{session_id}")
async def switch_discord_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch active Discord session."""
    try:
        # Verify session belongs to user
        account = db.query(DiscordAccount).filter(
            DiscordAccount.id == session_id,
            DiscordAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Set all other sessions as inactive
        db.query(DiscordAccount).filter(
            DiscordAccount.user_id == current_user.id
        ).update({"is_active": False})
        
        # Set this session as active
        account.is_active = True
        db.commit()
        
        return {
            "status": "success",
            "message": f"Switched to bot {account.bot_username}",
            "active_session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error switching Discord session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/telegram/session/{session_id}")
async def delete_telegram_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Telegram session."""
    try:
        # Verify session belongs to user
        account = db.query(TelegramAccount).filter(
            TelegramAccount.id == session_id,
            TelegramAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Clean up session - demo implementation
        logger.info(f"Deleting Telegram session {session_id}")
        
        # Delete from database
        db.delete(account)
        db.commit()
        
        return {
            "status": "success",
            "message": "Telegram account removed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting Telegram session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/discord/session/{session_id}")
async def delete_discord_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Discord session."""
    try:
        # Verify session belongs to user
        account = db.query(DiscordAccount).filter(
            DiscordAccount.id == session_id,
            DiscordAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Clean up session - demo implementation
        logger.info(f"Deleting Discord session {session_id}")
        
        # Delete from database
        db.delete(account)
        db.commit()
        
        return {
            "status": "success",
            "message": "Discord bot removed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting Discord session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

# Legacy endpoints for backwards compatibility
@router.delete("/accounts/telegram/{session_id}")
async def legacy_delete_telegram_account(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint for deleting Telegram account."""
    return await delete_telegram_session(session_id, current_user, db)

@router.delete("/accounts/discord/{session_id}")
async def legacy_delete_discord_account(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint for deleting Discord account."""
    return await delete_discord_session(session_id, current_user, db)

@router.post("/accounts/telegram/{session_id}/reconnect")
async def legacy_reconnect_telegram_account(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint for reconnecting Telegram account."""
    return await reconnect_telegram_session(session_id, current_user, db)

@router.post("/accounts/discord/{session_id}/reconnect")
async def legacy_reconnect_discord_account(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint for reconnecting Discord account."""
    return await reconnect_discord_session(session_id, current_user, db)

@router.post("/accounts/telegram/{session_id}/switch")
async def legacy_switch_telegram_account(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint for switching Telegram account."""
    return await switch_telegram_session(session_id, current_user, db)

@router.post("/accounts/discord/{session_id}/switch")
async def legacy_switch_discord_account(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy endpoint for switching Discord account."""
    return await switch_discord_session(session_id, current_user, db)