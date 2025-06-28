"""
Forwarding Pairs API endpoints for CRUD operations on message forwarding configurations.
Handles creating, editing, pausing, resuming, and deleting forwarding pairs.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database.db import get_db
from database.models import User, ForwardingPair, TelegramAccount, DiscordAccount
from api.auth import get_current_user
from utils.logger import logger

router = APIRouter(prefix="/forwarding", tags=["forwarding"])

# Pydantic models
class ForwardingPairCreate(BaseModel):
    source_platform: str  # "telegram" or "discord"
    source_account_id: int
    source_chat_id: str
    destination_platform: str  # "telegram" or "discord"
    destination_account_id: int
    destination_chat_id: str
    delay_seconds: int = 0
    silent_mode: bool = False
    copy_mode: bool = False

class ForwardingPairUpdate(BaseModel):
    delay_seconds: Optional[int] = None
    is_active: Optional[bool] = None
    silent_mode: Optional[bool] = None
    copy_mode: Optional[bool] = None

class ForwardingPairResponse(BaseModel):
    id: int
    source_platform: str
    source_account_id: int
    source_chat_id: str
    destination_platform: str
    destination_account_id: int
    destination_chat_id: str
    delay_seconds: int
    is_active: bool
    silent_mode: bool
    copy_mode: bool
    created_at: datetime
    last_forwarded: Optional[datetime]

def validate_plan_limits(user: User, db: Session) -> dict:
    """Check user's plan limits for forwarding pairs."""
    existing_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == user.id,
        ForwardingPair.is_active == True
    ).count()
    
    limits = {
        "free": {"max_pairs": 3, "max_delay": 300},  # 5 minutes max delay
        "pro": {"max_pairs": 50, "max_delay": 60},   # 1 minute max delay  
        "elite": {"max_pairs": 500, "max_delay": 0}  # No delay limit
    }
    
    plan_limits = limits.get(user.plan, limits["free"])
    
    return {
        "current_pairs": existing_pairs,
        "max_pairs": plan_limits["max_pairs"],
        "max_delay": plan_limits["max_delay"],
        "can_create": existing_pairs < plan_limits["max_pairs"]
    }

def validate_account_ownership(user_id: int, platform: str, account_id: int, db: Session) -> bool:
    """Verify user owns the specified account."""
    if platform == "telegram":
        account = db.query(TelegramAccount).filter(
            TelegramAccount.id == account_id,
            TelegramAccount.user_id == user_id,
            TelegramAccount.status == "active"
        ).first()
    elif platform == "discord":
        account = db.query(DiscordAccount).filter(
            DiscordAccount.id == account_id,
            DiscordAccount.user_id == user_id,
            DiscordAccount.status == "active"
        ).first()
    else:
        return False
    
    return account is not None

@router.get("/", response_model=List[ForwardingPairResponse])
async def list_forwarding_pairs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all forwarding pairs for the current user."""
    pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id
    ).order_by(ForwardingPair.created_at.desc()).all()
    
    return [
        ForwardingPairResponse(
            id=pair.id,
            source_platform=pair.source_platform,
            source_account_id=pair.source_account_id,
            source_chat_id=pair.source_chat_id,
            destination_platform=pair.destination_platform,
            destination_account_id=pair.destination_account_id,
            destination_chat_id=pair.destination_chat_id,
            delay_seconds=pair.delay_seconds,
            is_active=pair.is_active,
            silent_mode=pair.silent_mode,
            copy_mode=pair.copy_mode,
            created_at=pair.created_at,
            last_forwarded=pair.last_forwarded
        ) for pair in pairs
    ]

@router.post("/", response_model=ForwardingPairResponse)
async def create_forwarding_pair(
    pair_data: ForwardingPairCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new forwarding pair."""
    # Validate plan limits
    limits = validate_plan_limits(current_user, db)
    if not limits["can_create"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan limit reached. Maximum {limits['max_pairs']} pairs allowed for {current_user.plan} plan"
        )
    
    # Validate delay limits
    if pair_data.delay_seconds > limits["max_delay"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Delay limit exceeded. Maximum {limits['max_delay']} seconds allowed for {current_user.plan} plan"
        )
    
    # Validate platform values
    valid_platforms = ["telegram", "discord"]
    if pair_data.source_platform not in valid_platforms or pair_data.destination_platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform must be 'telegram' or 'discord'"
        )
    
    # Validate account ownership
    if not validate_account_ownership(current_user.id, pair_data.source_platform, pair_data.source_account_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Source account not found or not owned by user"
        )
    
    if not validate_account_ownership(current_user.id, pair_data.destination_platform, pair_data.destination_account_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Destination account not found or not owned by user"
        )
    
    # Check for duplicate pairs
    existing_pair = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.source_platform == pair_data.source_platform,
        ForwardingPair.source_account_id == pair_data.source_account_id,
        ForwardingPair.source_chat_id == pair_data.source_chat_id,
        ForwardingPair.destination_platform == pair_data.destination_platform,
        ForwardingPair.destination_account_id == pair_data.destination_account_id,
        ForwardingPair.destination_chat_id == pair_data.destination_chat_id
    ).first()
    
    if existing_pair:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forwarding pair already exists"
        )
    
    # Create new forwarding pair
    new_pair = ForwardingPair(
        user_id=current_user.id,
        source_platform=pair_data.source_platform,
        source_account_id=pair_data.source_account_id,
        source_chat_id=pair_data.source_chat_id,
        destination_platform=pair_data.destination_platform,
        destination_account_id=pair_data.destination_account_id,
        destination_chat_id=pair_data.destination_chat_id,
        delay_seconds=pair_data.delay_seconds,
        is_active=True,
        silent_mode=pair_data.silent_mode,
        copy_mode=pair_data.copy_mode
    )
    
    db.add(new_pair)
    db.commit()
    db.refresh(new_pair)
    
    logger.info(f"Forwarding pair created: {new_pair.id} by user {current_user.username}")
    
    return ForwardingPairResponse(
        id=new_pair.id,
        source_platform=new_pair.source_platform,
        source_account_id=new_pair.source_account_id,
        source_chat_id=new_pair.source_chat_id,
        destination_platform=new_pair.destination_platform,
        destination_account_id=new_pair.destination_account_id,
        destination_chat_id=new_pair.destination_chat_id,
        delay_seconds=new_pair.delay_seconds,
        is_active=new_pair.is_active,
        silent_mode=new_pair.silent_mode,
        copy_mode=new_pair.copy_mode,
        created_at=new_pair.created_at,
        last_forwarded=new_pair.last_forwarded
    )

