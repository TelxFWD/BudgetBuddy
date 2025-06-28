"""
Analytics API endpoints for real-time statistics, reporting, and user activity tracking.
Provides comprehensive metrics for message forwarding, session health, and queue statistics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database.db import get_db
from database.models import User, ForwardingPair, MessageLog, QueueTask, ErrorLog, TelegramAccount, DiscordAccount
from api.auth import get_current_user
from utils.logger import logger

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Pydantic models
class UserStatsResponse(BaseModel):
    active_pairs: int
    total_messages_forwarded: int
    messages_today: int
    messages_this_week: int
    success_rate: float
    avg_delay: float

class SystemStatsResponse(BaseModel):
    total_users: int
    active_sessions: int
    total_forwarding_pairs: int
    messages_processed_today: int
    queue_health: dict
    error_rate: float

class ForwardingStats(BaseModel):
    pair_id: int
    source_platform: str
    destination_platform: str
    messages_count: int
    last_forwarded: Optional[datetime]
    success_rate: float

class MessageVolumeStats(BaseModel):
    date: str
    message_count: int
    success_count: int
    error_count: int

def get_date_range(days: int = 7) -> tuple:
    """Get date range for analytics queries."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    return start_date, end_date

@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive statistics for the current user."""
    # Active forwarding pairs
    active_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.is_active == True
    ).count()
    
    # Get user's forwarding pair IDs
    user_pair_ids = db.query(ForwardingPair.id).filter(
        ForwardingPair.user_id == current_user.id
    ).subquery()
    
    # Total messages forwarded
    total_messages = db.query(MessageLog).filter(
        MessageLog.forwarding_pair_id.in_(user_pair_ids)
    ).count()
    
    # Messages today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = db.query(MessageLog).filter(
        MessageLog.forwarding_pair_id.in_(user_pair_ids),
        MessageLog.forwarded_at >= today_start
    ).count()
    
    # Messages this week
    week_start = today_start - timedelta(days=7)
    messages_this_week = db.query(MessageLog).filter(
        MessageLog.forwarding_pair_id.in_(user_pair_ids),
        MessageLog.forwarded_at >= week_start
    ).count()
    
    # Success rate calculation
    successful_messages = db.query(MessageLog).filter(
        MessageLog.forwarding_pair_id.in_(user_pair_ids),
        MessageLog.success == True
    ).count()
    
    success_rate = (successful_messages / total_messages * 100) if total_messages > 0 else 100.0
    
    # Average delay calculation
    avg_delay_result = db.query(func.avg(ForwardingPair.delay_seconds)).filter(
        ForwardingPair.user_id == current_user.id,
        ForwardingPair.is_active == True
    ).scalar()
    
    avg_delay = float(avg_delay_result) if avg_delay_result else 0.0
    
    return UserStatsResponse(
        active_pairs=active_pairs,
        total_messages_forwarded=total_messages,
        messages_today=messages_today,
        messages_this_week=messages_this_week,
        success_rate=round(success_rate, 2),
        avg_delay=avg_delay
    )

@router.get("/system", response_model=SystemStatsResponse)
async def get_system_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system-wide statistics (admin access recommended)."""
    # Total users
    total_users = db.query(User).filter(User.status == "active").count()
    
    # Active sessions
    telegram_sessions = db.query(TelegramAccount).filter(
        TelegramAccount.status == "active"
    ).count()
    
    discord_sessions = db.query(DiscordAccount).filter(
        DiscordAccount.status == "active"
    ).count()
    
    active_sessions = telegram_sessions + discord_sessions
    
    # Total forwarding pairs
    total_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.is_active == True
    ).count()
    
    # Messages processed today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = db.query(MessageLog).filter(
        MessageLog.forwarded_at >= today_start
    ).count()
    
    # Queue health (simplified since Redis might not be available)
    queue_health = {
        "pending_tasks": db.query(QueueTask).filter(QueueTask.status == "pending").count(),
        "processing_tasks": db.query(QueueTask).filter(QueueTask.status == "processing").count(),
        "failed_tasks": db.query(QueueTask).filter(QueueTask.status == "failed").count(),
        "completed_tasks_today": db.query(QueueTask).filter(
            QueueTask.status == "completed",
            QueueTask.completed_at >= today_start
        ).count()
    }
    
    # Error rate calculation
    total_messages_today = db.query(MessageLog).filter(
        MessageLog.forwarded_at >= today_start
    ).count()
    
    failed_messages_today = db.query(MessageLog).filter(
        MessageLog.forwarded_at >= today_start,
        MessageLog.success == False
    ).count()
    
    error_rate = (failed_messages_today / total_messages_today * 100) if total_messages_today > 0 else 0.0
    
    return SystemStatsResponse(
        total_users=total_users,
        active_sessions=active_sessions,
        total_forwarding_pairs=total_pairs,
        messages_processed_today=messages_today,
        queue_health=queue_health,
        error_rate=round(error_rate, 2)
    )

