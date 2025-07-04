"""
Forwarding Pairs API endpoints with plan-based feature restrictions.
Handles creating, editing, pausing, resuming, and deleting forwarding pairs with proper validation.
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
from utils.plan_rules import PlanValidator, PlatformType, check_plan_expired, get_upgrade_message

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
    platform_type: str
    created_at: datetime
    # Message formatting controls
    custom_header: Optional[str] = None
    custom_footer: Optional[str] = None
    remove_header: bool = False
    remove_footer: bool = False
    
    class Config:
        from_attributes = True

class MessageFormatRequest(BaseModel):
    custom_header: Optional[str] = None
    custom_footer: Optional[str] = None
    remove_header: bool = False
    remove_footer: bool = False

def validate_plan_limits(user: User, db: Session) -> dict:
    """Check user's plan limits for forwarding pairs."""
    # Check if plan is expired
    if check_plan_expired(user.plan_expires_at):
        user.plan = "free"  # Downgrade to free if expired
        db.commit()
    
    existing_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == user.id,
        ForwardingPair.is_active == True
    ).count()
    
    plan_limits = PlanValidator.get_plan_limits(user.plan)
    
    return {
        "current_pairs": existing_pairs,
        "max_pairs": plan_limits["max_forwarding_pairs"],
        "can_create": existing_pairs < plan_limits["max_forwarding_pairs"],
        "plan_summary": PlanValidator.get_plan_summary(user.plan)
    }

def validate_account_ownership(user_id: int, platform: str, account_id: int, db: Session) -> bool:
    """Verify user owns the specified account."""
    try:
        if platform == "telegram":
            account = db.query(TelegramAccount).filter(
                TelegramAccount.id == account_id,
                TelegramAccount.user_id == user_id
            ).first()
            logger.info(f"Telegram account validation: account_id={account_id}, user_id={user_id}, found={account is not None}")
            return account is not None
        
        elif platform == "discord":
            account = db.query(DiscordAccount).filter(
                DiscordAccount.id == account_id,
                DiscordAccount.user_id == user_id
            ).first()
            logger.info(f"Discord account validation: account_id={account_id}, user_id={user_id}, found={account is not None}")
            return account is not None
        
        return False
    except Exception as e:
        logger.error(f"Error validating account ownership: {str(e)}")
        return False