@router.put("/{pair_id}", response_model=ForwardingPairResponse)
async def update_forwarding_pair(
    pair_id: int,
    pair_data: ForwardingPairUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing forwarding pair."""
    pair = db.query(ForwardingPair).filter(
        ForwardingPair.id == pair_id,
        ForwardingPair.user_id == current_user.id
    ).first()
    
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forwarding pair not found"
        )
    
    # Validate delay limits if updating delay
    if pair_data.delay_seconds is not None:
        limits = validate_plan_limits(current_user, db)
        if pair_data.delay_seconds > limits["max_delay"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Delay limit exceeded. Maximum {limits['max_delay']} seconds allowed for {current_user.plan} plan"
            )
        pair.delay_seconds = pair_data.delay_seconds
    
    # Update other fields
    if pair_data.is_active is not None:
        pair.is_active = pair_data.is_active
    if pair_data.silent_mode is not None:
        pair.silent_mode = pair_data.silent_mode
    if pair_data.copy_mode is not None:
        pair.copy_mode = pair_data.copy_mode
    
    pair.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Forwarding pair updated: {pair_id} by user {current_user.username}")
    
    return ForwardingPairResponse(
        id=pair.id,
        source_platform=pair.source_platform,
        source_account_id=pair.source_account_id,
        source_chat_id=pair.source_chat_id,
        destination_platform=pair.destination_platform,
        destination_account_id=pair.destination_account_id,
        destination_chat_id=pair.destination_chat_id,
        delay_seconds=pair.delay_seconds,
        is_active=pair.is_active,
        silent_mode=pair.silent_mode,
        copy_mode=pair.copy_mode,
        created_at=pair.created_at,
        last_forwarded=pair.last_forwarded
    )

@router.delete("/{pair_id}")
async def delete_forwarding_pair(
    pair_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a forwarding pair."""
    pair = db.query(ForwardingPair).filter(
        ForwardingPair.id == pair_id,
        ForwardingPair.user_id == current_user.id
    ).first()
    
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forwarding pair not found"
        )
    
    db.delete(pair)
    db.commit()
    
    logger.info(f"Forwarding pair deleted: {pair_id} by user {current_user.username}")
    
    return {"message": "Forwarding pair deleted successfully"}

@router.post("/{pair_id}/pause")
async def pause_forwarding_pair(
    pair_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause a forwarding pair."""
    pair = db.query(ForwardingPair).filter(
        ForwardingPair.id == pair_id,
        ForwardingPair.user_id == current_user.id
    ).first()
    
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forwarding pair not found"
        )
    
    pair.is_active = False
    pair.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Forwarding pair paused: {pair_id} by user {current_user.username}")
    
    return {"message": "Forwarding pair paused"}

@router.post("/{pair_id}/resume")
async def resume_forwarding_pair(
    pair_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a forwarding pair."""
    pair = db.query(ForwardingPair).filter(
        ForwardingPair.id == pair_id,
        ForwardingPair.user_id == current_user.id
    ).first()
    
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forwarding pair not found"
        )
    
    pair.is_active = True
    pair.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Forwarding pair resumed: {pair_id} by user {current_user.username}")
    
    return {"message": "Forwarding pair resumed"}

@router.get("/limits")
async def get_plan_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's plan limits and usage."""
    return validate_plan_limits(current_user, db)