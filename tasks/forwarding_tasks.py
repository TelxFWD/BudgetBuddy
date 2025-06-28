"""
Celery tasks for message forwarding and background processing.
Handles all asynchronous operations for the message forwarding system.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from celery import current_task
from sqlalchemy.orm import Session

from tasks.celery_config import celery_app
from database.db import get_db
from database.models import (
    User, ForwardingPair, TelegramAccount, DiscordAccount, 
    QueueTask, MessageLog, ErrorLog
)
from services.session_manager import SessionManager
from services.feature_gating import FeatureGating
from utils.logger import setup_logger

logger = setup_logger()

# Initialize services
session_manager = SessionManager()
feature_gating = FeatureGating()

@celery_app.task(bind=True, name="tasks.forwarding_tasks.forward_message_task")
def forward_message_task(self, task_id: str, user_id: int, task_data: Dict[str, Any]):
    """Forward a message between platforms."""
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"Starting message forwarding task {task_id} for user {user_id}")
        
        # Validate required data
        required_fields = ["pair_id", "message_data"]
        for field in required_fields:
            if field not in task_data:
                raise ValueError(f"Missing required field: {field}")
        
        pair_id = task_data["pair_id"]
        message_data = task_data["message_data"]
        
        # Get forwarding pair from database
        db: Session = next(get_db())
        try:
            pair = db.query(ForwardingPair).filter(
                ForwardingPair.id == pair_id,
                ForwardingPair.user_id == user_id,
                ForwardingPair.status == "active"
            ).first()
            
            if not pair:
                raise ValueError(f"Forwarding pair {pair_id} not found or inactive")
            
            # Validate user plan and feature access
            if not feature_gating.validate_plan_active(user_id):
                raise ValueError("User plan is expired or inactive")
            
            # Check if user has access to required features
            if pair.copy_mode and not feature_gating.validate_copy_mode(user_id):
                raise ValueError("Copy mode not available in your plan")
            
            # Apply custom delay if specified
            if pair.delay > 0:
                if not feature_gating.validate_custom_delays(user_id):
                    logger.warning(f"Custom delays not available for user {user_id}, using default")
                else:
                    import time
                    time.sleep(pair.delay)
            
            # Process message based on platform type
            result = asyncio.run(_process_message_forwarding(pair, message_data))
            
            # Log successful forwarding
            message_log = MessageLog(
                forwarding_pair_id=pair.id,
                source_message_id=message_data.get("message_id", "unknown"),
                destination_message_id=result.get("destination_message_id"),
                message_type=message_data.get("type", "text"),
                forwarded_at=datetime.utcnow(),
                processing_time=(datetime.utcnow() - start_time).total_seconds(),
                status="success",
                message_size=len(str(message_data)),
                has_media=message_data.get("has_media", False),
                media_type=message_data.get("media_type")
            )
            
            db.add(message_log)
            db.commit()
            
            logger.info(f"Message forwarding task {task_id} completed successfully")
            return {
                "success": True,
                "pair_id": pair_id,
                "processing_time": (datetime.utcnow() - start_time).total_seconds(),
                "destination_message_id": result.get("destination_message_id")
            }
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Message forwarding task {task_id} failed: {e}")
        
        # Log error
        _log_task_error(task_id, user_id, "message_forward_error", str(e), task_data)
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task {task_id} (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        return {
            "success": False,
            "error": str(e),
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }

async def _process_message_forwarding(pair: ForwardingPair, message_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process message forwarding based on platform type."""
    try:
        # Initialize session manager if not already done
        if not session_manager._initialized:
            await session_manager.initialize()
        
        platform_type = pair.platform_type
        source_channel = pair.source_channel
        destination_channel = pair.destination_channel
        
        # Apply filters if specified
        if pair.filter_keywords or pair.exclude_keywords:
            message_text = message_data.get("text", "").lower()
            
            # Check filter keywords (must contain at least one)
            if pair.filter_keywords:
                if not any(keyword.lower() in message_text for keyword in pair.filter_keywords):
                    logger.debug("Message filtered out by filter keywords")
                    return {"skipped": True, "reason": "filtered"}
            
            # Check exclude keywords (must not contain any)
            if pair.exclude_keywords:
                if any(keyword.lower() in message_text for keyword in pair.exclude_keywords):
                    logger.debug("Message filtered out by exclude keywords")
                    return {"skipped": True, "reason": "excluded"}
        
        # Prepare message content
        message_content = message_data.get("text", "")
        
        # Apply custom prefix/suffix
        if pair.custom_prefix:
            message_content = pair.custom_prefix + " " + message_content
        
        if pair.custom_suffix:
            message_content = message_content + " " + pair.custom_suffix
        
        # Forward based on platform type
        if platform_type == "telegram_to_telegram":
            return await _forward_telegram_to_telegram(pair, message_data, message_content)
        
        elif platform_type == "telegram_to_discord":
            return await _forward_telegram_to_discord(pair, message_data, message_content)
        
        elif platform_type == "discord_to_telegram":
            return await _forward_discord_to_telegram(pair, message_data, message_content)
        
        elif platform_type == "discord_to_discord":
            return await _forward_discord_to_discord(pair, message_data, message_content)
        
        else:
            raise ValueError(f"Unsupported platform type: {platform_type}")
    
    except Exception as e:
        logger.error(f"Error processing message forwarding: {e}")
        raise

