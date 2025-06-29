"""
Pydantic schemas for request/response validation and serialization.
Contains all data models for API endpoints and data transfer.
"""

from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums
class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    ELITE = "elite"

class AccountStatus(str, Enum):
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONNECTED = "disconnected"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PlatformType(str, Enum):
    TELEGRAM_TO_TELEGRAM = "telegram_to_telegram"
    TELEGRAM_TO_DISCORD = "telegram_to_discord"
    DISCORD_TO_TELEGRAM = "discord_to_telegram"
    DISCORD_TO_DISCORD = "discord_to_discord"

class ErrorSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

# Base schemas
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        use_enum_values = True

# User schemas
class UserBase(BaseSchema):
    email: EmailStr
    plan: PlanType = PlanType.FREE
    max_pairs: int = 2
    max_telegram_accounts: int = 1
    max_discord_accounts: int = 1
    is_active: bool = True

class UserCreate(UserBase):
    pass

class UserUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    plan: Optional[PlanType] = None
    plan_expiry: Optional[datetime] = None
    max_pairs: Optional[int] = None
    max_telegram_accounts: Optional[int] = None
    max_discord_accounts: Optional[int] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    plan_expiry: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class UserWithStats(User):
    telegram_accounts_count: int = 0
    discord_accounts_count: int = 0
    forwarding_pairs_count: int = 0
    active_pairs_count: int = 0

# Telegram Account schemas
class TelegramAccountBase(BaseSchema):
    phone_number: str

class TelegramAccountCreate(TelegramAccountBase):
    user_id: int

class TelegramAccountUpdate(BaseSchema):
    phone_number: Optional[str] = None
    status: Optional[AccountStatus] = None

class TelegramAccount(TelegramAccountBase):
    id: int
    user_id: int
    telegram_user_id: Optional[str] = None
    status: AccountStatus
    created_at: datetime
    updated_at: datetime
    last_seen: Optional[datetime] = None

class TelegramAccountWithInfo(TelegramAccount):
    account_info: Optional[Dict[str, Any]] = None

# Discord Account schemas
class DiscordAccountBase(BaseSchema):
    discord_servers: List[str] = []

class DiscordAccountCreate(DiscordAccountBase):
    user_id: int
    discord_token: str

class DiscordAccountUpdate(BaseSchema):
    discord_token: Optional[str] = None
    discord_servers: Optional[List[str]] = None
    status: Optional[AccountStatus] = None

class DiscordAccount(DiscordAccountBase):
    id: int
    user_id: int
    status: AccountStatus
    created_at: datetime
    updated_at: datetime
    last_seen: Optional[datetime] = None

class DiscordAccountWithInfo(DiscordAccount):
    account_info: Optional[Dict[str, Any]] = None

# Forwarding Pair schemas
class ForwardingPairBase(BaseSchema):
    source_channel: str
    destination_channel: str
    delay: int = 0
    silent_mode: bool = False
    platform_type: PlatformType
    copy_mode: bool = False
    filter_keywords: List[str] = []
    exclude_keywords: List[str] = []
    custom_prefix: Optional[str] = None
    custom_suffix: Optional[str] = None

class ForwardingPairCreate(ForwardingPairBase):
    user_id: int
    telegram_account_id: Optional[int] = None
    discord_account_id: Optional[int] = None

    @validator('telegram_account_id', 'discord_account_id')
    def validate_account_ids(cls, v, values):
        platform_type = values.get('platform_type')
        if platform_type:
            if 'telegram' in platform_type and not values.get('telegram_account_id'):
                raise ValueError('telegram_account_id is required for Telegram operations')
            if 'discord' in platform_type and not values.get('discord_account_id'):
                raise ValueError('discord_account_id is required for Discord operations')
        return v

class ForwardingPairUpdate(BaseSchema):
    source_channel: Optional[str] = None
    destination_channel: Optional[str] = None
    delay: Optional[int] = None
    silent_mode: Optional[bool] = None
    status: Optional[str] = None
    copy_mode: Optional[bool] = None
    filter_keywords: Optional[List[str]] = None
    exclude_keywords: Optional[List[str]] = None
    custom_prefix: Optional[str] = None
    custom_suffix: Optional[str] = None

