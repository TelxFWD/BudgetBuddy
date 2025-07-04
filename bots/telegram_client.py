"""
Telegram client for multi-account session management using Pyrogram.
Handles authentication, session persistence, and message forwarding.
"""

import os
import asyncio
import logging
from typing import Dict, List, Optional, Any
from pyrogram import Client, errors
from pyrogram.types import Message
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import TelegramAccount, User, ErrorLog
from utils.logger import setup_logger

logger = setup_logger()

class TelegramClient:
    """Multi-account Telegram client manager using Pyrogram."""
    
    def __init__(self):
        self.clients: Dict[int, Client] = {}
        self.api_id = os.getenv("TELEGRAM_API_ID")
        self.api_hash = os.getenv("TELEGRAM_API_HASH")
        self.session_dir = "sessions/telegram"
        
        self.credentials_available = bool(self.api_id and self.api_hash)
        
        if self.credentials_available:
            try:
                self.api_id = int(self.api_id)
            except ValueError:
                logger.error("TELEGRAM_API_ID must be a valid integer")
                self.credentials_available = False
        
        # Create session directory if it doesn't exist
        os.makedirs(self.session_dir, exist_ok=True)
    
    async def initialize(self):
        """Initialize the Telegram client manager."""
        logger.info("Initializing Telegram client manager")
        
        # Load existing sessions from database
        await self._load_existing_sessions()
        
        # Start session health checker
        asyncio.create_task(self._session_health_checker())
        
        logger.info(f"Telegram client manager initialized with {len(self.clients)} sessions")
    
    async def _load_existing_sessions(self):
        """Load existing Telegram sessions from database."""
        db: Session = next(get_db())
        
        try:
            # Get all active Telegram accounts
            accounts = db.query(TelegramAccount).filter(
                TelegramAccount.status == "active"
            ).all()
            
            for account in accounts:
                try:
                    await self._create_client(account)
                except Exception as e:
                    logger.error(f"Failed to load session for account {account.id}: {e}")
                    await self._log_error(account.user_id, account.id, "session_load_error", str(e))
        
        finally:
            db.close()
    
    async def _create_client(self, account: TelegramAccount) -> Client:
        """Create and start a Pyrogram client for a Telegram account."""
        session_file = os.path.join(self.session_dir, f"session_{account.id}")
        
        client = Client(
            name=f"client_{account.id}",
            api_id=self.api_id,
            api_hash=self.api_hash,
            session_string=account.session_data,
            phone_number=account.phone_number
        )
        
        try:
            await client.start()
            self.clients[account.id] = client
            
            # Update account status
            db: Session = next(get_db())
            try:
                db_account = db.query(TelegramAccount).filter(TelegramAccount.id == account.id).first()
                if db_account:
                    db_account.status = "active"
                    db.commit()
            finally:
                db.close()
            
            logger.info(f"Telegram client started for account {account.id}")
            return client
            
        except Exception as e:
            logger.error(f"Failed to start Telegram client for account {account.id}: {e}")
            await self._log_error(account.user_id, account.id, "client_start_error", str(e))
            raise
    
    async def add_account(self, user_id: int, phone_number: str) -> Dict[str, Any]:
        """Add a new Telegram account with OTP verification."""
        db: Session = next(get_db())
        
        try:
            # Check if user exists and has available slots
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("User not found")
            
            # Check account limits based on plan
            existing_accounts = db.query(TelegramAccount).filter(
                TelegramAccount.user_id == user_id,
                TelegramAccount.status == "active"
            ).count()
            
            if existing_accounts >= user.max_telegram_accounts:
                raise ValueError("Maximum Telegram accounts limit reached for your plan")
            
            # Create temporary client for authentication
            temp_client = Client(
                name=f"temp_{phone_number}",
                api_id=self.api_id,
                api_hash=self.api_hash,
                phone_number=phone_number
            )
            
            # Send OTP
            await temp_client.connect()
            sent_code = await temp_client.send_code(phone_number)
            await temp_client.disconnect()
            
            # Create pending account record
            account = TelegramAccount(
                user_id=user_id,
                phone_number=phone_number,
                status="pending_verification",
                telegram_user_id=None,
                session_data=None
            )
            
            db.add(account)
            db.commit()
            db.refresh(account)
            
            return {
                "account_id": account.id,
                "phone_hash": sent_code.phone_code_hash,
                "message": "OTP sent successfully"
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to add Telegram account: {e}")
            await self._log_error(user_id, None, "account_add_error", str(e))
            raise
        
        finally:
            db.close()
    
    async def verify_account(self, account_id: int, otp_code: str, phone_hash: str) -> bool:
        """Verify Telegram account with OTP code."""
        db: Session = next(get_db())
        
        try:
            account = db.query(TelegramAccount).filter(TelegramAccount.id == account_id).first()
            if not account or account.status != "pending_verification":
                raise ValueError("Account not found or not in pending verification state")
            
            # Create client for verification
            client = Client(
                name=f"verify_{account_id}",
                api_id=self.api_id,
                api_hash=self.api_hash,
                phone_number=account.phone_number
            )
            
            await client.connect()
            await client.sign_in(account.phone_number, phone_hash, otp_code)
            
            # Get session string and user info
            session_string = await client.export_session_string()
            me = await client.get_me()
            
            await client.disconnect()
            
            # Update account with session data
            account.session_data = session_string
            account.telegram_user_id = me.id
            account.status = "active"
            
            db.commit()
            
            # Start the client
            await self._create_client(account)
            
            logger.info(f"Telegram account {account_id} verified and activated")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to verify Telegram account {account_id}: {e}")
            await self._log_error(account.user_id if account else None, account_id, "account_verify_error", str(e))
            raise
        
        finally:
            db.close()
    
    async def remove_account(self, account_id: int) -> bool:
        """Remove a Telegram account and clean up its session."""
        db: Session = next(get_db())
        
        try:
            account = db.query(TelegramAccount).filter(TelegramAccount.id == account_id).first()
            if not account:
                raise ValueError("Account not found")
            
            # Stop and remove client if active
            if account_id in self.clients:
                client = self.clients[account_id]
                await client.stop()
                del self.clients[account_id]
            
            # Remove session file
            session_file = os.path.join(self.session_dir, f"session_{account_id}")
            if os.path.exists(session_file):
                os.remove(session_file)
            
            # Mark account as inactive
            account.status = "inactive"
            db.commit()
            
            logger.info(f"Telegram account {account_id} removed successfully")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to remove Telegram account {account_id}: {e}")
            await self._log_error(account.user_id if account else None, account_id, "account_remove_error", str(e))
            raise
        
        finally:
            db.close()
    
    async def get_account_info(self, account_id: int) -> Optional[Dict[str, Any]]:
        """Get information about a Telegram account."""
        if account_id not in self.clients:
            return None
        
        try:
            client = self.clients[account_id]
            me = await client.get_me()
            
            return {
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "phone_number": me.phone_number,
                "is_verified": me.is_verified,
                "is_premium": me.is_premium
            }
            
        except Exception as e:
            logger.error(f"Failed to get account info for {account_id}: {e}")
            return None
    
    async def send_message(self, account_id: int, chat_id: str, message: str) -> bool:
        """Send a message using a specific Telegram account."""
        if account_id not in self.clients:
            logger.error(f"Telegram client not found for account {account_id}")
            return False
        
        try:
            client = self.clients[account_id]
            await client.send_message(chat_id, message)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message from account {account_id}: {e}")
            await self._log_error(None, account_id, "message_send_error", str(e))
            return False
    
    async def forward_message(self, account_id: int, from_chat_id: str, to_chat_id: str, message_id: int) -> bool:
        """Forward a message using a specific Telegram account."""
        if account_id not in self.clients:
            logger.error(f"Telegram client not found for account {account_id}")
            return False
        
        try:
            client = self.clients[account_id]
            await client.forward_messages(to_chat_id, from_chat_id, message_id)
            return True
            
        except Exception as e:
            logger.error(f"Failed to forward message from account {account_id}: {e}")
            await self._log_error(None, account_id, "message_forward_error", str(e))
            return False
    
    async def _session_health_checker(self):
        """Periodically check session health and reconnect if needed."""
        check_interval = int(os.getenv("SESSION_CHECK_INTERVAL", 300))  # 5 minutes
        
        while True:
            try:
                await asyncio.sleep(check_interval)
                
                for account_id, client in list(self.clients.items()):
                    try:
                        # Check if client is connected
                        if not client.is_connected:
                            logger.warning(f"Telegram client {account_id} is disconnected, attempting reconnect")
                            await client.start()
                            
                        # Test with a simple API call
                        await client.get_me()
                        
                    except Exception as e:
                        logger.error(f"Health check failed for Telegram account {account_id}: {e}")
                        
                        # Attempt to reconnect
                        try:
                            await client.stop()
                            await client.start()
                            logger.info(f"Successfully reconnected Telegram account {account_id}")
                            
                        except Exception as reconnect_error:
                            logger.error(f"Failed to reconnect Telegram account {account_id}: {reconnect_error}")
                            await self._log_error(None, account_id, "session_reconnect_error", str(reconnect_error))
                            
                            # Remove client from active clients
                            del self.clients[account_id]
                            
                            # Update database status
                            db: Session = next(get_db())
                            try:
                                account = db.query(TelegramAccount).filter(TelegramAccount.id == account_id).first()
                                if account:
                                    account.status = "disconnected"
                                    db.commit()
                            finally:
                                db.close()
                
            except Exception as e:
                logger.error(f"Session health checker error: {e}")
    
    async def _log_error(self, user_id: Optional[int], account_id: Optional[int], error_type: str, error_message: str):
        """Log error to database."""
        db: Session = next(get_db())
        
        try:
            error_log = ErrorLog(
                user_id=user_id,
                telegram_account_id=account_id,
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
        """Get the number of active Telegram sessions."""
        return len(self.clients)
    
    async def cleanup(self):
        """Cleanup all Telegram clients."""
        logger.info("Cleaning up Telegram clients")
        
        for account_id, client in self.clients.items():
            try:
                await client.stop()
            except Exception as e:
                logger.error(f"Error stopping Telegram client {account_id}: {e}")
        
        self.clients.clear()
        logger.info("Telegram clients cleanup completed")
