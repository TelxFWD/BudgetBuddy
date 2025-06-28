"""
Discord client for multi-server bot management using discord.py.
Handles bot authentication, server management, and message forwarding.
"""

import os
import asyncio
import logging
from typing import Dict, List, Optional, Any
import discord
from discord.ext import commands
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import DiscordAccount, User, ErrorLog
from utils.logger import setup_logger

logger = setup_logger()

class DiscordClient:
    """Multi-server Discord bot client manager."""
    
    def __init__(self):
        self.bots: Dict[int, commands.Bot] = {}
        self.bot_tokens: Dict[int, str] = {}
        
        # Discord bot intents
        self.intents = discord.Intents.default()
        self.intents.message_content = True
        self.intents.guild_messages = True
        self.intents.dm_messages = True
    
    async def initialize(self):
        """Initialize the Discord client manager."""
        logger.info("Initializing Discord client manager")
        
        # Load existing bot accounts from database
        await self._load_existing_bots()
        
        # Start bot health checker
        asyncio.create_task(self._bot_health_checker())
        
        logger.info(f"Discord client manager initialized with {len(self.bots)} bots")
    
    async def _load_existing_bots(self):
        """Load existing Discord bot accounts from database."""
        db: Session = next(get_db())
        
        try:
            # Get all active Discord accounts
            accounts = db.query(DiscordAccount).filter(
                DiscordAccount.status == "active"
            ).all()
            
            for account in accounts:
                try:
                    await self._create_bot(account)
                except Exception as e:
                    logger.error(f"Failed to load bot for account {account.id}: {e}")
                    await self._log_error(account.user_id, account.id, "bot_load_error", str(e))
        
        finally:
            db.close()
    
    async def _create_bot(self, account: DiscordAccount) -> commands.Bot:
        """Create and start a Discord bot for an account."""
        bot = commands.Bot(
            command_prefix='!',
            intents=self.intents,
            help_command=None
        )
        
        # Add event handlers
        @bot.event
        async def on_ready():
            logger.info(f"Discord bot {bot.user} (ID: {bot.user.id}) is ready for account {account.id}")
        
        @bot.event
        async def on_error(event, *args, **kwargs):
            logger.error(f"Discord bot error in {event}: {args}, {kwargs}")
            await self._log_error(account.user_id, account.id, "bot_event_error", f"Error in {event}")
        
        @bot.event
        async def on_message(message):
            # Handle incoming messages for forwarding
            if message.author == bot.user:
                return
            
            # Process message for forwarding (will be handled by queue system)
            await self._process_incoming_message(account.id, message)
        
        try:
            # Start the bot
            await bot.start(account.discord_token)
            
            self.bots[account.id] = bot
            self.bot_tokens[account.id] = account.discord_token
            
            # Update account status
            db: Session = next(get_db())
            try:
                db_account = db.query(DiscordAccount).filter(DiscordAccount.id == account.id).first()
                if db_account:
                    db_account.status = "active"
                    db.commit()
            finally:
                db.close()
            
            logger.info(f"Discord bot started for account {account.id}")
            return bot
            
        except Exception as e:
            logger.error(f"Failed to start Discord bot for account {account.id}: {e}")
            await self._log_error(account.user_id, account.id, "bot_start_error", str(e))
            raise
    
    async def add_account(self, user_id: int, discord_token: str, server_ids: List[str] = None) -> Dict[str, Any]:
        """Add a new Discord bot account."""
        db: Session = next(get_db())
        
        try:
            # Check if user exists and has available slots
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("User not found")
            
            # Check account limits based on plan
            existing_accounts = db.query(DiscordAccount).filter(
                DiscordAccount.user_id == user_id,
                DiscordAccount.status == "active"
            ).count()
            
            if existing_accounts >= user.max_discord_accounts:
                raise ValueError("Maximum Discord accounts limit reached for your plan")
            
            # Validate Discord token
            test_bot = commands.Bot(command_prefix='!', intents=self.intents)
            
            try:
                await test_bot.start(discord_token)
                bot_user = test_bot.user
                await test_bot.close()
                
                # Create account record
                account = DiscordAccount(
                    user_id=user_id,
                    discord_token=discord_token,
                    discord_servers=server_ids or [],
                    status="active"
                )
                
                db.add(account)
                db.commit()
                db.refresh(account)
                
                # Start the bot
                await self._create_bot(account)
                
                return {
                    "account_id": account.id,
                    "bot_id": bot_user.id,
                    "bot_username": bot_user.name,
                    "message": "Discord bot added successfully"
                }
                
            except discord.LoginFailure:
                raise ValueError("Invalid Discord bot token")
            except Exception as e:
                raise ValueError(f"Failed to validate Discord bot: {str(e)}")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to add Discord account: {e}")
            await self._log_error(user_id, None, "account_add_error", str(e))
            raise
        
        finally:
            db.close()
    
    async def remove_account(self, account_id: int) -> bool:
        """Remove a Discord bot account."""
        db: Session = next(get_db())
        
        try:
            account = db.query(DiscordAccount).filter(DiscordAccount.id == account_id).first()
            if not account:
                raise ValueError("Account not found")
            
            # Stop and remove bot if active
            if account_id in self.bots:
                bot = self.bots[account_id]
                await bot.close()
                del self.bots[account_id]
                del self.bot_tokens[account_id]
            
            # Mark account as inactive
            account.status = "inactive"
            db.commit()
            
            logger.info(f"Discord account {account_id} removed successfully")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to remove Discord account {account_id}: {e}")
            await self._log_error(account.user_id if account else None, account_id, "account_remove_error", str(e))
            raise
        
        finally:
            db.close()
    
    async def get_account_info(self, account_id: int) -> Optional[Dict[str, Any]]:
        """Get information about a Discord bot account."""
        if account_id not in self.bots:
            return None
        
        try:
            bot = self.bots[account_id]
            
            # Get server information
            servers = []
            for guild in bot.guilds:
                servers.append({
                    "id": guild.id,
                    "name": guild.name,
                    "member_count": guild.member_count,
                    "owner": guild.owner.name if guild.owner else None
                })
            
            return {
                "bot_id": bot.user.id,
                "bot_username": bot.user.name,
                "bot_discriminator": bot.user.discriminator,
                "server_count": len(bot.guilds),
                "servers": servers,
                "latency": bot.latency
            }
            
        except Exception as e:
            logger.error(f"Failed to get account info for {account_id}: {e}")
            return None
    
    async def send_message(self, account_id: int, channel_id: int, message: str, embed: discord.Embed = None) -> bool:
        """Send a message using a specific Discord bot."""
        if account_id not in self.bots:
            logger.error(f"Discord bot not found for account {account_id}")
            return False
        
        try:
            bot = self.bots[account_id]
            channel = bot.get_channel(channel_id)
            
            if not channel:
                logger.error(f"Channel {channel_id} not found for bot {account_id}")
                return False
            
            await channel.send(content=message, embed=embed)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message from bot {account_id}: {e}")
            await self._log_error(None, account_id, "message_send_error", str(e))
            return False
    
    async def forward_message(self, account_id: int, to_channel_id: int, message_content: str, attachments: List[Any] = None) -> bool:
        """Forward a message to Discord using a specific bot."""
        if account_id not in self.bots:
            logger.error(f"Discord bot not found for account {account_id}")
            return False
        
        try:
            bot = self.bots[account_id]
            channel = bot.get_channel(to_channel_id)
            
            if not channel:
                logger.error(f"Channel {to_channel_id} not found for bot {account_id}")
                return False
            
            # Send message with attachments if any
            files = []
            if attachments:
                for attachment in attachments:
                    files.append(discord.File(attachment))
            
            await channel.send(content=message_content, files=files)
            return True
            
        except Exception as e:
            logger.error(f"Failed to forward message from bot {account_id}: {e}")
            await self._log_error(None, account_id, "message_forward_error", str(e))
            return False
    
    async def _process_incoming_message(self, account_id: int, message: discord.Message):
        """Process incoming Discord message for forwarding."""
        # This will be handled by the queue system
        # For now, just log the message
        logger.debug(f"Received message in bot {account_id}: {message.content}")
    
    async def get_server_channels(self, account_id: int, server_id: int) -> List[Dict[str, Any]]:
        """Get channels for a specific server."""
        if account_id not in self.bots:
            return []
        
        try:
            bot = self.bots[account_id]
            guild = bot.get_guild(server_id)
            
            if not guild:
                return []
            
            channels = []
            for channel in guild.channels:
                if isinstance(channel, discord.TextChannel):
                    channels.append({
                        "id": channel.id,
                        "name": channel.name,
                        "type": "text",
                        "category": channel.category.name if channel.category else None
                    })
                elif isinstance(channel, discord.VoiceChannel):
                    channels.append({
                        "id": channel.id,
                        "name": channel.name,
                        "type": "voice",
                        "category": channel.category.name if channel.category else None
                    })
            
            return channels
            
        except Exception as e:
            logger.error(f"Failed to get channels for server {server_id}: {e}")
            return []
    
    async def _bot_health_checker(self):
        """Periodically check bot health and reconnect if needed."""
        check_interval = int(os.getenv("SESSION_CHECK_INTERVAL", 300))  # 5 minutes
        
        while True:
            try:
                await asyncio.sleep(check_interval)
                
                for account_id, bot in list(self.bots.items()):
                    try:
                        # Check if bot is connected
                        if bot.is_closed():
                            logger.warning(f"Discord bot {account_id} is disconnected, attempting reconnect")
                            
                            # Get account from database
                            db: Session = next(get_db())
                            try:
                                account = db.query(DiscordAccount).filter(DiscordAccount.id == account_id).first()
                                if account:
                                    await self._create_bot(account)
                            finally:
                                db.close()
                        
                        # Test with a simple API call
                        else:
                            await bot.fetch_user(bot.user.id)
                            
                    except Exception as e:
                        logger.error(f"Health check failed for Discord bot {account_id}: {e}")
                        
                        # Attempt to reconnect
                        try:
                            await bot.close()
                            
                            # Get account from database and recreate bot
                            db: Session = next(get_db())
                            try:
                                account = db.query(DiscordAccount).filter(DiscordAccount.id == account_id).first()
                                if account:
                                    await self._create_bot(account)
                                    logger.info(f"Successfully reconnected Discord bot {account_id}")
                            finally:
                                db.close()
                                
                        except Exception as reconnect_error:
                            logger.error(f"Failed to reconnect Discord bot {account_id}: {reconnect_error}")
                            await self._log_error(None, account_id, "bot_reconnect_error", str(reconnect_error))
                            
                            # Remove bot from active bots
                            if account_id in self.bots:
                                del self.bots[account_id]
                            if account_id in self.bot_tokens:
                                del self.bot_tokens[account_id]
                            
                            # Update database status
                            db: Session = next(get_db())
                            try:
                                account = db.query(DiscordAccount).filter(DiscordAccount.id == account_id).first()
                                if account:
                                    account.status = "disconnected"
                                    db.commit()
                            finally:
                                db.close()
                
            except Exception as e:
                logger.error(f"Bot health checker error: {e}")
    
    async def _log_error(self, user_id: Optional[int], account_id: Optional[int], error_type: str, error_message: str):
        """Log error to database."""
        db: Session = next(get_db())
        
        try:
            error_log = ErrorLog(
                user_id=user_id,
                discord_account_id=account_id,
                error_type=error_type,
                error_message=error_message
            )
            
            db.add(error_log)
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to log error to database: {e}")
        
        finally:
            db.close()
    
    async def get_session_count(self) -> int:
        """Get the number of active Discord bot sessions."""
        return len(self.bots)
    
    async def cleanup(self):
        """Cleanup all Discord bots."""
        logger.info("Cleaning up Discord bots")
        
        for account_id, bot in self.bots.items():
            try:
                await bot.close()
            except Exception as e:
                logger.error(f"Error stopping Discord bot {account_id}: {e}")
        
        self.bots.clear()
        self.bot_tokens.clear()
        logger.info("Discord bots cleanup completed")
