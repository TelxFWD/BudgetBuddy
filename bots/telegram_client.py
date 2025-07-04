"""
Telegram client for multi-account session management using Pyrogram.
Handles authentication, session persistence, and message forwarding.
"""
```
```python
import os
import asyncio
import logging
from typing import Dict, List, Optional, Any
from pyrogram import Client, errors
from pyrogram.types import Message
from sqlalchemy.orm import Session
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError, PhoneCodeExpiredError

from database.db import get_db
from database.models import TelegramAccount, User, ErrorLog
from utils.logger import setup_logger, logger

```python
logger = setup_logger()
```python
class TelegramClientManager:
    def __init__(self):
        self.clients: Dict[int, TelegramClient] = {}
        self.api_id = int(os.getenv("TELEGRAM_API_ID", "0"))
        self.api_hash = os.getenv("TELEGRAM_API_HASH", "")

    async def get_client(self, account_id: int) -> Optional[TelegramClient]:
        """Get or create Telegram client for account."""
        if account_id not in self.clients:
            await self.create_client(account_id)
        return self.clients.get(account_id)

    async def create_client(self, account_id: int):
        """Create and connect Telegram client."""
        try:
            client = TelegramClient(
                f"sessions/telegram/account_{account_id}",
                self.api_id,
                self.api_hash
            )

            await client.connect()

            if await client.is_user_authorized():
                self.clients[account_id] = client
                logger.info(f"✅ Telegram client created for account {account_id}")
                return client
            else:
                logger.error(f"⚠️ Account {account_id} not authorized")
                return None

        except Exception as e:
            logger.error(f"Failed to create Telegram client for account {account_id}: {str(e)}")
            return None

    async def start_client(self, account_id: int):
        """Start Telegram client polling."""
        client = await self.get_client(account_id)
        if client:
            try:
                await client.run_until_disconnected()
            except Exception as e:
                logger.error(f"Client {account_id} disconnected: {str(e)}")

# Global client manager
telegram_client_manager = TelegramClientManager()