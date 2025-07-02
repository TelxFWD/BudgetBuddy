"""
Plan Validation API endpoints for checking feature restrictions and limits.
Provides frontend with plan-based access control information.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, List, Any

from database.db import get_db
from database.models import User, ForwardingPair, TelegramAccount, DiscordAccount
from api.auth import get_current_user
from utils.plan_rules import PlanValidator, check_plan_expired

router = APIRouter(prefix="/plan", tags=["plan"])

class PlanLimitsResponse(BaseModel):
    plan: str
    limits: Dict[str, Any]
    usage: Dict[str, Any]
    features: Dict[str, bool]
    can_upgrade: bool
    upgrade_message: str

class FeatureCheckRequest(BaseModel):
    feature: str
    platform_type: str = None

@router.get("/limits", response_model=PlanLimitsResponse)
async def get_plan_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's plan limits, usage, and available features."""
    
    # Get current plan (handle SQLAlchemy column)
    user_plan = str(current_user.plan) if hasattr(current_user.plan, '__str__') else current_user.plan
    
    # Check if plan expired
    plan_expires_at = getattr(current_user, 'plan_expires_at', None)
    if check_plan_expired(plan_expires_at):
        user_plan = "free"
        current_user.plan = "free"
        db.commit()
    
    # Get plan summary
    plan_summary = PlanValidator.get_plan_summary(user_plan)
    
    # Count current usage
    forwarding_pairs_count = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.is_active == True
    ).count()
    
    telegram_accounts_count = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == current_user.id,
        TelegramAccount.status == "active"
    ).count()
    
    discord_accounts_count = db.query(DiscordAccount).filter(
        DiscordAccount.user_id == current_user.id,
        DiscordAccount.status == "active"
    ).count()
    
    # Calculate what user can do
    can_add_pair = forwarding_pairs_count < plan_summary["limits"]["forwarding_pairs"] if isinstance(plan_summary["limits"]["forwarding_pairs"], int) else True
    can_add_telegram = telegram_accounts_count < plan_summary["limits"]["telegram_accounts"]
    can_add_discord = discord_accounts_count < plan_summary["limits"]["discord_accounts"]
    
    upgrade_message = ""
    if user_plan == "free":
        upgrade_message = "Upgrade to Pro for cross-platform forwarding and more pairs, or Elite for unlimited features."
    elif user_plan == "pro":
        upgrade_message = "Upgrade to Elite for unlimited pairs, copy mode, and premium features."
    
    return PlanLimitsResponse(
        plan=user_plan,
        limits=plan_summary["limits"],
        usage={
            "forwarding_pairs": forwarding_pairs_count,
            "telegram_accounts": telegram_accounts_count,
            "discord_accounts": discord_accounts_count
        },
        features=plan_summary["features"],
        can_upgrade=(user_plan != "elite"),
        upgrade_message=upgrade_message
    )

@router.post("/check-feature")
async def check_feature_access(
    request: FeatureCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can access a specific feature."""
    
    user_plan = str(current_user.plan) if hasattr(current_user.plan, '__str__') else current_user.plan
    
    # Check if plan expired
    plan_expires_at = getattr(current_user, 'plan_expires_at', None)
    if check_plan_expired(plan_expires_at):
        user_plan = "free"
    
    can_use, message = PlanValidator.can_use_feature(user_plan, request.feature)
    
    return {
        "can_use": can_use,
        "message": message,
        "user_plan": user_plan
    }

@router.post("/check-pair-creation")
async def check_pair_creation(
    platform_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can create a forwarding pair of the specified type."""
    
    user_plan = str(current_user.plan) if hasattr(current_user.plan, '__str__') else current_user.plan
    
    # Count current pairs
    current_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.is_active == True
    ).count()
    
    can_add, message = PlanValidator.can_add_forwarding_pair(user_plan, current_pairs, platform_type)
    
    return {
        "can_create": can_add,
        "message": message,
        "current_pairs": current_pairs,
        "user_plan": user_plan
    }

@router.post("/check-account-creation")
async def check_account_creation(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can add a new account for the specified platform."""
    
    user_plan = str(current_user.plan) if hasattr(current_user.plan, '__str__') else current_user.plan
    
    # Count current accounts
    if platform.lower() == "telegram":
        current_count = db.query(TelegramAccount).filter(
            TelegramAccount.user_id == current_user.id,
            TelegramAccount.status == "active"
        ).count()
    elif platform.lower() == "discord":
        current_count = db.query(DiscordAccount).filter(
            DiscordAccount.user_id == current_user.id,
            DiscordAccount.status == "active"
        ).count()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform must be 'telegram' or 'discord'"
        )
    
    can_add, message = PlanValidator.can_add_account(user_plan, platform, current_count)
    
    return {
        "can_create": can_add,
        "message": message,
        "current_count": current_count,
        "user_plan": user_plan
    }