@router.get("/pairs")
async def list_forwarding_pairs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all forwarding pairs for the current user."""
    pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id
    ).order_by(ForwardingPair.created_at.desc()).all()
    
    result = []
    for pair in pairs:
        # Determine source/destination platform and account IDs
        source_platform = "telegram" if pair.telegram_account_id else "discord"
        source_account_id = pair.telegram_account_id or pair.discord_account_id
        
        # For simplicity, destination is opposite platform unless same platform
        dest_platform = "discord" if source_platform == "telegram" else "telegram"
        dest_account_id = source_account_id  # This would need proper mapping
        
        result.append({
            "id": pair.id,
            "source_platform": source_platform,
            "source_account_id": source_account_id,
            "source_chat": pair.source_channel,
            "destination_platform": dest_platform,
            "destination_account_id": dest_account_id,
            "destination_chat": pair.destination_channel,
            "delay_minutes": pair.delay // 60 if pair.delay else 0,
            "status": "active" if pair.is_active else "paused",
            "silent_mode": pair.silent_mode,
            "copy_mode": pair.copy_mode,
            "platform_type": pair.platform_type,
            "created_at": pair.created_at,
            "messages_forwarded": 0,  # Placeholder
            "block_images": False,  # Placeholder
            "block_text": False,  # Placeholder
            "custom_header": pair.custom_header,
            "custom_footer": pair.custom_footer,
            "remove_header": pair.remove_header or False,
            "remove_footer": pair.remove_footer or False
        })
    
    return result

@router.post("/pairs", response_model=ForwardingPairResponse)
async def create_forwarding_pair(
    pair_data: ForwardingPairCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new forwarding pair with plan-based validation."""
    # Check if plan is expired
    if check_plan_expired(current_user.plan_expires_at):
        current_user.plan = "free"
        db.commit()
    
    # Validate plan limits
    limits = validate_plan_limits(current_user, db)
    if not limits["can_create"]:
        max_pairs = limits['max_pairs']
        if max_pairs == 999:
            max_pairs = "unlimited"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan limit reached. Maximum {max_pairs} pairs allowed for {current_user.plan} plan. {get_upgrade_message(current_user.plan, 'additional_pairs')}"
        )
    
    # Determine platform type for validation
    platform_type = f"{pair_data.source_platform}_to_{pair_data.destination_platform}"
    
    # Validate platform combination is allowed for user's plan
    can_add, message = PlanValidator.can_add_forwarding_pair(
        current_user.plan, 
        limits["current_pairs"], 
        platform_type
    )
    
    if not can_add:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message
        )
    
    # Validate copy mode feature
    if pair_data.copy_mode:
        can_copy, copy_message = PlanValidator.can_use_feature(current_user.plan, "copy_mode")
        if not can_copy:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=copy_message
            )
    
    # Validate platform values
    valid_platforms = ["telegram", "discord"]
    if pair_data.source_platform not in valid_platforms or pair_data.destination_platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform must be 'telegram' or 'discord'"
        )
    
    # Validate account ownership
    logger.info(f"Validating source account: platform={pair_data.source_platform}, account_id={pair_data.source_account_id}")
    if not validate_account_ownership(current_user.id, pair_data.source_platform, pair_data.source_account_id, db):
        logger.error(f"Source account validation failed: user_id={current_user.id}, platform={pair_data.source_platform}, account_id={pair_data.source_account_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Source account {pair_data.source_account_id} not found or not owned by user on {pair_data.source_platform}"
        )
    
    logger.info(f"Validating destination account: platform={pair_data.destination_platform}, account_id={pair_data.destination_account_id}")
    if not validate_account_ownership(current_user.id, pair_data.destination_platform, pair_data.destination_account_id, db):
        logger.error(f"Destination account validation failed: user_id={current_user.id}, platform={pair_data.destination_platform}, account_id={pair_data.destination_account_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Destination account {pair_data.destination_account_id} not found or not owned by user on {pair_data.destination_platform}"
        )
    
    # Check for duplicate pairs
    existing_pair = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.source_channel == pair_data.source_chat_id,
        ForwardingPair.destination_channel == pair_data.destination_chat_id,
        ForwardingPair.is_active == True
    ).first()
    
    if existing_pair:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forwarding pair already exists"
        )
    
    # Determine which account IDs to use based on platform
    telegram_account_id = None
    discord_account_id = None
    
    if pair_data.source_platform == "telegram":
        telegram_account_id = pair_data.source_account_id
    elif pair_data.source_platform == "discord":
        discord_account_id = pair_data.source_account_id
    
    # For cross-platform pairs, we need both account types
    if pair_data.destination_platform == "telegram" and pair_data.source_platform == "discord":
        # Discord to Telegram: need destination telegram account
        telegram_account_id = pair_data.destination_account_id
        discord_account_id = pair_data.source_account_id
    elif pair_data.destination_platform == "discord" and pair_data.source_platform == "telegram":
        # Telegram to Discord: need destination discord account  
        telegram_account_id = pair_data.source_account_id
        discord_account_id = pair_data.destination_account_id
    
    # Create new forwarding pair with correct database fields
    new_pair = ForwardingPair(
        user_id=current_user.id,
        telegram_account_id=telegram_account_id,
        discord_account_id=discord_account_id,
        source_channel=pair_data.source_chat_id,
        destination_channel=pair_data.destination_chat_id,
        delay=pair_data.delay_seconds,
        platform_type=platform_type,
        is_active=True,
        silent_mode=pair_data.silent_mode,
        copy_mode=pair_data.copy_mode,
        status="active"
    )
    
    try:
        logger.info(f"Creating forwarding pair: user_id={current_user.id}")
        logger.info(f"Platform type: {platform_type}")
        logger.info(f"Source: {pair_data.source_platform}:{pair_data.source_account_id} -> {pair_data.source_chat_id}")
        logger.info(f"Destination: {pair_data.destination_platform}:{pair_data.destination_account_id} -> {pair_data.destination_chat_id}")
        logger.info(f"Account IDs: telegram={telegram_account_id}, discord={discord_account_id}")
        
        db.add(new_pair)
        db.commit()
        db.refresh(new_pair)
        
        logger.info(f"Forwarding pair created successfully: {new_pair.id} by user {current_user.username}")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error creating forwarding pair for user {current_user.username}")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Pair data: source_platform={pair_data.source_platform}, dest_platform={pair_data.destination_platform}")
        logger.error(f"Account IDs: telegram_id={telegram_account_id}, discord_id={discord_account_id}")
        logger.error(f"Channels: {pair_data.source_chat_id} -> {pair_data.destination_chat_id}")
        
        # More specific error messages
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forwarding pair with these settings already exists"
            )
        elif "FOREIGN KEY constraint failed" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid account reference - account not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
    
    # Return response
    source_platform = "telegram" if new_pair.telegram_account_id else "discord"
    source_account_id = new_pair.telegram_account_id or new_pair.discord_account_id
    dest_platform = pair_data.destination_platform
    dest_account_id = pair_data.destination_account_id
    
    return ForwardingPairResponse(
        id=new_pair.id,
        source_platform=source_platform,
        source_account_id=source_account_id,
        source_chat_id=new_pair.source_channel,
        destination_platform=dest_platform,
        destination_account_id=dest_account_id,
        destination_chat_id=new_pair.destination_channel,
        delay_seconds=new_pair.delay,
        is_active=new_pair.is_active,
        silent_mode=new_pair.silent_mode,
        copy_mode=new_pair.copy_mode,
        platform_type=new_pair.platform_type,
        created_at=new_pair.created_at
    )

