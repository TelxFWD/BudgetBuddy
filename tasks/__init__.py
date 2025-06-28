"""
Tasks module for Celery background task processing.
This module contains all Celery tasks and task configuration.
"""

from .celery_config import celery_app
from .forwarding_tasks import *

__all__ = ["celery_app"]
