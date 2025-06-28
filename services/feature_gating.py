"""
Feature gating service for subscription plan validation and enforcement.
Handles plan-based access control for all backend operations.
"""

import os
from enum import Enum
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TelegramAccount, DiscordAccount, ForwardingPair
from utils.logger import setup_logger

logger = setup_logger()

class PlanType(Enum):
    """Subscription plan types."""
    FREE = "free"
    PRO = "pro"
    ELITE = "elite"

class FeatureType(Enum):
    """Available features."""
    BASIC_FORWARDING = "basic_forwarding"
    COPY_MODE = "copy_mode"
    CHAIN_FORWARDING = "chain_forwarding"
    DISCORD_FORWARDING = "discord_forwarding"
    PRIORITY_QUEUE = "priority_queue"
    ADVANCED_SCHEDULING = "advanced_scheduling"
    BULK_OPERATIONS = "bulk_operations"
    API_ACCESS = "api_access"
    CUSTOM_DELAYS = "custom_delays"
    WEBHOOK_SUPPORT = "webhook_support"

class FeatureGating:
    """Centralized feature gating and plan validation service."""
    
    def __init__(self):
        self.plan_limits = self._load_plan_limits()
        self.plan_features = self._load_plan_features()
        self.rate_limits = self._load_rate_limits()
    
    def _load_plan_limits(self) -> Dict[PlanType, Dict[str, int]]:
        """Load plan limits from configuration."""
        return {
            PlanType.FREE: {
                "max_forwarding_pairs": 2,
                "max_telegram_accounts": 1,
                "max_discord_accounts": 1,
                "max_api_keys": 1,
                "max_daily_messages": 100,
                "max_queue_priority": 1
            },
            PlanType.PRO: {
                "max_forwarding_pairs": 10,
                "max_telegram_accounts": 3,
                "max_discord_accounts": 3,
                "max_api_keys": 5,
                "max_daily_messages": 5000,
                "max_queue_priority": 2
            },
            PlanType.ELITE: {
                "max_forwarding_pairs": -1,  # Unlimited
                "max_telegram_accounts": 10,
                "max_discord_accounts": 10,
                "max_api_keys": 20,
                "max_daily_messages": -1,  # Unlimited
                "max_queue_priority": 3
            }
        }
    
    def _load_plan_features(self) -> Dict[PlanType, List[FeatureType]]:
        """Load plan features from configuration."""
        return {
            PlanType.FREE: [
                FeatureType.BASIC_FORWARDING
            ],
            PlanType.PRO: [
                FeatureType.BASIC_FORWARDING,
                FeatureType.COPY_MODE,
                FeatureType.DISCORD_FORWARDING,
                FeatureType.CUSTOM_DELAYS,
                FeatureType.API_ACCESS
            ],
            PlanType.ELITE: [
                FeatureType.BASIC_FORWARDING,
                FeatureType.COPY_MODE,
                FeatureType.CHAIN_FORWARDING,
                FeatureType.DISCORD_FORWARDING,
                FeatureType.PRIORITY_QUEUE,
                FeatureType.ADVANCED_SCHEDULING,
                FeatureType.BULK_OPERATIONS,
                FeatureType.API_ACCESS,
                FeatureType.CUSTOM_DELAYS,
                FeatureType.WEBHOOK_SUPPORT
            ]
        }
    
    def _load_rate_limits(self) -> Dict[PlanType, Dict[str, int]]:
        """Load rate limits from configuration."""
        return {
            PlanType.FREE: {
                "requests_per_minute": int(os.getenv("RATE_LIMIT_FREE_PLAN", 10)),
                "messages_per_hour": 50,
                "api_calls_per_day": 100
            },
            PlanType.PRO: {
                "requests_per_minute": int(os.getenv("RATE_LIMIT_PRO_PLAN", 100)),
                "messages_per_hour": 1000,
                "api_calls_per_day": 10000
            },
            PlanType.ELITE: {
                "requests_per_minute": int(os.getenv("RATE_LIMIT_ELITE_PLAN", 1000)),
                "messages_per_hour": 10000,
                "api_calls_per_day": 100000
            }
        }
    
    def get_user_plan(self, user_id: int) -> Optional[PlanType]:
        """Get user's current subscription plan."""
        db: Session = next(get_db())
        
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            # Convert string plan to enum
            try:
                return PlanType(user.plan.lower())
            except ValueError:
                logger.warning(f"Invalid plan type for user {user_id}: {user.plan}")
                return PlanType.FREE  # Default to free plan
                
        finally:
            db.close()
    
    def validate_plan_active(self, user_id: int) -> bool:
        """Check if user's plan is active and not expired."""
        db: Session = next(get_db())
        
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # Check if plan is expired
            if user.plan_expiry and user.plan_expiry < db.execute("SELECT NOW()").scalar():
                logger.info(f"Plan expired for user {user_id}")
                return False
            
            return True
            
        finally:
            db.close()
    
    def check_feature_access(self, user_id: int, feature: FeatureType) -> bool:
        """Check if user has access to a specific feature."""
        plan = self.get_user_plan(user_id)
        if not plan:
            return False
        
        if not self.validate_plan_active(user_id):
            return False
        
        return feature in self.plan_features.get(plan, [])
    
    def check_limit(self, user_id: int, limit_type: str) -> Dict[str, Any]:
        """Check if user is within their plan limits."""
        plan = self.get_user_plan(user_id)
        if not plan:
            return {"allowed": False, "reason": "User not found"}
        
        if not self.validate_plan_active(user_id):
            return {"allowed": False, "reason": "Plan expired"}
        
        plan_limit = self.plan_limits[plan].get(limit_type, 0)
        
        # Unlimited access
        if plan_limit == -1:
            return {"allowed": True, "current": 0, "limit": -1}
        
        # Get current usage
        current_usage = self._get_current_usage(user_id, limit_type)
        
        return {
            "allowed": current_usage < plan_limit,
            "current": current_usage,
            "limit": plan_limit,
            "remaining": max(0, plan_limit - current_usage)
        }
    
    def _get_current_usage(self, user_id: int, limit_type: str) -> int:
        """Get current usage for a specific limit type."""
        db: Session = next(get_db())
        
        try:
            if limit_type == "max_forwarding_pairs":
                return db.query(ForwardingPair).filter(
                    ForwardingPair.user_id == user_id,
                    ForwardingPair.status == "active"
                ).count()
            
            elif limit_type == "max_telegram_accounts":
                return db.query(TelegramAccount).filter(
                    TelegramAccount.user_id == user_id,
                    TelegramAccount.status == "active"
                ).count()
            
            elif limit_type == "max_discord_accounts":
                return db.query(DiscordAccount).filter(
                    DiscordAccount.user_id == user_id,
                    DiscordAccount.status == "active"
                ).count()
            
            elif limit_type == "max_api_keys":
                # This will be implemented when API keys table is used
                return 0
            
            elif limit_type == "max_daily_messages":
                # This would require message tracking
                return 0
            
            else:
                return 0
                
        finally:
            db.close()
    
    def validate_forwarding_pair_creation(self, user_id: int) -> Dict[str, Any]:
        """Validate if user can create a new forwarding pair."""
        # Check feature access
        if not self.check_feature_access(user_id, FeatureType.BASIC_FORWARDING):
            return {"allowed": False, "reason": "Feature not available in your plan"}
        
        # Check limits
        limit_check = self.check_limit(user_id, "max_forwarding_pairs")
        if not limit_check["allowed"]:
            return {"allowed": False, "reason": "Maximum forwarding pairs limit reached"}
        
        return {"allowed": True}
    
    def validate_account_creation(self, user_id: int, platform: str) -> Dict[str, Any]:
        """Validate if user can create a new account for a platform."""
        limit_type = f"max_{platform}_accounts"
        
        # Check limits
        limit_check = self.check_limit(user_id, limit_type)
        if not limit_check["allowed"]:
            return {"allowed": False, "reason": f"Maximum {platform} accounts limit reached"}
        
        # Check Discord-specific feature access
        if platform == "discord":
            if not self.check_feature_access(user_id, FeatureType.DISCORD_FORWARDING):
                return {"allowed": False, "reason": "Discord forwarding not available in your plan"}
        
        return {"allowed": True}
    
    def validate_queue_priority(self, user_id: int, requested_priority: int) -> Dict[str, Any]:
        """Validate if user can use a specific queue priority."""
        plan = self.get_user_plan(user_id)
        if not plan:
            return {"allowed": False, "reason": "User not found"}
        
        max_priority = self.plan_limits[plan]["max_queue_priority"]
        
        if requested_priority > max_priority:
            return {
                "allowed": False, 
                "reason": f"Priority {requested_priority} not available in {plan.value} plan",
                "max_priority": max_priority
            }
        
        return {"allowed": True, "max_priority": max_priority}
    
    def get_rate_limit(self, user_id: int, limit_type: str) -> int:
        """Get rate limit for a user and limit type."""
        plan = self.get_user_plan(user_id)
        if not plan:
            return 0
        
        return self.rate_limits[plan].get(limit_type, 0)
    
    def validate_api_access(self, user_id: int) -> bool:
        """Check if user has API access."""
        return self.check_feature_access(user_id, FeatureType.API_ACCESS)
    
    def validate_copy_mode(self, user_id: int) -> bool:
        """Check if user can use copy mode."""
        return self.check_feature_access(user_id, FeatureType.COPY_MODE)
    
    def validate_chain_forwarding(self, user_id: int) -> bool:
        """Check if user can use chain forwarding."""
        return self.check_feature_access(user_id, FeatureType.CHAIN_FORWARDING)
    
    def validate_custom_delays(self, user_id: int) -> bool:
        """Check if user can use custom delays."""
        return self.check_feature_access(user_id, FeatureType.CUSTOM_DELAYS)
    
    def validate_bulk_operations(self, user_id: int) -> bool:
        """Check if user can perform bulk operations."""
        return self.check_feature_access(user_id, FeatureType.BULK_OPERATIONS)
    
    def get_user_limits_summary(self, user_id: int) -> Dict[str, Any]:
        """Get a summary of user's limits and current usage."""
        plan = self.get_user_plan(user_id)
        if not plan:
            return {"error": "User not found"}
        
        plan_active = self.validate_plan_active(user_id)
        
        limits = {}
        for limit_type in ["max_forwarding_pairs", "max_telegram_accounts", "max_discord_accounts", "max_api_keys"]:
            limit_check = self.check_limit(user_id, limit_type)
            limits[limit_type] = limit_check
        
        features = [feature.value for feature in self.plan_features[plan]]
        rate_limits = self.rate_limits[plan]
        
        return {
            "plan": plan.value,
            "plan_active": plan_active,
            "limits": limits,
            "features": features,
            "rate_limits": rate_limits
        }
    
    def enforce_plan_validation(self, user_id: int, operation: str, **kwargs) -> Dict[str, Any]:
        """Centralized plan validation for all backend operations."""
        # Check if plan is active
        if not self.validate_plan_active(user_id):
            return {"allowed": False, "reason": "Plan expired or inactive"}
        
        # Operation-specific validations
        if operation == "create_forwarding_pair":
            return self.validate_forwarding_pair_creation(user_id)
        
        elif operation == "create_telegram_account":
            return self.validate_account_creation(user_id, "telegram")
        
        elif operation == "create_discord_account":
            return self.validate_account_creation(user_id, "discord")
        
        elif operation == "set_queue_priority":
            priority = kwargs.get("priority", 1)
            return self.validate_queue_priority(user_id, priority)
        
        elif operation == "api_access":
            return {"allowed": self.validate_api_access(user_id)}
        
        elif operation == "copy_mode":
            return {"allowed": self.validate_copy_mode(user_id)}
        
        elif operation == "chain_forwarding":
            return {"allowed": self.validate_chain_forwarding(user_id)}
        
        elif operation == "custom_delays":
            return {"allowed": self.validate_custom_delays(user_id)}
        
        elif operation == "bulk_operations":
            return {"allowed": self.validate_bulk_operations(user_id)}
        
        else:
            logger.warning(f"Unknown operation for plan validation: {operation}")
            return {"allowed": False, "reason": "Unknown operation"}