@router.put("/{pair_id}", response_model=ForwardingPairResponse)
async def update_forwarding_pair(
    pair_id: int,
    pair_data: ForwardingPairUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing forwarding pair with plan validation."""
    pair = db.query(ForwardingPair).filter(
        ForwardingPair.id == pair_id,
        ForwardingPair.user_id == current_user.id
    ).first()
    
    if not pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forwarding pair not found"
        )
    
    # Validate copy mode feature if updating
    if pair_data.copy_mode is not None and pair_data.copy_mode:
        can_copy, copy_message = PlanValidator.can_use_feature(current_user.plan, "copy_mode")
        if not can_copy:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=copy_message
            )
    
    # Update fields
    if pair_data.delay_seconds is not None:
        pair.delay = pair_data.delay_seconds
    if pair_data.is_active is not None:
        pair.is_active = pair_data.is_active
    if pair_data.silent_mode is not None:
        pair.silent_mode = pair_data.silent_mode
    if pair_data.copy_mode is not None:
        pair.copy_mode = pair_data.copy_mode
    
    pair.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Forwarding pair updated: {pair_id} by user {current_user.username}")
    
    # Return updated response
    source_platform = "telegram" if pair.telegram_account_id else "discord"
    source_account_id = pair.telegram_account_id or pair.discord_account_id
    dest_platform = "discord" if source_platform == "telegram" else "telegram"
    dest_account_id = source_account_id
    
    return ForwardingPairResponse(
        id=pair.id,
        source_platform=source_platform,
        source_account_id=source_account_id,
        source_chat_id=pair.source_channel,
        destination_platform=dest_platform,
        destination_account_id=dest_account_id,
        destination_chat_id=pair.destination_channel,
        delay_seconds=pair.delay,
        is_active=pair.is_active,
        silent_mode=pair.silent_mode,
        copy_mode=pair.copy_mode,
        platform_type=pair.platform_type,
        created_at=pair.created_at,
        custom_header=pair.custom_header,
        custom_footer=pair.custom_footer,
        remove_header=pair.remove_header or False,
        remove_footer=pair.remove_footer or False
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

@router.patch("/{pair_id}/message-edit")
async def update_message_formatting(
    pair_id: int,
    format_request: MessageFormatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update message formatting controls for Pro/Elite users only."""
    
    # Check if user has Pro or Elite plan
    if current_user.plan not in ["pro", "elite"]:
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
    pair.updated_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Message formatting updated for pair {pair_id} by user {current_user.username}")
    
    # Return updated response
    source_platform = "telegram" if pair.telegram_account_id else "discord"
    source_account_id = pair.telegram_account_id or pair.discord_account_id
    dest_platform = "discord" if source_platform == "telegram" else "telegram"
    dest_account_id = source_account_id
    
    return ForwardingPairResponse(
        id=pair.id,
        source_platform=source_platform,
        source_account_id=source_account_id,
        source_chat_id=pair.source_channel,
        destination_platform=dest_platform,
        destination_account_id=dest_account_id,
        destination_chat_id=pair.destination_channel,
        delay_seconds=pair.delay,
        is_active=pair.is_active,
        silent_mode=pair.silent_mode,
        copy_mode=pair.copy_mode,
        platform_type=pair.platform_type,
        created_at=pair.created_at,
        custom_header=pair.custom_header,
        custom_footer=pair.custom_footer,
        remove_header=pair.remove_header or False,
        remove_footer=pair.remove_footer or False
    )

@router.get("/limits")
async def get_plan_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's plan limits and usage."""
    return validate_plan_limits(current_user, db)


@router.get("/debug/accounts")
async def debug_user_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check user's accounts."""
    telegram_accounts = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == current_user.id
    ).all()
    
    discord_accounts = db.query(DiscordAccount).filter(
        DiscordAccount.user_id == current_user.id
    ).all()
    
    return {
        "user_id": current_user.id,
        "telegram_accounts": [
            {
                "id": acc.id,
                "phone_number": acc.phone_number,
                "status": acc.status,
                "telegram_user_id": acc.telegram_user_id
            } for acc in telegram_accounts
        ],
        "discord_accounts": [
            {
                "id": acc.id,
                "discord_user_id": acc.discord_user_id,
                "status": acc.status,
                "bot_name": acc.bot_name
            } for acc in discord_accounts
        ]
    }

