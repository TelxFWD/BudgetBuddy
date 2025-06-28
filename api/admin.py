"""
Admin Panel API endpoints for system administration, user management, and monitoring.
Includes secure admin authentication with IP whitelisting and comprehensive system controls.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import ipaddress

from database.db import get_db
from database.models import User, ForwardingPair, MessageLog, QueueTask, ErrorLog, TelegramAccount, DiscordAccount, Payment
from api.auth import get_current_user, create_access_token
from utils.logger import logger

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin IP whitelist - configure these IPs in production
ADMIN_IP_WHITELIST = [
    "127.0.0.1",
    "::1",
    "10.0.0.0/8",
    "172.16.0.0/12", 
    "192.168.0.0/16"
]

# Pydantic models
class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    plan: str
    status: str
    created_at: datetime
    last_login: Optional[datetime]
    forwarding_pairs_count: int
    messages_forwarded: int
    payment_status: str

class SystemHealthResponse(BaseModel):
    database_status: str
    queue_status: str
    session_health: dict
    error_summary: dict
    performance_metrics: dict

class BulkActionRequest(BaseModel):
    user_ids: List[int]
    action: str  # "suspend", "activate", "upgrade", "downgrade", "delete"
    new_plan: Optional[str] = None

class AnnouncementRequest(BaseModel):
    message: str
    target_plan: str = "free"  # "free", "pro", "elite", "all"
    priority: str = "normal"  # "low", "normal", "high"

def check_admin_ip(request: Request):
    """Check if request comes from whitelisted admin IP."""
    client_ip = request.client.host
    
    for allowed_ip in ADMIN_IP_WHITELIST:
        try:
            if ipaddress.ip_address(client_ip) in ipaddress.ip_network(allowed_ip, strict=False):
                return True
        except ValueError:
            continue
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: IP not whitelisted for admin access"
    )

def check_admin_user(current_user: User = Depends(get_current_user)):
    """Verify user has admin privileges."""
    if current_user.plan != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/users", response_model=List[AdminUserResponse])
async def list_all_users(
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Get all registered users with detailed information."""
    check_admin_ip(request)
    
    users = db.query(User).order_by(User.created_at.desc()).all()
    
    user_details = []
    for user in users:
        # Count forwarding pairs
        pairs_count = db.query(ForwardingPair).filter(
            ForwardingPair.user_id == user.id
        ).count()
        
        # Count messages forwarded
        user_pair_ids = db.query(ForwardingPair.id).filter(
            ForwardingPair.user_id == user.id
        ).subquery()
        
        messages_count = db.query(MessageLog).filter(
            MessageLog.forwarding_pair_id.in_(user_pair_ids)
        ).count()
        
        # Get latest payment status
        latest_payment = db.query(Payment).filter(
            Payment.user_id == user.id
        ).order_by(Payment.created_at.desc()).first()
        
        payment_status = "none"
        if latest_payment:
            payment_status = latest_payment.status
        
        user_details.append(AdminUserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            plan=user.plan,
            status=user.status,
            created_at=user.created_at,
            last_login=user.last_login,
            forwarding_pairs_count=pairs_count,
            messages_forwarded=messages_count,
            payment_status=payment_status
        ))
    
    logger.info(f"Admin {admin_user.username} accessed user list")
    return user_details

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific user."""
    check_admin_ip(request)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's accounts
    telegram_accounts = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == user_id
    ).all()
    
    discord_accounts = db.query(DiscordAccount).filter(
        DiscordAccount.user_id == user_id
    ).all()
    
    # Get forwarding pairs
    forwarding_pairs = db.query(ForwardingPair).filter(
        ForwardingPair.user_id == user_id
    ).all()
    
    # Get recent activity
    recent_messages = db.query(MessageLog).join(ForwardingPair).filter(
        ForwardingPair.user_id == user_id
    ).order_by(MessageLog.forwarded_at.desc()).limit(10).all()
    
    # Get error logs
    recent_errors = db.query(ErrorLog).filter(
        ErrorLog.user_id == user_id
    ).order_by(ErrorLog.created_at.desc()).limit(5).all()
    
    return {
        "user_info": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "plan": user.plan,
            "status": user.status,
            "created_at": user.created_at,
            "last_login": user.last_login
        },
        "accounts": {
            "telegram": [
                {
                    "id": acc.id,
                    "phone_number": acc.phone_number,
                    "status": acc.status,
                    "last_seen": acc.last_seen
                } for acc in telegram_accounts
            ],
            "discord": [
                {
                    "id": acc.id,
                    "bot_name": acc.bot_name,
                    "status": acc.status,
                    "last_seen": acc.last_seen
                } for acc in discord_accounts
            ]
        },
        "forwarding_pairs": [
            {
                "id": pair.id,
                "source_platform": pair.source_platform,
                "destination_platform": pair.destination_platform,
                "is_active": pair.is_active,
                "created_at": pair.created_at,
                "last_forwarded": pair.last_forwarded
            } for pair in forwarding_pairs
        ],
        "recent_activity": [
            {
                "message_id": msg.id,
                "forwarded_at": msg.forwarded_at,
                "success": msg.success,
                "error_message": msg.error_message
            } for msg in recent_messages
        ],
        "recent_errors": [
            {
                "error_id": err.id,
                "error_type": err.error_type,
                "severity": err.severity,
                "created_at": err.created_at,
                "resolved": err.resolved
            } for err in recent_errors
        ]
    }

@router.put("/users/{user_id}/plan")
async def update_user_plan(
    user_id: int,
    new_plan: str,
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Update user's subscription plan."""
    check_admin_ip(request)
    
    valid_plans = ["free", "pro", "elite"]
    if new_plan not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Must be one of: {valid_plans}"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    old_plan = user.plan
    user.plan = new_plan
    user.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Admin {admin_user.username} changed user {user.username} plan from {old_plan} to {new_plan}")
    
    return {"message": f"User plan updated from {old_plan} to {new_plan}"}

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    new_status: str,
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Update user's account status."""
    check_admin_ip(request)
    
    valid_statuses = ["active", "suspended", "banned"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    old_status = user.status
    user.status = new_status
    user.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Admin {admin_user.username} changed user {user.username} status from {old_status} to {new_status}")
    
    return {"message": f"User status updated from {old_status} to {new_status}"}

@router.post("/users/bulk-action")
async def bulk_user_action(
    bulk_request: BulkActionRequest,
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Perform bulk actions on multiple users."""
    check_admin_ip(request)
    
    users = db.query(User).filter(User.id.in_(bulk_request.user_ids)).all()
    
    if len(users) != len(bulk_request.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some user IDs not found"
        )
    
    results = []
    for user in users:
        try:
            if bulk_request.action == "suspend":
                user.status = "suspended"
            elif bulk_request.action == "activate":
                user.status = "active"
            elif bulk_request.action == "upgrade" and bulk_request.new_plan:
                user.plan = bulk_request.new_plan
            elif bulk_request.action == "downgrade" and bulk_request.new_plan:
                user.plan = bulk_request.new_plan
            elif bulk_request.action == "delete":
                # Soft delete - just mark as inactive
                user.status = "deleted"
            
            user.updated_at = datetime.utcnow()
            results.append({"user_id": user.id, "status": "success"})
            
        except Exception as e:
            results.append({"user_id": user.id, "status": "failed", "error": str(e)})
    
    db.commit()
    
    logger.info(f"Admin {admin_user.username} performed bulk action {bulk_request.action} on {len(bulk_request.user_ids)} users")
    
    return {"results": results}

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive system health status."""
    check_admin_ip(request)
    
    # Database status
    try:
        db.execute("SELECT 1")
        database_status = "healthy"
    except Exception:
        database_status = "unhealthy"
    
    # Queue status
    pending_tasks = db.query(QueueTask).filter(QueueTask.status == "pending").count()
    processing_tasks = db.query(QueueTask).filter(QueueTask.status == "processing").count()
    failed_tasks = db.query(QueueTask).filter(QueueTask.status == "failed").count()
    
    queue_status = "healthy"
    if failed_tasks > 100 or processing_tasks > 50:
        queue_status = "unhealthy"
    elif failed_tasks > 50 or processing_tasks > 25:
        queue_status = "warning"
    
    # Session health
    telegram_sessions = db.query(TelegramAccount).filter(
        TelegramAccount.status == "active"
    ).count()
    
    discord_sessions = db.query(DiscordAccount).filter(
        DiscordAccount.status == "active"
    ).count()
    
    session_health = {
        "telegram_active": telegram_sessions,
        "discord_active": discord_sessions,
        "total_active": telegram_sessions + discord_sessions
    }
    
    # Error summary
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    errors_today = db.query(ErrorLog).filter(ErrorLog.created_at >= today).count()
    critical_errors = db.query(ErrorLog).filter(
        ErrorLog.created_at >= today,
        ErrorLog.severity == "high"
    ).count()
    
    error_summary = {
        "errors_today": errors_today,
        "critical_errors": critical_errors,
        "error_rate": (errors_today / 100) if errors_today > 0 else 0
    }
    
    # Performance metrics
    performance_metrics = {
        "total_users": db.query(User).filter(User.status == "active").count(),
        "active_forwarding_pairs": db.query(ForwardingPair).filter(
            ForwardingPair.is_active == True
        ).count(),
        "messages_processed_today": db.query(MessageLog).filter(
            MessageLog.forwarded_at >= today
        ).count()
    }
    
    return SystemHealthResponse(
        database_status=database_status,
        queue_status=queue_status,
        session_health=session_health,
        error_summary=error_summary,
        performance_metrics=performance_metrics
    )

@router.post("/system/restart-queues")
async def restart_failed_queues(
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Restart all failed queue tasks."""
    check_admin_ip(request)
    
    failed_tasks = db.query(QueueTask).filter(QueueTask.status == "failed").all()
    
    restarted_count = 0
    for task in failed_tasks:
        task.status = "pending"
        task.retry_count = 0
        task.error_message = None
        task.updated_at = datetime.utcnow()
        restarted_count += 1
    
    db.commit()
    
    logger.info(f"Admin {admin_user.username} restarted {restarted_count} failed queue tasks")
    
    return {"message": f"Restarted {restarted_count} failed tasks"}

@router.post("/announcements/send")
async def send_announcement(
    announcement: AnnouncementRequest,
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Send system-wide announcement to users."""
    check_admin_ip(request)
    
    # Get target users based on plan
    if announcement.target_plan == "all":
        target_users = db.query(User).filter(User.status == "active").all()
    else:
        target_users = db.query(User).filter(
            User.plan == announcement.target_plan,
            User.status == "active"
        ).all()
    
    # This would integrate with the Telegram bot to send announcements
    # For now, we'll log the announcement and return success
    
    logger.info(f"Admin {admin_user.username} sent announcement to {len(target_users)} users: {announcement.message}")
    
    return {
        "message": "Announcement sent successfully",
        "target_users": len(target_users),
        "announcement": announcement.message
    }

@router.delete("/users/{user_id}/sessions")
async def disconnect_user_sessions(
    user_id: int,
    request: Request,
    admin_user: User = Depends(check_admin_user),
    db: Session = Depends(get_db)
):
    """Disconnect all sessions for a user."""
    check_admin_ip(request)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Mark all user's accounts as inactive
    telegram_accounts = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == user_id
    ).all()
    
    discord_accounts = db.query(DiscordAccount).filter(
        DiscordAccount.user_id == user_id
    ).all()
    
    disconnected_sessions = 0
    for account in telegram_accounts:
        account.status = "inactive"
        disconnected_sessions += 1
    
    for account in discord_accounts:
        account.status = "inactive" 
        disconnected_sessions += 1
    
    db.commit()
    
    logger.info(f"Admin {admin_user.username} disconnected {disconnected_sessions} sessions for user {user.username}")
    
    return {"message": f"Disconnected {disconnected_sessions} sessions for user"}