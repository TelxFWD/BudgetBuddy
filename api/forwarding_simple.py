"""
Simplified Forwarding Pairs API endpoints that match the frontend expectations.
This provides a compatibility layer between the complex backend and simple frontend.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database.db import get_db
from database.models import User, ForwardingPair
from api.auth import get_current_user
from utils.logger import logger

router = APIRouter(prefix="/forwarding", tags=["forwarding"])

# Simple Pydantic models matching frontend expectations
class SimpleForwardingPairCreate(BaseModel):
    source_platform: str  # "telegram" or "discord"
    target_platform: str  # "telegram" or "discord"
    source_id: str       # Channel/chat ID
    target_id: str       # Channel/chat ID
    delay_minutes: int = 0

class SimpleForwardingPairResponse(BaseModel):
    id: int
    source_platform: str
    target_platform: str
    source_id: str
    target_id: str
    status: str  # "active", "paused", "error"
    delay_minutes: int
    messages_forwarded: int
    created_at: str
    last_forwarded: Optional[str] = None
    copy_mode: bool = False
    custom_header: Optional[str] = None
    custom_footer: Optional[str] = None
    remove_header: bool = False
    remove_footer: bool = False

class MessageFormatRequest(BaseModel):
    custom_header: Optional[str] = None
    custom_footer: Optional[str] = None
    remove_header: bool = False
    remove_footer: bool = False

def check_plan_limits(user: User, db: Session) -> bool:
    """Check if user can create more forwarding pairs."""
    existing_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == user.id,
        ForwardingPair.is_active == True
    ).count()
    
    # Plan limits
    limits = {
        "free": 1,
        "pro": 15,
        "elite": 50
    }
    
    max_pairs = limits.get(user.plan.lower(), 1)
    return existing_pairs < max_pairs

@router.get("/pairs", response_model=List[SimpleForwardingPairResponse])
async def get_pairs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all forwarding pairs for the current user."""
    pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id
    ).order_by(ForwardingPair.created_at.desc()).all()
    
    result = []
    for pair in pairs:
        # Convert database model to simple response
        status = "active" if getattr(pair, 'is_active', True) else "paused"
        
        result.append(SimpleForwardingPairResponse(
            id=pair.id,
            source_platform="telegram",  # Simplified for demo
            target_platform="telegram",  # Simplified for demo
            source_id=getattr(pair, 'source_channel', '') or "",
            target_id=getattr(pair, 'destination_channel', '') or "",
            status=status,
            delay_minutes=(getattr(pair, 'delay', 0) or 0) // 60,
            messages_forwarded=getattr(pair, 'messages_forwarded', 0) or 0,
            created_at=pair.created_at.isoformat() if hasattr(pair, 'created_at') and pair.created_at else "",
            last_forwarded=pair.last_forwarded.isoformat() if hasattr(pair, 'last_forwarded') and pair.last_forwarded else None,
            copy_mode=getattr(pair, 'copy_mode', False) or False,
            custom_header=getattr(pair, 'custom_header', None),
            custom_footer=getattr(pair, 'custom_footer', None),
            remove_header=getattr(pair, 'remove_header', False) or False,
            remove_footer=getattr(pair, 'remove_footer', False) or False
        ))
    
    return result

@router.post("/pairs", response_model=SimpleForwardingPairResponse)
async def create_pair(
    pair_data: SimpleForwardingPairCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new forwarding pair."""
    # Check plan limits
    if not check_plan_limits(current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Plan limit reached. Upgrade to create more pairs."
        )
    
    # Check for cross-platform restriction for free users
    if current_user.plan.lower() == "free" and pair_data.source_platform != pair_data.target_platform:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-platform forwarding requires Pro or Elite plan"
        )
    
    # Check for duplicate pairs
    existing_pair = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.source_channel == pair_data.source_id,
        ForwardingPair.destination_channel == pair_data.target_id
    ).first()
    
    if existing_pair:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forwarding pair already exists"
        )
    
    # Create new pair
    new_pair = ForwardingPair(
        user_id=current_user.id,
        source_channel=pair_data.source_id,
        destination_channel=pair_data.target_id,
        delay=pair_data.delay_minutes * 60,  # Convert to seconds
        platform_type=f"{pair_data.source_platform}_to_{pair_data.target_platform}",
        is_active=True,
        messages_forwarded=0,
        created_at=datetime.utcnow()
    )
    
    db.add(new_pair)
    db.commit()
    db.refresh(new_pair)
    
    logger.info(f"Simple forwarding pair created: {new_pair.id} by user {current_user.username}")
    
    return SimpleForwardingPairResponse(
        id=new_pair.id,
        source_platform=pair_data.source_platform,
        target_platform=pair_data.target_platform,
        source_id=pair_data.source_id,
        target_id=pair_data.target_id,
        status="active",
        delay_minutes=pair_data.delay_minutes,
        messages_forwarded=0,
        created_at=new_pair.created_at.isoformat(),
        last_forwarded=None,
        copy_mode=False
    )

@router.delete("/pairs/{pair_id}")
async def delete_pair(
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

@router.post("/pairs/{pair_id}/pause")
async def pause_pair(
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
    db.commit()
    
    logger.info(f"Forwarding pair paused: {pair_id} by user {current_user.username}")
    
    return {"message": "Forwarding pair paused"}

@router.post("/pairs/{pair_id}/resume")
async def resume_pair(
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
    db.commit()
    
    logger.info(f"Forwarding pair resumed: {pair_id} by user {current_user.username}")
    
    return {"message": "Forwarding pair resumed"}

@router.patch("/pairs/{pair_id}/message-format")
async def update_message_format(
    pair_id: int,
    format_request: MessageFormatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update message formatting controls for Pro/Elite users only."""
    
    # Check if user has Pro or Elite plan
    if current_user.plan.lower() not in ["pro", "elite"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upgrade to Pro or Elite to access message formatting controls"
        )
    
    # Get the forwarding pair
    pair = db.query(ForwardingPair).filter(
        ForwardingPair.id == pair_id,
        ForwardingPair.user_id == current_user.id
    ).first()
    
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forwarding pair not found"
        )
    
    # Update message formatting settings
    pair.custom_header = format_request.custom_header
    pair.custom_footer = format_request.custom_footer
    pair.remove_header = format_request.remove_header
    pair.remove_footer = format_request.remove_footer
    
    db.commit()
    
    logger.info(f"Message formatting updated for pair {pair_id} by user {current_user.username}")
    
    return {"message": "Message formatting updated successfully"}

@router.get("/plan/limits")
async def get_plan_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get plan limits and usage information."""
    existing_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.is_active == True
    ).count()
    
    plan_limits = {
        "free": {"forwarding_pairs": 1, "cross_platform": False},
        "pro": {"forwarding_pairs": 15, "cross_platform": True},
        "elite": {"forwarding_pairs": 50, "cross_platform": True}
    }
    
    plan_features = {
        "free": {"message_formatting": False, "copy_mode": False},
        "pro": {"message_formatting": True, "copy_mode": False},
        "elite": {"message_formatting": True, "copy_mode": True}
    }
    
    user_plan = current_user.plan.lower()
    limits = plan_limits.get(user_plan, plan_limits["free"])
    features = plan_features.get(user_plan, plan_features["free"])
    
    return {
        "plan": current_user.plan.title(),
        "limits": limits,
        "features": features,
        "usage": {
            "forwarding_pairs": existing_pairs
        },
        "upgrade_message": "Upgrade to Pro or Elite for more features!" if user_plan == "free" else "Thanks for being a Pro/Elite user!"
    }