@router.get("/pairs", response_model=List[ForwardingStats])
async def get_forwarding_pair_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(7, description="Number of days to analyze")
):
    """Get statistics for each forwarding pair."""
    start_date, end_date = get_date_range(days)
    
    # Get user's forwarding pairs with message counts
    pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == current_user.id
    ).all()
    
    pair_stats = []
    for pair in pairs:
        # Message count for this pair
        message_count = db.query(MessageLog).filter(
            MessageLog.forwarding_pair_id == pair.id,
            MessageLog.forwarded_at >= start_date
        ).count()
        
        # Success rate for this pair
        successful_count = db.query(MessageLog).filter(
            MessageLog.forwarding_pair_id == pair.id,
            MessageLog.forwarded_at >= start_date,
            MessageLog.success == True
        ).count()
        
        success_rate = (successful_count / message_count * 100) if message_count > 0 else 100.0
        
        pair_stats.append(ForwardingStats(
            pair_id=pair.id,
            source_platform=pair.source_platform,
            destination_platform=pair.destination_platform,
            messages_count=message_count,
            last_forwarded=pair.last_forwarded,
            success_rate=round(success_rate, 2)
        ))
    
    return pair_stats

@router.get("/volume", response_model=List[MessageVolumeStats])
async def get_message_volume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, description="Number of days to analyze")
):
    """Get daily message volume statistics."""
    start_date, end_date = get_date_range(days)
    
    # Get user's forwarding pair IDs
    user_pair_ids = db.query(ForwardingPair.id).filter(
        ForwardingPair.user_id == current_user.id
    ).subquery()
    
    # Query daily message volumes
    daily_stats = db.query(
        func.date(MessageLog.forwarded_at).label('date'),
        func.count(MessageLog.id).label('total_count'),
        func.sum(func.case([(MessageLog.success == True, 1)], else_=0)).label('success_count'),
        func.sum(func.case([(MessageLog.success == False, 1)], else_=0)).label('error_count')
    ).filter(
        MessageLog.forwarding_pair_id.in_(user_pair_ids),
        MessageLog.forwarded_at >= start_date
    ).group_by(
        func.date(MessageLog.forwarded_at)
    ).order_by(
        func.date(MessageLog.forwarded_at)
    ).all()
    
    volume_stats = []
    for stat in daily_stats:
        volume_stats.append(MessageVolumeStats(
            date=stat.date.strftime('%Y-%m-%d'),
            message_count=stat.total_count,
            success_count=stat.success_count or 0,
            error_count=stat.error_count or 0
        ))
    
    return volume_stats

@router.get("/errors")
async def get_error_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(7, description="Number of days to analyze")
):
    """Get error summary and common issues."""
    start_date, end_date = get_date_range(days)
    
    # Get error logs for the user
    error_logs = db.query(ErrorLog).filter(
        ErrorLog.user_id == current_user.id,
        ErrorLog.created_at >= start_date
    ).all()
    
    # Group errors by type
    error_summary = {}
    for error in error_logs:
        error_type = error.error_type
        if error_type not in error_summary:
            error_summary[error_type] = {
                "count": 0,
                "severity_breakdown": {"low": 0, "medium": 0, "high": 0},
                "latest_occurrence": None,
                "resolved_count": 0
            }
        
        error_summary[error_type]["count"] += 1
        error_summary[error_type]["severity_breakdown"][error.severity] += 1
        
        if error.resolved:
            error_summary[error_type]["resolved_count"] += 1
        
        if (error_summary[error_type]["latest_occurrence"] is None or 
            error.created_at > error_summary[error_type]["latest_occurrence"]):
            error_summary[error_type]["latest_occurrence"] = error.created_at
    
    return {
        "error_summary": error_summary,
        "total_errors": len(error_logs),
        "resolution_rate": sum(1 for e in error_logs if e.resolved) / len(error_logs) * 100 if error_logs else 100
    }

@router.get("/sessions")
async def get_session_health(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get health status of user's Telegram and Discord sessions."""
    # Telegram sessions
    telegram_accounts = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == current_user.id
    ).all()
    
    # Discord sessions
    discord_accounts = db.query(DiscordAccount).filter(
        DiscordAccount.user_id == current_user.id
    ).all()
    
    telegram_health = []
    for account in telegram_accounts:
        health_status = "healthy" if account.status == "active" else "unhealthy"
        if account.last_seen:
            time_since_last_seen = datetime.utcnow() - account.last_seen
            if time_since_last_seen > timedelta(minutes=30):
                health_status = "stale"
        
        telegram_health.append({
            "account_id": account.id,
            "phone_number": account.phone_number,
            "status": account.status,
            "health": health_status,
            "last_seen": account.last_seen
        })
    
    discord_health = []
    for account in discord_accounts:
        health_status = "healthy" if account.status == "active" else "unhealthy"
        if account.last_seen:
            time_since_last_seen = datetime.utcnow() - account.last_seen
            if time_since_last_seen > timedelta(minutes=30):
                health_status = "stale"
        
        discord_health.append({
            "account_id": account.id,
            "bot_name": account.bot_name,
            "status": account.status,
            "health": health_status,
            "last_seen": account.last_seen
        })
    
    return {
        "telegram_sessions": telegram_health,
        "discord_sessions": discord_health,
        "overall_health": {
            "total_sessions": len(telegram_accounts) + len(discord_accounts),
            "healthy_sessions": sum(1 for t in telegram_health if t["health"] == "healthy") + 
                              sum(1 for d in discord_health if d["health"] == "healthy"),
            "unhealthy_sessions": sum(1 for t in telegram_health if t["health"] == "unhealthy") + 
                                sum(1 for d in discord_health if d["health"] == "unhealthy")
        }
    }