"""
Celery configuration and setup for background task processing.
Handles Redis connection, queue configuration, and task routing.
"""

import os
from celery import Celery
from kombu import Queue

from utils.env_loader import get_redis_url
from utils.logger import setup_logger

logger = setup_logger()

# Get Redis URL from environment
REDIS_URL = get_redis_url()

# Create Celery application
celery_app = Celery(
    "message_forwarding",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.forwarding_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    
    # Task routing and queues
    task_routes={
        "tasks.forwarding_tasks.forward_message_task": {"queue": "medium_priority"},
        "tasks.forwarding_tasks.send_message_task": {"queue": "medium_priority"},
        "tasks.forwarding_tasks.bulk_forward_task": {"queue": "low_priority"},
        "tasks.forwarding_tasks.session_health_check_task": {"queue": "high_priority"},
        "tasks.forwarding_tasks.cleanup_task": {"queue": "low_priority"},
    },
    
    # Queue definitions
    task_default_queue="medium_priority",
    task_queues=(
        Queue("high_priority", routing_key="high_priority"),
        Queue("medium_priority", routing_key="medium_priority"),
        Queue("low_priority", routing_key="low_priority"),
    ),
    
    # Worker settings
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    worker_send_task_events=True,
    
    # Task retry settings
    task_retry_jitter=True,
    task_reject_on_worker_lost=True,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        "master_name": "mymaster",
        "retry_on_timeout": True,
    },
    
    # Broker settings
    broker_transport_options={
        "visibility_timeout": 3600,
        "fanout_prefix": True,
        "fanout_patterns": True,
    },
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        "session-health-check": {
            "task": "tasks.forwarding_tasks.session_health_check_task",
            "schedule": 300.0,  # Every 5 minutes
            "args": (None, None, {"check_type": "periodic"}),
        },
        "cleanup-old-tasks": {
            "task": "tasks.forwarding_tasks.cleanup_task",
            "schedule": 3600.0,  # Every hour
            "args": (None, None, {"cleanup_type": "old_tasks"}),
        },
        "cleanup-old-logs": {
            "task": "tasks.forwarding_tasks.cleanup_task",
            "schedule": 86400.0,  # Every day
            "args": (None, None, {"cleanup_type": "old_logs"}),
        },
    },
    beat_scheduler="django_celery_beat.schedulers:DatabaseScheduler" if os.getenv("USE_DB_SCHEDULER") else "celery.beat:PersistentScheduler",
)

# Configure logging for Celery
if os.getenv("ENVIRONMENT") == "development":
    celery_app.conf.update(
        worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
        worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s",
        worker_loglevel="INFO",
    )

# Task annotations for custom behavior
celery_app.conf.task_annotations = {
    "*": {
        "rate_limit": "100/m",  # Default rate limit
    },
    "tasks.forwarding_tasks.forward_message_task": {
        "rate_limit": "50/m",
        "time_limit": 300,  # 5 minutes
        "soft_time_limit": 240,  # 4 minutes
    },
    "tasks.forwarding_tasks.send_message_task": {
        "rate_limit": "100/m",
        "time_limit": 60,  # 1 minute
        "soft_time_limit": 45,  # 45 seconds
    },
    "tasks.forwarding_tasks.bulk_forward_task": {
        "rate_limit": "10/m",
        "time_limit": 1800,  # 30 minutes
        "soft_time_limit": 1500,  # 25 minutes
    },
    "tasks.forwarding_tasks.session_health_check_task": {
        "rate_limit": "10/m",
        "time_limit": 120,  # 2 minutes
        "soft_time_limit": 90,  # 1.5 minutes
    },
    "tasks.forwarding_tasks.cleanup_task": {
        "rate_limit": "1/m",
        "time_limit": 600,  # 10 minutes
        "soft_time_limit": 480,  # 8 minutes
    },
}

# Error handling configuration
celery_app.conf.task_default_retry_delay = 60  # 1 minute
celery_app.conf.task_max_retry_delay = 600  # 10 minutes
celery_app.conf.task_default_max_retries = 3

