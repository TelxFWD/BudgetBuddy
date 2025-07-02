"""
Plan-based feature restriction utilities for AutoForwardX.
Defines limits and restrictions for Free, Pro, and Elite plans.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum

class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    ELITE = "elite"

class PlatformType(str, Enum):
    TELEGRAM_TO_TELEGRAM = "telegram_to_telegram"
    TELEGRAM_TO_DISCORD = "telegram_to_discord"
    DISCORD_TO_TELEGRAM = "discord_to_telegram"
    DISCORD_TO_DISCORD = "discord_to_discord"

# Plan limits configuration
PLAN_LIMITS = {
    PlanType.FREE: {
        "max_forwarding_pairs": 1,
        "max_telegram_accounts": 1,
        "max_discord_accounts": 0,
        "max_api_keys": 0,
        "allowed_platforms": [PlatformType.TELEGRAM_TO_TELEGRAM],
        "features": {
            "copy_mode": False,
            "scheduled_forwarding": False,
            "text_filtering": False,
            "image_blocking": False,
            "text_replacement": False,
            "export_csv": False,
            "export_pdf": False,
            "api_access": False,
            "priority_support": False,
            "webhooks": False
        },
        "rate_limits": {
            "api_requests_per_hour": 100,
            "messages_per_day": 500
        }
    },
    PlanType.PRO: {
        "max_forwarding_pairs": 15,
        "max_telegram_accounts": 2,
        "max_discord_accounts": 1,
        "max_api_keys": 0,
        "allowed_platforms": [
            PlatformType.TELEGRAM_TO_TELEGRAM,
            PlatformType.TELEGRAM_TO_DISCORD,
            PlatformType.DISCORD_TO_TELEGRAM
        ],
        "features": {
            "copy_mode": False,
            "scheduled_forwarding": False,
            "text_filtering": True,
            "image_blocking": True,
            "text_replacement": True,
            "export_csv": True,
            "export_pdf": False,
            "api_access": False,
            "priority_support": True,
            "webhooks": False
        },
        "rate_limits": {
            "api_requests_per_hour": 1000,
            "messages_per_day": 5000
        }
    },
    PlanType.ELITE: {
        "max_forwarding_pairs": 999,  # Unlimited (represented as high number)
        "max_telegram_accounts": 3,
        "max_discord_accounts": 3,
        "max_api_keys": 10,
        "allowed_platforms": [
            PlatformType.TELEGRAM_TO_TELEGRAM,
            PlatformType.TELEGRAM_TO_DISCORD,
            PlatformType.DISCORD_TO_TELEGRAM,
            PlatformType.DISCORD_TO_DISCORD
        ],
        "features": {
            "copy_mode": True,
            "scheduled_forwarding": True,
            "text_filtering": True,
            "image_blocking": True,
            "text_replacement": True,
            "export_csv": True,
            "export_pdf": True,
            "api_access": True,
            "priority_support": True,
            "webhooks": True
        },
        "rate_limits": {
            "api_requests_per_hour": 10000,
            "messages_per_day": 50000
        }
    }
}

class PlanValidator:
    """Utility class for validating plan-based restrictions."""
    
    @staticmethod
    def get_plan_limits(plan: str) -> Dict[str, Any]:
        """Get plan limits for a given plan type."""
        plan_type = PlanType(plan.lower())
        return PLAN_LIMITS.get(plan_type, PLAN_LIMITS[PlanType.FREE])
    
    @staticmethod
    def can_add_forwarding_pair(plan: str, current_pairs: int, platform_type: str) -> Tuple[bool, str]:
        """Check if user can add a new forwarding pair."""
        limits = PlanValidator.get_plan_limits(plan)
        
        # Check max pairs limit
        if current_pairs >= limits["max_forwarding_pairs"]:
            if plan.lower() == "free":
                return False, "Free plan is limited to 1 forwarding pair. Upgrade to Pro for 15 pairs or Elite for unlimited pairs."
            elif plan.lower() == "pro":
                return False, "Pro plan is limited to 15 forwarding pairs. Upgrade to Elite for unlimited pairs."
            else:
                return False, "Maximum forwarding pairs limit reached."
        
        # Check platform type restrictions
        allowed_platforms = limits["allowed_platforms"]
        if platform_type not in [p.value for p in allowed_platforms]:
            if plan.lower() == "free":
                return False, "Free plan only supports Telegram → Telegram forwarding. Upgrade to Pro for cross-platform forwarding."
            else:
                return False, f"Platform type {platform_type} is not allowed for {plan} plan."
        
        return True, "Can add forwarding pair"
    
    @staticmethod
    def can_add_account(plan: str, platform: str, current_count: int) -> Tuple[bool, str]:
        """Check if user can add a new account (Telegram or Discord)."""
        limits = PlanValidator.get_plan_limits(plan)
        
        if platform.lower() == "telegram":
            max_accounts = limits["max_telegram_accounts"]
            if current_count >= max_accounts:
                if plan.lower() == "free":
                    return False, "Free plan is limited to 1 Telegram account. Upgrade to Pro for 2 accounts or Elite for 3 accounts."
                elif plan.lower() == "pro":
                    return False, "Pro plan is limited to 2 Telegram accounts. Upgrade to Elite for 3 accounts."
                else:
                    return False, "Maximum Telegram accounts limit reached."
        
        elif platform.lower() == "discord":
            max_accounts = limits["max_discord_accounts"]
            if current_count >= max_accounts:
                if plan.lower() == "free":
                    return False, "Free plan does not support Discord. Upgrade to Pro for Discord support."
                elif plan.lower() == "pro":
                    return False, "Pro plan is limited to 1 Discord account. Upgrade to Elite for 3 accounts."
                else:
                    return False, "Maximum Discord accounts limit reached."
        
        return True, "Can add account"
    
    @staticmethod
    def can_use_feature(plan: str, feature: str) -> Tuple[bool, str]:
        """Check if user can use a specific feature."""
        limits = PlanValidator.get_plan_limits(plan)
        features = limits["features"]
        
        if feature not in features:
            return False, f"Unknown feature: {feature}"
        
        if not features[feature]:
            feature_plan_requirements = {
                "copy_mode": "Elite",
                "scheduled_forwarding": "Elite",
                "text_filtering": "Pro or Elite",
                "image_blocking": "Pro or Elite",
                "text_replacement": "Pro or Elite",
                "export_csv": "Pro or Elite",
                "export_pdf": "Elite",
                "api_access": "Elite",
                "webhooks": "Elite"
            }
            
            required_plan = feature_plan_requirements.get(feature, "higher")
            return False, f"This feature requires {required_plan} plan. Please upgrade to access this feature."
        
        return True, "Feature available"
    
    @staticmethod
    def can_create_api_key(plan: str, current_keys: int) -> Tuple[bool, str]:
        """Check if user can create a new API key."""
        limits = PlanValidator.get_plan_limits(plan)
        max_keys = limits["max_api_keys"]
        
        if current_keys >= max_keys:
            if plan.lower() in ["free", "pro"]:
                return False, "API access is only available for Elite plan users. Upgrade to Elite to access API features."
            else:
                return False, f"Maximum API keys limit ({max_keys}) reached."
        
        return True, "Can create API key"
    
    @staticmethod
    def get_rate_limits(plan: str) -> Dict[str, int]:
        """Get rate limits for a plan."""
        limits = PlanValidator.get_plan_limits(plan)
        return limits["rate_limits"]
    
    @staticmethod
    def get_plan_summary(plan: str) -> Dict[str, Any]:
        """Get complete plan summary for frontend display."""
        limits = PlanValidator.get_plan_limits(plan)
        
        return {
            "plan": plan.title(),
            "limits": {
                "forwarding_pairs": limits["max_forwarding_pairs"] if limits["max_forwarding_pairs"] < 999 else "Unlimited",
                "telegram_accounts": limits["max_telegram_accounts"],
                "discord_accounts": limits["max_discord_accounts"],
                "api_keys": limits["max_api_keys"] if limits["max_api_keys"] > 0 else "Not Available"
            },
            "features": limits["features"],
            "allowed_platforms": [p.value for p in limits["allowed_platforms"]],
            "rate_limits": limits["rate_limits"]
        }

def check_plan_expired(plan_expires_at: Optional[datetime]) -> bool:
    """Check if user's plan has expired."""
    if plan_expires_at is None:
        return False  # No expiration for free plan
    
    return datetime.utcnow() > plan_expires_at

def get_upgrade_message(current_plan: str, feature: str) -> str:
    """Get appropriate upgrade message for a blocked feature."""
    feature_messages = {
        "copy_mode": "Copy Mode is an Elite-only feature that allows you to copy messages instead of forwarding them.",
        "scheduled_forwarding": "Scheduled Forwarding is available only for Elite users to automate message forwarding.",
        "cross_platform": "Cross-platform forwarding (Telegram ↔ Discord) requires Pro or Elite plan.",
        "export_pdf": "PDF export is an Elite-only feature for comprehensive analytics reports.",
        "api_access": "API access is exclusively available for Elite plan subscribers.",
        "additional_pairs": "You've reached your plan's forwarding pair limit.",
        "additional_accounts": "You've reached your plan's account limit."
    }
    
    base_message = feature_messages.get(feature, "This feature requires a higher plan.")
    
    if current_plan.lower() == "free":
        return f"{base_message} Upgrade to Pro or Elite to unlock this feature."
    elif current_plan.lower() == "pro":
        return f"{base_message} Upgrade to Elite to unlock this feature."
    else:
        return base_message