async def _forward_telegram_to_telegram(pair: ForwardingPair, message_data: Dict[str, Any], content: str) -> Dict[str, Any]:
    """Forward message from Telegram to Telegram."""
    if pair.copy_mode:
        # Send as new message
        success = await session_manager.send_telegram_message(
            pair.telegram_account_id,
            pair.destination_channel,
            content
        )
    else:
        # Forward original message
        success = await session_manager.forward_telegram_message(
            pair.telegram_account_id,
            pair.source_channel,
            pair.destination_channel,
            int(message_data.get("message_id", 0))
        )
    
    return {"success": success, "platform": "telegram"}

async def _forward_telegram_to_discord(pair: ForwardingPair, message_data: Dict[str, Any], content: str) -> Dict[str, Any]:
    """Forward message from Telegram to Discord."""
    # Always copy mode for cross-platform forwarding
    success = await session_manager.send_discord_message(
        pair.discord_account_id,
        int(pair.destination_channel),
        content
    )
    
    return {"success": success, "platform": "discord"}

async def _forward_discord_to_telegram(pair: ForwardingPair, message_data: Dict[str, Any], content: str) -> Dict[str, Any]:
    """Forward message from Discord to Telegram."""
    # Always copy mode for cross-platform forwarding
    success = await session_manager.send_telegram_message(
        pair.telegram_account_id,
        pair.destination_channel,
        content
    )
    
    return {"success": success, "platform": "telegram"}

async def _forward_discord_to_discord(pair: ForwardingPair, message_data: Dict[str, Any], content: str) -> Dict[str, Any]:
    """Forward message from Discord to Discord."""
    success = await session_manager.send_discord_message(
        pair.discord_account_id,
        int(pair.destination_channel),
        content
    )
    
    return {"success": success, "platform": "discord"}

@celery_app.task(bind=True, name="tasks.forwarding_tasks.send_message_task")
def send_message_task(self, task_id: str, user_id: int, task_data: Dict[str, Any]):
    """Send a message to a specific platform."""
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"Starting send message task {task_id} for user {user_id}")
        
        # Validate required data
        required_fields = ["platform", "account_id", "channel_id", "message"]
        for field in required_fields:
            if field not in task_data:
                raise ValueError(f"Missing required field: {field}")
        
        platform = task_data["platform"]
        account_id = task_data["account_id"]
        channel_id = task_data["channel_id"]
        message = task_data["message"]
        
        # Validate user plan
        if not feature_gating.validate_plan_active(user_id):
            raise ValueError("User plan is expired or inactive")
        
        # Send message based on platform
        if platform.lower() == "telegram":
            result = asyncio.run(session_manager.send_telegram_message(account_id, channel_id, message))
        elif platform.lower() == "discord":
            result = asyncio.run(session_manager.send_discord_message(account_id, int(channel_id), message))
        else:
            raise ValueError(f"Unsupported platform: {platform}")
        
        logger.info(f"Send message task {task_id} completed successfully")
        return {
            "success": result,
            "platform": platform,
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }
    
    except Exception as e:
        logger.error(f"Send message task {task_id} failed: {e}")
        
        # Log error
        _log_task_error(task_id, user_id, "send_message_error", str(e), task_data)
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task {task_id} (attempt {self.request.retries + 1})")
            raise self.retry(countdown=30 * (2 ** self.request.retries))
        
        return {
            "success": False,
            "error": str(e),
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }

