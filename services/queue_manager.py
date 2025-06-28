"""
Queue manager for Redis and Celery background task processing.
Handles queue setup, task distribution, and priority management.
"""

import os
import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
import redis
from celery import Celery
from celery.result import AsyncResult
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, QueueTask, ForwardingPair
from services.feature_gating import FeatureGating, PlanType
from utils.env_loader import get_redis_url
from utils.logger import setup_logger

logger = setup_logger()

class QueueManager:
    """Centralized queue manager for background task processing."""
    
    def __init__(self):
        self.redis_url = get_redis_url()
        self.redis_client = None
        self.celery_app = None
        self.feature_gating = FeatureGating()
        self._initialized = False
        self.redis_available = False
        
        # Queue configuration
        self.queue_names = {
            1: "low_priority",     # Free plan
            2: "medium_priority",  # Pro plan  
            3: "high_priority"     # Elite plan
        }
        
        # Task types
        self.task_types = {
            "forward_message": "tasks.forwarding_tasks.forward_message_task",
            "send_message": "tasks.forwarding_tasks.send_message_task",
            "bulk_forward": "tasks.forwarding_tasks.bulk_forward_task",
            "session_check": "tasks.forwarding_tasks.session_health_check_task",
            "cleanup": "tasks.forwarding_tasks.cleanup_task"
        }
    
    async def initialize(self):
        """Initialize the queue manager."""
        if self._initialized:
            return
        
        logger.info("Initializing Queue Manager")
        
        try:
            # Initialize Redis client
            await self._initialize_redis()
            
            # Initialize Celery app
            await self._initialize_celery()
            
            # Create queues
            await self._create_queues()
            
            # Start queue monitoring
            asyncio.create_task(self._queue_monitor())
            
            self._initialized = True
            logger.info("Queue Manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Queue Manager: {e}")
            raise
    
    async def _initialize_redis(self):
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                health_check_interval=30
            )
            
            # Test connection
            await asyncio.get_event_loop().run_in_executor(None, self.redis_client.ping)
            logger.info("Redis connection established")
            self.redis_available = True
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            logger.warning("Queue functionality will be disabled - Redis connection failed")
            self.redis_client = None
            self.redis_available = False
    
    async def _initialize_celery(self):
        """Initialize Celery application."""
        try:
            from tasks.celery_config import celery_app
            self.celery_app = celery_app
            logger.info("Celery app initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Celery: {e}")
            raise
    
    async def _create_queues(self):
        """Create Redis queues for different priority levels."""
        if not self.redis_available or self.redis_client is None:
            logger.warning("Skipping queue creation - Redis not available")
            return
            
        try:
            for priority, queue_name in self.queue_names.items():
                # Create queue key
                queue_key = f"celery:{queue_name}"
                
                # Initialize queue if it doesn't exist
                if not await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.exists, queue_key
                ):
                    await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_client.lpush, queue_key, ""
                    )
                    await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_client.lpop, queue_key
                    )
            
            logger.info(f"Created {len(self.queue_names)} priority queues")
            
        except Exception as e:
            logger.error(f"Failed to create queues: {e}")
            logger.warning("Queue functionality will be limited")
    
    async def enqueue_task(
        self, 
        user_id: int, 
        task_type: str, 
        task_data: Dict[str, Any],
        priority: Optional[int] = None,
        delay: int = 0,
        max_retries: int = 3
    ) -> str:
        """Enqueue a task for background processing."""
        try:
            # Validate user and get plan
            user_plan = self.feature_gating.get_user_plan(user_id)
            if not user_plan:
                raise ValueError("User not found")
            
            # Determine priority based on plan if not specified
            if priority is None:
                priority = self._get_plan_priority(user_plan)
            
            # Validate priority access
            priority_check = self.feature_gating.validate_queue_priority(user_id, priority)
            if not priority_check["allowed"]:
                priority = priority_check["max_priority"]
            
            # Get queue name
            queue_name = self.queue_names.get(priority, "low_priority")
            
            # Validate task type
            if task_type not in self.task_types:
                raise ValueError(f"Invalid task type: {task_type}")
            
            # Create task ID
            task_id = f"{task_type}_{user_id}_{asyncio.get_event_loop().time()}"
            
            # Create task record in database
            db: Session = next(get_db())
            try:
                queue_task = QueueTask(
                    task_id=task_id,
                    user_id=user_id,
                    task_type=task_type,
                    status="pending",
                    priority=priority,
                    task_data=task_data,
                    max_retries=max_retries
                )
                
                db.add(queue_task)
                db.commit()
                db.refresh(queue_task)
                
            finally:
                db.close()
            
            # Enqueue task with Celery
            task_name = self.task_types[task_type]
            
            if delay > 0:
                # Schedule task with delay
                result = self.celery_app.send_task(
                    task_name,
                    args=[task_id, user_id, task_data],
                    queue=queue_name,
                    countdown=delay,
                    retry=True,
                    max_retries=max_retries,
                    task_id=task_id
                )
            else:
                # Execute immediately
                result = self.celery_app.send_task(
                    task_name,
                    args=[task_id, user_id, task_data],
                    queue=queue_name,
                    retry=True,
                    max_retries=max_retries,
                    task_id=task_id
                )
            
            logger.info(f"Task {task_id} enqueued successfully to {queue_name}")
            return task_id
            
        except Exception as e:
            logger.error(f"Failed to enqueue task: {e}")
            raise
    
    def _get_plan_priority(self, plan: PlanType) -> int:
        """Get default priority for a plan type."""
        priority_map = {
            PlanType.FREE: 1,
            PlanType.PRO: 2,
            PlanType.ELITE: 3
        }
        return priority_map.get(plan, 1)
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get the status of a specific task."""
        try:
            # Get from database
            db: Session = next(get_db())
            try:
                task = db.query(QueueTask).filter(QueueTask.task_id == task_id).first()
                if not task:
                    return {"error": "Task not found"}
                
                # Get Celery result
                result = AsyncResult(task_id, app=self.celery_app)
                
                return {
                    "task_id": task.task_id,
                    "status": task.status,
                    "priority": task.priority,
                    "created_at": task.created_at.isoformat(),
                    "started_at": task.started_at.isoformat() if task.started_at else None,
                    "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                    "retry_count": task.retry_count,
                    "max_retries": task.max_retries,
                    "celery_status": result.status,
                    "result": task.result_data,
                    "error": task.error_message
                }
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return {"error": str(e)}
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending or running task."""
        try:
            # Revoke from Celery
            self.celery_app.control.revoke(task_id, terminate=True)
            
            # Update database
            db: Session = next(get_db())
            try:
                task = db.query(QueueTask).filter(QueueTask.task_id == task_id).first()
                if task:
                    task.status = "cancelled"
                    task.error_message = "Task cancelled by user"
                    db.commit()
                    
                    logger.info(f"Task {task_id} cancelled successfully")
                    return True
                else:
                    return False
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to cancel task: {e}")
            return False
    
    async def retry_failed_task(self, task_id: str) -> bool:
        """Retry a failed task."""
        try:
            db: Session = next(get_db())
            try:
                task = db.query(QueueTask).filter(QueueTask.task_id == task_id).first()
                if not task or task.status != "failed":
                    return False
                
                # Check retry limit
                if task.retry_count >= task.max_retries:
                    logger.warning(f"Task {task_id} has exceeded max retries")
                    return False
                
                # Reset task status
                task.status = "pending"
                task.retry_count += 1
                task.error_message = None
                db.commit()
                
                # Re-enqueue task
                queue_name = self.queue_names.get(task.priority, "low_priority")
                task_name = self.task_types[task.task_type]
                
                self.celery_app.send_task(
                    task_name,
                    args=[task.task_id, task.user_id, task.task_data],
                    queue=queue_name,
                    retry=True,
                    max_retries=task.max_retries - task.retry_count,
                    task_id=task.task_id
                )
                
                logger.info(f"Task {task_id} retried successfully")
                return True
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to retry task: {e}")
            return False
    
    async def get_user_tasks(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get tasks for a specific user."""
        try:
            db: Session = next(get_db())
            try:
                tasks = db.query(QueueTask).filter(
                    QueueTask.user_id == user_id
                ).order_by(QueueTask.created_at.desc()).limit(limit).all()
                
                task_list = []
                for task in tasks:
                    task_info = {
                        "task_id": task.task_id,
                        "task_type": task.task_type,
                        "status": task.status,
                        "priority": task.priority,
                        "created_at": task.created_at.isoformat(),
                        "retry_count": task.retry_count,
                        "max_retries": task.max_retries
                    }
                    
                    if task.completed_at:
                        task_info["completed_at"] = task.completed_at.isoformat()
                    
                    if task.error_message:
                        task_info["error"] = task.error_message
                    
                    task_list.append(task_info)
                
                return task_list
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get user tasks: {e}")
            return []
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get statistics for all queues."""
        try:
            stats = {}
            
            for priority, queue_name in self.queue_names.items():
                queue_key = f"celery:{queue_name}"
                
                # Get queue length
                queue_length = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.llen, queue_key
                )
                
                stats[queue_name] = {
                    "priority": priority,
                    "pending_tasks": queue_length,
                    "queue_key": queue_key
                }
            
            # Get active workers
            inspect = self.celery_app.control.inspect()
            active_workers = inspect.active()
            worker_count = len(active_workers) if active_workers else 0
            
            # Get database task counts
            db: Session = next(get_db())
            try:
                pending_count = db.query(QueueTask).filter(QueueTask.status == "pending").count()
                processing_count = db.query(QueueTask).filter(QueueTask.status == "processing").count()
                completed_count = db.query(QueueTask).filter(QueueTask.status == "completed").count()
                failed_count = db.query(QueueTask).filter(QueueTask.status == "failed").count()
                
                stats["summary"] = {
                    "active_workers": worker_count,
                    "pending_tasks": pending_count,
                    "processing_tasks": processing_count,
                    "completed_tasks": completed_count,
                    "failed_tasks": failed_count,
                    "total_tasks": pending_count + processing_count + completed_count + failed_count
                }
                
            finally:
                db.close()
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {"error": str(e)}
    
    async def cleanup_old_tasks(self, days_old: int = 7) -> int:
        """Clean up old completed and failed tasks."""
        try:
            from datetime import datetime, timedelta
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            db: Session = next(get_db())
            try:
                # Delete old completed and failed tasks
                deleted_count = db.query(QueueTask).filter(
                    QueueTask.status.in_(["completed", "failed", "cancelled"]),
                    QueueTask.created_at < cutoff_date
                ).delete()
                
                db.commit()
                
                logger.info(f"Cleaned up {deleted_count} old tasks")
                return deleted_count
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to cleanup old tasks: {e}")
            return 0
    
    async def _queue_monitor(self):
        """Monitor queue health and performance."""
        monitor_interval = int(os.getenv("QUEUE_MONITOR_INTERVAL", 60))  # 1 minute
        
        while True:
            try:
                await asyncio.sleep(monitor_interval)
                
                # Get queue stats
                stats = await self.get_queue_stats()
                
                # Log queue statistics
                if "summary" in stats:
                    summary = stats["summary"]
                    logger.debug(
                        f"Queue Stats - Workers: {summary['active_workers']}, "
                        f"Pending: {summary['pending_tasks']}, "
                        f"Processing: {summary['processing_tasks']}, "
                        f"Failed: {summary['failed_tasks']}"
                    )
                
                # Check for stuck tasks (processing for too long)
                await self._check_stuck_tasks()
                
                # Auto-cleanup old tasks
                if asyncio.get_event_loop().time() % 3600 < monitor_interval:  # Once per hour
                    await self.cleanup_old_tasks()
                
            except Exception as e:
                logger.error(f"Queue monitor error: {e}")
    
    async def _check_stuck_tasks(self):
        """Check for tasks that have been processing for too long."""
        try:
            from datetime import datetime, timedelta
            
            # Tasks processing for more than 10 minutes are considered stuck
            stuck_threshold = datetime.utcnow() - timedelta(minutes=10)
            
            db: Session = next(get_db())
            try:
                stuck_tasks = db.query(QueueTask).filter(
                    QueueTask.status == "processing",
                    QueueTask.started_at < stuck_threshold
                ).all()
                
                for task in stuck_tasks:
                    logger.warning(f"Detected stuck task: {task.task_id}")
                    
                    # Check Celery task status
                    result = AsyncResult(task.task_id, app=self.celery_app)
                    
                    if result.status == "FAILURE":
                        task.status = "failed"
                        task.error_message = "Task failed (stuck detection)"
                        task.completed_at = datetime.utcnow()
                    elif result.status in ["SUCCESS", "REVOKED"]:
                        task.status = "completed" if result.status == "SUCCESS" else "cancelled"
                        task.completed_at = datetime.utcnow()
                
                if stuck_tasks:
                    db.commit()
                    logger.info(f"Updated {len(stuck_tasks)} stuck tasks")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to check stuck tasks: {e}")
    
    async def get_active_queue_count(self) -> int:
        """Get the number of active queues."""
        return len(self.queue_names)
    
    async def get_pending_task_count(self) -> int:
        """Get the total number of pending tasks."""
        try:
            db: Session = next(get_db())
            try:
                return db.query(QueueTask).filter(QueueTask.status == "pending").count()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to get pending task count: {e}")
            return 0
    
    async def cleanup(self):
        """Cleanup queue manager resources."""
        logger.info("Cleaning up Queue Manager")
        
        try:
            if self.redis_client:
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.close
                )
            
            self._initialized = False
            logger.info("Queue Manager cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during Queue Manager cleanup: {e}")
