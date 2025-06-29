"""
SQLAlchemy database models for the message forwarding application.
Contains all database table definitions and relationships.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Float, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class User(Base):
    """Users table for storing user account information."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    plan = Column(String(50), default="free", nullable=False)  # free, pro, elite
    status = Column(String(20), default="active", nullable=False)  # active, suspended, banned
    last_login = Column(DateTime, nullable=True)
    plan_expires_at = Column(DateTime, nullable=True)
    max_pairs = Column(Integer, default=2, nullable=False)
    max_telegram_accounts = Column(Integer, default=1, nullable=False)
    max_discord_accounts = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    telegram_accounts = relationship("TelegramAccount", back_populates="user", cascade="all, delete-orphan")
    discord_accounts = relationship("DiscordAccount", back_populates="user", cascade="all, delete-orphan")
    forwarding_pairs = relationship("ForwardingPair", back_populates="user", cascade="all, delete-orphan")
    payment_history = relationship("PaymentHistory", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    error_logs = relationship("ErrorLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, plan={self.plan})>"

class TelegramAccount(Base):
    """Telegram accounts table for managing user's Telegram sessions."""
    __tablename__ = "telegram_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    telegram_user_id = Column(String(50), nullable=True, index=True)
    phone_number = Column(String(20), nullable=False)
    session_data = Column(Text, nullable=True)  # Encrypted session string
    status = Column(String(50), default="pending_verification", nullable=False)  # pending_verification, active, inactive, disconnected
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_seen = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="telegram_accounts")
    forwarding_pairs_source = relationship("ForwardingPair", foreign_keys="ForwardingPair.telegram_account_id", back_populates="telegram_account")
    error_logs = relationship("ErrorLog", back_populates="telegram_account", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<TelegramAccount(id={self.id}, user_id={self.user_id}, phone={self.phone_number}, status={self.status})>"

class DiscordAccount(Base):
    """Discord accounts table for managing user's Discord bot sessions."""
    __tablename__ = "discord_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    discord_user_id = Column(Integer, nullable=False)
    bot_token = Column(String(100), unique=True, nullable=False)
    bot_name = Column(String(100), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_seen = Column(DateTime, nullable=True)
    discord_servers = Column(JSON, default=list, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="discord_accounts")
    forwarding_pairs_source = relationship("ForwardingPair", foreign_keys="ForwardingPair.discord_account_id", back_populates="discord_account")
    error_logs = relationship("ErrorLog", back_populates="discord_account", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DiscordAccount(id={self.id}, user_id={self.user_id}, status={self.status})>"

class ForwardingPair(Base):
    """Forwarding pairs table for managing message forwarding configurations."""
    __tablename__ = "forwarding_pairs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    telegram_account_id = Column(Integer, ForeignKey("telegram_accounts.id"), nullable=True)
    discord_account_id = Column(Integer, ForeignKey("discord_accounts.id"), nullable=True)
    source_channel = Column(String(200), nullable=False)  # Source channel/chat ID
    destination_channel = Column(String(200), nullable=False)  # Destination channel/chat ID
    delay = Column(Integer, default=0, nullable=False)  # Delay in seconds
    silent_mode = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, inactive, paused
    platform_type = Column(String(50), nullable=False)  # telegram_to_telegram, telegram_to_discord, discord_to_telegram, discord_to_discord
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Advanced settings
    copy_mode = Column(Boolean, default=False, nullable=False)  # Copy vs Forward
    filter_keywords = Column(JSON, default=list, nullable=False)  # Keywords to filter
    exclude_keywords = Column(JSON, default=list, nullable=False)  # Keywords to exclude
    custom_prefix = Column(String(100), nullable=True)  # Custom message prefix
    custom_suffix = Column(String(100), nullable=True)  # Custom message suffix
    
    # Relationships
    user = relationship("User", back_populates="forwarding_pairs")
    telegram_account = relationship("TelegramAccount", foreign_keys=[telegram_account_id], back_populates="forwarding_pairs_source")
    discord_account = relationship("DiscordAccount", foreign_keys=[discord_account_id], back_populates="forwarding_pairs_source")
    
    def __repr__(self):
        return f"<ForwardingPair(id={self.id}, user_id={self.user_id}, {self.source_channel} -> {self.destination_channel})>"

class PaymentHistory(Base):
    """Payment history table for tracking user payments and subscription changes."""
    __tablename__ = "payment_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_type = Column(String(50), nullable=False)  # paypal, crypto, stripe
    payment_status = Column(String(50), nullable=False)  # pending, completed, failed, refunded
    payment_date = Column(DateTime, default=func.now(), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    transaction_id = Column(String(200), nullable=True)
    plan_purchased = Column(String(50), nullable=False)  # pro, elite
    plan_duration = Column(Integer, nullable=False)  # Duration in days
    gateway_response = Column(JSON, nullable=True)  # Payment gateway response
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="payment_history")
    
    def __repr__(self):
        return f"<PaymentHistory(id={self.id}, user_id={self.user_id}, amount={self.amount}, status={self.payment_status})>"

class APIKey(Base):
    """API keys table for managing user API access."""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    api_key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)  # User-defined name for the key
    rate_limit = Column(Integer, default=1000, nullable=False)  # Requests per hour
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_used = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    
    # IP restrictions
    allowed_ips = Column(JSON, default=list, nullable=False)  # List of allowed IP addresses
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, user_id={self.user_id}, name={self.name}, active={self.is_active})>"

class ErrorLog(Base):
    """Error logs table for tracking system and user errors."""
    __tablename__ = "error_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    telegram_account_id = Column(Integer, ForeignKey("telegram_accounts.id"), nullable=True)
    discord_account_id = Column(Integer, ForeignKey("discord_accounts.id"), nullable=True)
    error_type = Column(String(100), nullable=False)  # session_error, forwarding_error, api_error, etc.
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    severity = Column(String(20), default="error", nullable=False)  # info, warning, error, critical
    resolved = Column(Boolean, default=False, nullable=False)
    
    # Additional context
    context_data = Column(JSON, nullable=True)  # Additional error context
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="error_logs")
    telegram_account = relationship("TelegramAccount", back_populates="error_logs")
    discord_account = relationship("DiscordAccount", back_populates="error_logs")
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, type={self.error_type}, severity={self.severity}, timestamp={self.timestamp})>"

