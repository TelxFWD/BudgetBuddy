"""
Bots module for Telegram and Discord client management.
This module contains the multi-platform bot clients and session handlers.
"""

from .telegram_client import TelegramClient
from .discord_client import DiscordClient

__all__ = ["TelegramClient", "DiscordClient"]