@router.post("/debug/validate")
async def debug_validate_pair(
    pair_data: ForwardingPairCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to validate pair creation without actually creating it."""
    errors = []
    warnings = []
    
    try:
        # Check plan limits
        limits = validate_plan_limits(current_user, db)
        if not limits["can_create"]:
            errors.append(f"Plan limit reached. Maximum {limits['max_pairs']} pairs allowed")
        
        # Check platform values
        valid_platforms = ["telegram", "discord"]
        if pair_data.source_platform not in valid_platforms:
            errors.append(f"Invalid source platform: {pair_data.source_platform}")
        if pair_data.destination_platform not in valid_platforms:
            errors.append(f"Invalid destination platform: {pair_data.destination_platform}")
        
        # Get all user accounts for debugging
        telegram_accounts = db.query(TelegramAccount).filter(
            TelegramAccount.user_id == current_user.id
        ).all()
        
        discord_accounts = db.query(DiscordAccount).filter(
            DiscordAccount.user_id == current_user.id
        ).all()
        
        # Check account ownership
        source_valid = validate_account_ownership(
            current_user.id, 
            pair_data.source_platform, 
            pair_data.source_account_id, 
            db
        )
        dest_valid = validate_account_ownership(
            current_user.id, 
            pair_data.destination_platform, 
            pair_data.destination_account_id, 
            db
        )
        
        if not source_valid:
            errors.append(f"Source account {pair_data.source_account_id} not found or not owned by user on {pair_data.source_platform}")
        if not dest_valid:
            errors.append(f"Destination account {pair_data.destination_account_id} not found or not owned by user on {pair_data.destination_platform}")
        
        # Check for duplicates
        existing_pair = db.query(ForwardingPair).filter(
            ForwardingPair.user_id == current_user.id,
            ForwardingPair.source_channel == pair_data.source_chat_id,
            ForwardingPair.destination_channel == pair_data.destination_chat_id
        ).first()
        
        if existing_pair:
            warnings.append("Forwarding pair already exists")
        
        # Validate platform combination
        platform_type = f"{pair_data.source_platform}_to_{pair_data.destination_platform}"
        can_add, message = PlanValidator.can_add_forwarding_pair(
            current_user.plan, 
            limits["current_pairs"], 
            platform_type
        )
        
        if not can_add:
            errors.append(message)
        
        # Test database model creation (dry run)
        test_telegram_id = None
        test_discord_id = None
        
        if pair_data.source_platform == "telegram":
            test_telegram_id = pair_data.source_account_id
        elif pair_data.source_platform == "discord":
            test_discord_id = pair_data.source_account_id
            
        # Cross-platform handling
        if pair_data.destination_platform == "telegram" and pair_data.source_platform == "discord":
            test_telegram_id = pair_data.destination_account_id
        elif pair_data.destination_platform == "discord" and pair_data.source_platform == "telegram":
            test_discord_id = pair_data.destination_account_id
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "available_accounts": {
                "telegram": [
                    {
                        "id": acc.id,
                        "phone_number": acc.phone_number,
                        "status": acc.status,
                        "telegram_user_id": str(acc.telegram_user_id) if acc.telegram_user_id else None
                    } for acc in telegram_accounts
                ],
                "discord": [
                    {
                        "id": acc.id,
                        "discord_user_id": acc.discord_user_id,
                        "status": acc.status,
                        "bot_name": getattr(acc, 'bot_name', None)
                    } for acc in discord_accounts
                ]
            },
            "pair_data": {
                "source_platform": pair_data.source_platform,
                "source_account_id": pair_data.source_account_id,
                "source_chat_id": pair_data.source_chat_id,
                "destination_platform": pair_data.destination_platform,
                "destination_account_id": pair_data.destination_account_id,
                "destination_chat_id": pair_data.destination_chat_id,
                "computed_telegram_id": test_telegram_id,
                "computed_discord_id": test_discord_id
            },
            "limits": limits,
            "user_info": {
                "id": current_user.id,
                "plan": current_user.plan,
                "username": current_user.username
            }
        }
    except Exception as e:
        logger.error(f"Debug validation error: {str(e)}")
        return {
            "valid": False,
            "errors": [f"Validation error: {str(e)}"],
            "warnings": warnings,
            "exception": str(e)
        }