class MessageLog(Base):
    """Message logs table for tracking forwarded messages (optional for analytics)."""
    __tablename__ = "message_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    forwarding_pair_id = Column(Integer, ForeignKey("forwarding_pairs.id"), nullable=False)
    source_message_id = Column(String(100), nullable=False)
    destination_message_id = Column(String(100), nullable=True)
    message_type = Column(String(50), nullable=False)  # text, photo, video, document, etc.
    forwarded_at = Column(DateTime, default=func.now(), nullable=False)
    processing_time = Column(Float, nullable=True)  # Time taken to process in seconds
    status = Column(String(50), nullable=False)  # success, failed, pending
    error_message = Column(Text, nullable=True)
    
    # Message metadata
    message_size = Column(Integer, nullable=True)  # Message size in bytes
    has_media = Column(Boolean, default=False, nullable=False)
    media_type = Column(String(50), nullable=True)
    
    # Relationships
    forwarding_pair = relationship("ForwardingPair")
    
    def __repr__(self):
        return f"<MessageLog(id={self.id}, pair_id={self.forwarding_pair_id}, status={self.status})>"

class QueueTask(Base):
    """Queue tasks table for tracking Celery task status."""
    __tablename__ = "queue_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_type = Column(String(100), nullable=False)  # forward_message, send_message, etc.
    status = Column(String(50), nullable=False)  # pending, processing, completed, failed
    priority = Column(Integer, default=1, nullable=False)  # 1=low, 2=medium, 3=high
    created_at = Column(DateTime, default=func.now(), nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Task data
    task_data = Column(JSON, nullable=True)  # Task parameters
    result_data = Column(JSON, nullable=True)  # Task results
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<QueueTask(id={self.id}, task_id={self.task_id}, type={self.task_type}, status={self.status})>"

class Payment(Base):
    """Payments table for tracking user subscriptions and transactions."""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    external_payment_id = Column(String(255), unique=True, index=True, nullable=True)
    provider_transaction_id = Column(String(255), nullable=True)
    
    # Payment details
    plan = Column(String(50), nullable=False)  # pro, elite
    billing_cycle = Column(String(20), nullable=False)  # monthly, yearly
    payment_method = Column(String(50), nullable=False)  # paypal, crypto
    amount = Column(DECIMAL(10, 2), nullable=False)
    original_amount = Column(DECIMAL(10, 2), nullable=True)  # Before coupon discount
    currency = Column(String(10), default="usd", nullable=False)
    
    # Status and timestamps
    status = Column(String(50), nullable=False)  # pending, completed, failed, refunded
    created_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Crypto payment details
    crypto_address = Column(String(255), nullable=True)
    crypto_amount = Column(DECIMAL(20, 8), nullable=True)
    crypto_currency = Column(String(10), nullable=True)
    
    # Coupon information
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    
    # Relationships
    user = relationship("User")
    coupon = relationship("Coupon")
    
    def __repr__(self):
        return f"<Payment(id={self.id}, user_id={self.user_id}, plan={self.plan}, status={self.status})>"

class Coupon(Base):
    """Coupons table for promotional discounts."""
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Discount details
    discount_percent = Column(DECIMAL(5, 2), nullable=True)  # Percentage discount
    discount_amount = Column(DECIMAL(10, 2), nullable=True)  # Fixed amount discount
    
    # Validity and usage
    valid_until = Column(DateTime, nullable=False)
    usage_limit = Column(Integer, default=1, nullable=False)
    usage_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Restrictions
    plan_restriction = Column(String(50), nullable=True)  # Restrict to specific plan
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Coupon(id={self.id}, code={self.code}, discount={self.discount_percent or self.discount_amount})>"