class ForwardingPair(ForwardingPairBase):
    id: int
    user_id: int
    telegram_account_id: Optional[int] = None
    discord_account_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime

# Payment History schemas
class PaymentHistoryBase(BaseSchema):
    payment_type: str
    amount: float
    currency: str = "USD"
    plan_purchased: PlanType
    plan_duration: int

class PaymentHistoryCreate(PaymentHistoryBase):
    user_id: int
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None

class PaymentHistory(PaymentHistoryBase):
    id: int
    user_id: int
    payment_status: PaymentStatus
    payment_date: datetime
    transaction_id: Optional[str] = None
    created_at: datetime

# API Key schemas
class APIKeyBase(BaseSchema):
    name: str
    rate_limit: int = 1000
    allowed_ips: List[str] = []

class APIKeyCreate(APIKeyBase):
    user_id: int

class APIKeyUpdate(BaseSchema):
    name: Optional[str] = None
    rate_limit: Optional[int] = None
    is_active: Optional[bool] = None
    allowed_ips: Optional[List[str]] = None

class APIKey(APIKeyBase):
    id: int
    user_id: int
    api_key: str
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime] = None
    usage_count: int

# Error Log schemas
class ErrorLogBase(BaseSchema):
    error_type: str
    error_message: str
    severity: ErrorSeverity = ErrorSeverity.ERROR
    context_data: Optional[Dict[str, Any]] = None

class ErrorLogCreate(ErrorLogBase):
    user_id: Optional[int] = None
    telegram_account_id: Optional[int] = None
    discord_account_id: Optional[int] = None
    stack_trace: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

class ErrorLog(ErrorLogBase):
    id: int
    user_id: Optional[int] = None
    telegram_account_id: Optional[int] = None
    discord_account_id: Optional[int] = None
    timestamp: datetime
    resolved: bool

# Message Log schemas
class MessageLogBase(BaseSchema):
    source_message_id: str
    message_type: str
    message_size: Optional[int] = None
    has_media: bool = False
    media_type: Optional[str] = None

class MessageLogCreate(MessageLogBase):
    forwarding_pair_id: int
    destination_message_id: Optional[str] = None
    processing_time: Optional[float] = None
    status: str = "pending"
    error_message: Optional[str] = None

class MessageLog(MessageLogBase):
    id: int
    forwarding_pair_id: int
    destination_message_id: Optional[str] = None
    forwarded_at: datetime
    processing_time: Optional[float] = None
    status: str

# Queue Task schemas
class QueueTaskBase(BaseSchema):
    task_type: str
    priority: int = 1
    task_data: Optional[Dict[str, Any]] = None
    max_retries: int = 3

class QueueTaskCreate(QueueTaskBase):
    user_id: int
    task_id: str

class QueueTask(QueueTaskBase):
    id: int
    user_id: int
    task_id: str
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    retry_count: int

# Authentication schemas
class OTPRequest(BaseSchema):
    phone_number: str

class OTPVerification(BaseSchema):
    account_id: int
    otp_code: str
    phone_hash: str

class SessionInfo(BaseSchema):
    platform: str
    account_id: int
    status: str
    info: Dict[str, Any]

# Health check schemas
class HealthCheck(BaseSchema):
    status: str
    components: Dict[str, str]

class SystemStats(BaseSchema):
    telegram_sessions: int
    discord_sessions: int
    active_queues: int
    pending_tasks: int

# Feature gating schemas
class FeatureCheck(BaseSchema):
    feature: str
    allowed: bool
    reason: Optional[str] = None

class LimitCheck(BaseSchema):
    limit_type: str
    allowed: bool
    current: int
    limit: int
    remaining: int
    reason: Optional[str] = None

class UserLimitsSummary(BaseSchema):
    plan: str
    plan_active: bool
    limits: Dict[str, LimitCheck]
    features: List[str]
    rate_limits: Dict[str, int]

# Response schemas
class SuccessResponse(BaseSchema):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseSchema):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None

# Pagination schemas
class PaginationParams(BaseSchema):
    page: int = 1
    page_size: int = 50
    
    @validator('page')
    def validate_page(cls, v):
        if v < 1:
            raise ValueError('Page must be greater than 0')
        return v
    
    @validator('page_size')
    def validate_page_size(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Page size must be between 1 and 100')
        return v

class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