# Security settings
if os.getenv("ENVIRONMENT") == "production":
    celery_app.conf.update(
        task_always_eager=False,
        task_store_eager_result=False,
        broker_use_ssl=True if "rediss://" in REDIS_URL else False,
    )

# Monitoring and debugging
if os.getenv("CELERY_ENABLE_MONITORING", "false").lower() == "true":
    celery_app.conf.update(
        worker_send_task_events=True,
        task_send_sent_event=True,
    )

# Database connection settings for tasks
celery_app.conf.update(
    database_engine_options={
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "echo": False,
    }
)

# Custom task failure handler
@celery_app.task(bind=True)
def task_failure_handler(self, task_id, error, traceback):
    """Handle task failures."""
    logger.error(f"Task {task_id} failed: {error}")
    logger.error(f"Traceback: {traceback}")
    
    # Update task status in database
    try:
        from database.db import get_db
        from database.models import QueueTask
        from datetime import datetime
        
        db = next(get_db())
        try:
            task = db.query(QueueTask).filter(QueueTask.task_id == task_id).first()
            if task:
                task.status = "failed"
                task.error_message = str(error)
                task.completed_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
            
    except Exception as db_error:
        logger.error(f"Failed to update task status in database: {db_error}")

# Task success handler
@celery_app.task(bind=True)
def task_success_handler(self, retval, task_id, args, kwargs):
    """Handle successful task completion."""
    logger.info(f"Task {task_id} completed successfully")
    
    # Update task status in database
    try:
        from database.db import get_db
        from database.models import QueueTask
        from datetime import datetime
        
        db = next(get_db())
        try:
            task = db.query(QueueTask).filter(QueueTask.task_id == task_id).first()
            if task:
                task.status = "completed"
                task.result_data = retval if isinstance(retval, dict) else {"result": retval}
                task.completed_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
            
    except Exception as db_error:
        logger.error(f"Failed to update task status in database: {db_error}")

# Signal handlers will be set up after celery_app is fully initialized
def setup_celery_signals():
    """Setup Celery signal handlers after app initialization."""
    from celery import signals
    
    @signals.worker_ready.connect
    def worker_ready(sender=None, **kwargs):
        """Handle worker ready event."""
        logger.info("Celery worker is ready and waiting for tasks")

    @signals.worker_shutdown.connect
    def worker_shutdown(sender=None, **kwargs):
        """Handle worker shutdown event."""
        logger.info("Celery worker is shutting down")

    @signals.task_prerun.connect
    def task_prerun(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
        """Handle task prerun event."""
        logger.debug(f"Task {task_id} is about to start: {task.name}")
        
        # Update task status in database
        try:
            from database.db import get_db
            from database.models import QueueTask
            from datetime import datetime
            
            db = next(get_db())
            try:
                queue_task = db.query(QueueTask).filter(QueueTask.task_id == task_id).first()
                if queue_task:
                    queue_task.status = "processing"
                    queue_task.started_at = datetime.utcnow()
                    db.commit()
            finally:
                db.close()
                
        except Exception as db_error:
            logger.error(f"Failed to update task status in database: {db_error}")

    @signals.task_postrun.connect
    def task_postrun(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
        """Handle task postrun event."""
        logger.debug(f"Task {task_id} finished with state: {state}")

# Setup signals after celery app is configured
setup_celery_signals()

# Configure Celery to use custom serializer for complex objects
def custom_serializer(obj):
    """Custom serializer for complex objects."""
    import json
    from datetime import datetime
    
    if isinstance(obj, datetime):
        return {"__datetime__": obj.isoformat()}
    
    return json.JSONEncoder().default(obj)

def custom_deserializer(obj):
    """Custom deserializer for complex objects."""
    if "__datetime__" in obj:
        from datetime import datetime
        return datetime.fromisoformat(obj["__datetime__"])
    
    return obj

# Register custom serializer
from kombu.serialization import register
register(
    "custom_json", 
    custom_serializer, 
    custom_deserializer,
    content_type="application/x-custom-json",
    content_encoding="utf-8"
)

# Health check task
@celery_app.task(bind=True, name="celery.ping")
def ping_task(self):
    """Simple ping task for health checks."""
    return "pong"

logger.info("Celery configuration loaded successfully")