@celery_app.task(bind=True, name="tasks.forwarding_tasks.bulk_forward_task")
def bulk_forward_task(self, task_id: str, user_id: int, task_data: Dict[str, Any]):
    """Process bulk message forwarding."""
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"Starting bulk forward task {task_id} for user {user_id}")
        
        # Validate bulk operations access
        if not feature_gating.validate_bulk_operations(user_id):
            raise ValueError("Bulk operations not available in your plan")
        
        # Validate required data
        if "messages" not in task_data or not isinstance(task_data["messages"], list):
            raise ValueError("Missing or invalid messages data")
        
        messages = task_data["messages"]
        results = []
        
        for i, message_data in enumerate(messages):
            try:
                # Create individual forwarding task
                individual_task_id = f"{task_id}_bulk_{i}"
                
                # Process each message
                result = forward_message_task.apply(
                    args=[individual_task_id, user_id, message_data],
                    throw=True
                )
                
                results.append({
                    "index": i,
                    "success": True,
                    "result": result.get()
                })
                
                # Add delay between messages to avoid rate limiting
                import time
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Failed to process bulk message {i}: {e}")
                results.append({
                    "index": i,
                    "success": False,
                    "error": str(e)
                })
        
        successful_count = sum(1 for r in results if r["success"])
        
        logger.info(f"Bulk forward task {task_id} completed: {successful_count}/{len(messages)} successful")
        return {
            "success": True,
            "total_messages": len(messages),
            "successful_count": successful_count,
            "failed_count": len(messages) - successful_count,
            "results": results,
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }
    
    except Exception as e:
        logger.error(f"Bulk forward task {task_id} failed: {e}")
        
        # Log error
        _log_task_error(task_id, user_id, "bulk_forward_error", str(e), task_data)
        
        return {
            "success": False,
            "error": str(e),
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }

@celery_app.task(bind=True, name="tasks.forwarding_tasks.session_health_check_task")
def session_health_check_task(self, task_id: str, user_id: Optional[int], task_data: Dict[str, Any]):
    """Check session health and reconnect if needed."""
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"Starting session health check task {task_id}")
        
        check_type = task_data.get("check_type", "manual")
        
        # Get session health
        health_status = asyncio.run(session_manager.get_session_health())
        
        # Check for degraded sessions and attempt repairs
        repairs_made = 0
        
        if health_status.get("telegram", {}).get("health") == "degraded":
            logger.warning("Telegram sessions are degraded, attempting repairs")
            
            # Get all Telegram accounts that should be active
            db: Session = next(get_db())
            try:
                telegram_accounts = db.query(TelegramAccount).filter(
                    TelegramAccount.status == "active"
                ).all()
                
                for account in telegram_accounts:
                    try:
                        success = asyncio.run(session_manager.restart_session("telegram", account.id))
                        if success:
                            repairs_made += 1
                            logger.info(f"Repaired Telegram session for account {account.id}")
                    except Exception as e:
                        logger.error(f"Failed to repair Telegram session {account.id}: {e}")
            finally:
                db.close()
        
        if health_status.get("discord", {}).get("health") == "degraded":
            logger.warning("Discord sessions are degraded, attempting repairs")
            
            # Get all Discord accounts that should be active
            db: Session = next(get_db())
            try:
                discord_accounts = db.query(DiscordAccount).filter(
                    DiscordAccount.status == "active"
                ).all()
                
                for account in discord_accounts:
                    try:
                        success = asyncio.run(session_manager.restart_session("discord", account.id))
                        if success:
                            repairs_made += 1
                            logger.info(f"Repaired Discord session for account {account.id}")
                    except Exception as e:
                        logger.error(f"Failed to repair Discord session {account.id}: {e}")
            finally:
                db.close()
        
        logger.info(f"Session health check task {task_id} completed, {repairs_made} repairs made")
        return {
            "success": True,
            "check_type": check_type,
            "health_status": health_status,
            "repairs_made": repairs_made,
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }
    
    except Exception as e:
        logger.error(f"Session health check task {task_id} failed: {e}")
        
        # Log error
        _log_task_error(task_id, user_id, "session_health_check_error", str(e), task_data)
        
        return {
            "success": False,
            "error": str(e),
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }

