"""
Session manager for handling Telegram and Discord session lifecycle management.
Coordinates between multiple clients and manages session health.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import TelegramAccount, DiscordAccount, User
from bots.telegram_client import TelegramClient
from bots.discord_client import DiscordClient
from utils.logger import setup_logger

logger = setup_logger()

class SessionManager:
    """Centralized session manager for all platform clients."""
    
    def __init__(self):
        self.telegram_client = TelegramClient()
        self.discord_client = DiscordClient()
        self._initialized = False
    
    async def initialize(self):
        """Initialize all client managers."""
        if self._initialized:
            return
        
        logger.info("Initializing Session Manager")
        
        try:
            # Initialize Telegram client
            await self.telegram_client.initialize()
            
            # Initialize Discord client
            await self.discord_client.initialize()
            
            self._initialized = True
            logger.info("Session Manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Session Manager: {e}")
            raise
    
    async def get_user_sessions(self, user_id: int) -> Dict[str, Any]:
        """Get all active sessions for a user."""
        db: Session = next(get_db())
        
        try:
            # Get Telegram accounts
            telegram_accounts = db.query(TelegramAccount).filter(
                TelegramAccount.user_id == user_id,
                TelegramAccount.status == "active"
            ).all()
            
            # Get Discord accounts
            discord_accounts = db.query(DiscordAccount).filter(
                DiscordAccount.user_id == user_id,
                DiscordAccount.status == "active"
            ).all()
            
            # Get detailed information for each account
            telegram_sessions = []
            for account in telegram_accounts:
                info = await self.telegram_client.get_account_info(account.id)
                if info:
                    telegram_sessions.append({
                        "account_id": account.id,
                        "phone_number": account.phone_number,
                        "telegram_user_id": account.telegram_user_id,
                        "status": account.status,
                        "info": info
                    })
            
            discord_sessions = []
            for account in discord_accounts:
                info = await self.discord_client.get_account_info(account.id)
                if info:
                    discord_sessions.append({
                        "account_id": account.id,
                        "status": account.status,
                        "servers": account.discord_servers,
                        "info": info
                    })
            
            return {
                "telegram_sessions": telegram_sessions,
                "discord_sessions": discord_sessions,
                "total_sessions": len(telegram_sessions) + len(discord_sessions)
            }
            
        finally:
            db.close()
    
    async def add_telegram_account(self, user_id: int, phone_number: str) -> Dict[str, Any]:
        """Add a new Telegram account for a user."""
        try:
            result = await self.telegram_client.add_account(user_id, phone_number)
            logger.info(f"Telegram account added for user {user_id}: {phone_number}")
            return result
        except Exception as e:
            logger.error(f"Failed to add Telegram account for user {user_id}: {e}")
            raise
    
    async def verify_telegram_account(self, account_id: int, otp_code: str, phone_hash: str) -> bool:
        """Verify a Telegram account with OTP."""
        try:
            result = await self.telegram_client.verify_account(account_id, otp_code, phone_hash)
            logger.info(f"Telegram account {account_id} verified successfully")
            return result
        except Exception as e:
            logger.error(f"Failed to verify Telegram account {account_id}: {e}")
            raise
    
    async def add_discord_account(self, user_id: int, discord_token: str, server_ids: List[str] = None) -> Dict[str, Any]:
        """Add a new Discord account for a user."""
        try:
            result = await self.discord_client.add_account(user_id, discord_token, server_ids)
            logger.info(f"Discord account added for user {user_id}")
            return result
        except Exception as e:
            logger.error(f"Failed to add Discord account for user {user_id}: {e}")
            raise
    
    async def remove_telegram_account(self, account_id: int) -> bool:
        """Remove a Telegram account."""
        try:
            result = await self.telegram_client.remove_account(account_id)
            logger.info(f"Telegram account {account_id} removed successfully")
            return result
        except Exception as e:
            logger.error(f"Failed to remove Telegram account {account_id}: {e}")
            raise
    
    async def remove_discord_account(self, account_id: int) -> bool:
        """Remove a Discord account."""
        try:
            result = await self.discord_client.remove_account(account_id)
            logger.info(f"Discord account {account_id} removed successfully")
            return result
        except Exception as e:
            logger.error(f"Failed to remove Discord account {account_id}: {e}")
            raise
    
    async def get_session_health(self) -> Dict[str, Any]:
        """Get health status of all sessions."""
        try:
            telegram_count = await self.telegram_client.get_session_count()
            discord_count = await self.discord_client.get_session_count()
            
            # Get database counts for comparison
            db: Session = next(get_db())
            try:
                db_telegram_count = db.query(TelegramAccount).filter(
                    TelegramAccount.status == "active"
                ).count()
                
                db_discord_count = db.query(DiscordAccount).filter(
                    DiscordAccount.status == "active"
                ).count()
                
                return {
                    "telegram": {
                        "active_sessions": telegram_count,
                        "database_accounts": db_telegram_count,
                        "health": "healthy" if telegram_count == db_telegram_count else "degraded"
                    },
                    "discord": {
                        "active_sessions": discord_count,
                        "database_accounts": db_discord_count,
                        "health": "healthy" if discord_count == db_discord_count else "degraded"
                    },
                    "overall_health": "healthy" if (
                        telegram_count == db_telegram_count and 
                        discord_count == db_discord_count
                    ) else "degraded"
                }
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get session health: {e}")
            return {
                "telegram": {"health": "unknown"},
                "discord": {"health": "unknown"},
                "overall_health": "unknown",
                "error": str(e)
            }
    
    async def restart_session(self, platform: str, account_id: int) -> bool:
        """Restart a specific session."""
        try:
            if platform.lower() == "telegram":
                # Remove and re-add the account
                db: Session = next(get_db())
                try:
                    account = db.query(TelegramAccount).filter(TelegramAccount.id == account_id).first()
                    if account and account.status == "active":
                        # Stop current session
                        if account_id in self.telegram_client.clients:
                            client = self.telegram_client.clients[account_id]
                            await client.stop()
                            del self.telegram_client.clients[account_id]
                        
                        # Restart session
                        await self.telegram_client._create_client(account)
                        return True
                finally:
                    db.close()
                    
            elif platform.lower() == "discord":
                # Remove and re-add the bot
                db: Session = next(get_db())
                try:
                    account = db.query(DiscordAccount).filter(DiscordAccount.id == account_id).first()
                    if account and account.status == "active":
                        # Stop current bot
                        if account_id in self.discord_client.bots:
                            bot = self.discord_client.bots[account_id]
                            await bot.close()
                            del self.discord_client.bots[account_id]
                            if account_id in self.discord_client.bot_tokens:
                                del self.discord_client.bot_tokens[account_id]
                        
                        # Restart bot
                        await self.discord_client._create_bot(account)
                        return True
                finally:
                    db.close()
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to restart {platform} session {account_id}: {e}")
            return False
    
    async def get_telegram_session_count(self) -> int:
        """Get the number of active Telegram sessions."""
        return await self.telegram_client.get_session_count()
    
    async def get_discord_session_count(self) -> int:
        """Get the number of active Discord sessions."""
        return await self.discord_client.get_session_count()
    
    async def send_telegram_message(self, account_id: int, chat_id: str, message: str) -> bool:
        """Send a message via Telegram."""
        return await self.telegram_client.send_message(account_id, chat_id, message)
    
    async def send_discord_message(self, account_id: int, channel_id: int, message: str) -> bool:
        """Send a message via Discord."""
        return await self.discord_client.send_message(account_id, channel_id, message)
    
    async def forward_telegram_message(self, account_id: int, from_chat_id: str, to_chat_id: str, message_id: int) -> bool:
        """Forward a message via Telegram."""
        return await self.telegram_client.forward_message(account_id, from_chat_id, to_chat_id, message_id)
    
    async def forward_discord_message(self, account_id: int, to_channel_id: int, message_content: str, attachments: List[Any] = None) -> bool:
        """Forward a message via Discord."""
        return await self.discord_client.forward_message(account_id, to_channel_id, message_content, attachments)
    
    async def get_discord_server_channels(self, account_id: int, server_id: int) -> List[Dict[str, Any]]:
        """Get channels for a Discord server."""
        return await self.discord_client.get_server_channels(account_id, server_id)
    
    async def cleanup(self):
        """Cleanup all session managers."""
        logger.info("Cleaning up Session Manager")
        
        try:
            await self.telegram_client.cleanup()
            await self.discord_client.cleanup()
            
            self._initialized = False
            logger.info("Session Manager cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during Session Manager cleanup: {e}")