@celery_app.task(bind=True, name="tasks.forwarding_tasks.cleanup_task")
def cleanup_task(self, task_id: str, user_id: Optional[int], task_data: Dict[str, Any]):
    """Clean up old data and logs."""
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"Starting cleanup task {task_id}")
        
        cleanup_type = task_data.get("cleanup_type", "old_tasks")
        days_old = task_data.get("days_old", 7)
        
        cleanup_results = {}
        
        if cleanup_type in ["old_tasks", "all"]:
            # Clean up old queue tasks directly from database
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            db: Session = next(get_db())
            try:
                deleted_tasks = db.query(QueueTask).filter(
                    QueueTask.created_at < cutoff_date,
                    QueueTask.status.in_(["completed", "failed"])
                ).delete()
                db.commit()
                cleanup_results["deleted_tasks"] = deleted_tasks
            finally:
                db.close()
        
        if cleanup_type in ["old_logs", "all"]:
            # Clean up old message logs
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            db: Session = next(get_db())
            try:
                deleted_message_logs = db.query(MessageLog).filter(
                    MessageLog.forwarded_at < cutoff_date
                ).delete()
                
                # Clean up old error logs (keep critical errors longer)
                error_cutoff_date = datetime.utcnow() - timedelta(days=days_old * 2)
                deleted_error_logs = db.query(ErrorLog).filter(
                    ErrorLog.timestamp < error_cutoff_date,
                    ErrorLog.severity != "critical",
                    ErrorLog.resolved == True
                ).delete()
                
                db.commit()
                
                cleanup_results["deleted_message_logs"] = deleted_message_logs
                cleanup_results["deleted_error_logs"] = deleted_error_logs
                
            finally:
                db.close()
        
        total_deleted = sum(cleanup_results.values())
        
        logger.info(f"Cleanup task {task_id} completed, {total_deleted} records deleted")
        return {
            "success": True,
            "cleanup_type": cleanup_type,
            "days_old": days_old,
            "cleanup_results": cleanup_results,
            "total_deleted": total_deleted,
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }
    
    except Exception as e:
        logger.error(f"Cleanup task {task_id} failed: {e}")
        
        # Log error
        _log_task_error(task_id, user_id, "cleanup_error", str(e), task_data)
        
        return {
            "success": False,
            "error": str(e),
            "processing_time": (datetime.utcnow() - start_time).total_seconds()
        }

def _log_task_error(task_id: str, user_id: Optional[int], error_type: str, error_message: str, task_data: Dict[str, Any]):
    """Log task error to database."""
    try:
        db: Session = next(get_db())
        try:
            error_log = ErrorLog(
                user_id=user_id,
                error_type=error_type,
                error_message=error_message,
                context_data={
                    "task_id": task_id,
                    "task_data": task_data
                },
                severity="error"
            )
            
            db.add(error_log)
            db.commit()
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Failed to log task error to database: {e}")

# Health check task for monitoring
@celery_app.task(name="tasks.forwarding_tasks.health_ping")
def health_ping():
    """Simple health check ping task."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_id": current_task.request.hostname
    }

# Task for testing queue functionality
@celery_app.task(bind=True, name="tasks.forwarding_tasks.test_task")
def test_task(self, test_data: Dict[str, Any]):
    """Test task for queue functionality verification."""
    import time
    
    start_time = datetime.utcnow()
    delay = test_data.get("delay", 0)
    
    if delay > 0:
        time.sleep(delay)
    
    return {
        "success": True,
        "test_data": test_data,
        "start_time": start_time.isoformat(),
        "end_time": datetime.utcnow().isoformat(),
        "processing_time": (datetime.utcnow() - start_time).total_seconds(),
        "worker_id": self.request.hostname
    }

logger.info("Forwarding tasks module loaded successfully")
