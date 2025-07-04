import asyncio
import logging
import os
from typing import Dict, Optional, Any
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError, PhoneCodeExpiredError
from database.models import TelegramAccount, ForwardingPair
from database.db import SessionLocal
from utils.logger import logger

class SessionManager:
    def __init__(self):
        self.clients: Dict[int, TelegramClient] = {}
        self.active_sessions: Dict[int, dict] = {}
        self.forwarding_handlers: Dict[int, Any] = {}

    async def initialize_session(self, account_id: int) -> Optional[TelegramClient]:
        """Initialize Telegram session for an account."""
        logger.info(f"Initializing session for account {account_id}")

        try:
            db = SessionLocal()
            account = db.query(TelegramAccount).filter(TelegramAccount.id == account_id).first()

            if not account:
                logger.error(f"Account {account_id} not found")
                return None

            # Create client
            client = TelegramClient(
                f"sessions/telegram/account_{account_id}",
                api_id=int(os.getenv("TELEGRAM_API_ID", "0")),
                api_hash=os.getenv("TELEGRAM_API_HASH", "")
            )

            await client.connect()

            if not await client.is_user_authorized():
                logger.error(f"Account {account_id} not authorized")
                return None

            self.clients[account_id] = client
            logger.info(f"✅ Session initialized for account {account_id}")

            return client

        except Exception as e:
            logger.error(f"Failed to initialize session for account {account_id}: {str(e)}")
            return None
        finally:
            db.close()

    async def get_client(self, account_id: int) -> Optional[TelegramClient]:
        """Get or initialize Telegram client."""
        if account_id not in self.clients:
            return await self.initialize_session(account_id)
        return self.clients[account_id]

    async def start_forwarding_handlers(self):
        """Start event handlers for all active forwarding pairs."""
        logger.info("🚀 Starting forwarding handlers...")

        try:
            db = SessionLocal()
            active_pairs = db.query(ForwardingPair).filter(
                ForwardingPair.is_active == True,
                ForwardingPair.platform_type.like("%telegram%")
            ).all()

            logger.info(f"Found {len(active_pairs)} active Telegram forwarding pairs")

            for pair in active_pairs:
                await self.setup_forwarding_handler(pair)

        except Exception as e:
            logger.error(f"Failed to start forwarding handlers: {str(e)}")
        finally:
            db.close()

    async def setup_forwarding_handler(self, pair: ForwardingPair):
        """Set up message forwarding handler for a specific pair."""
        logger.info(f"⏩ Setting up forwarding handler for pair {pair.id}: {pair.source_channel} -> {pair.destination_channel}")

        try:
            # Get source client
            source_client = await self.get_client(pair.telegram_account_id)
            if not source_client:
                logger.error(f"⚠️ Cannot get source client for pair {pair.id}")
                return

            # Convert channel IDs to integers (handle negative IDs)
            try:
                source_chat_id = int(pair.source_channel)
                dest_chat_id = int(pair.destination_channel)
            except ValueError:
                logger.error(f"⚠️ Invalid channel IDs for pair {pair.id}")
                return

            # Create event handler function
            async def forward_handler(event):
                logger.info(f"⏩ New message received in source channel {pair.source_channel} for pair {pair.id}")
                await self.handle_message_forwarding(pair, event, source_client)

            # Add event handler for new messages
            source_client.add_event_handler(
                forward_handler,
                events.NewMessage(chats=[source_chat_id])
            )

            # Store handler reference for cleanup
            self.forwarding_handlers[pair.id] = forward_handler

            logger.info(f"✅ Forwarding handler set up for pair {pair.id}")

        except Exception as e:
            logger.error(f"Failed to setup forwarding handler for pair {pair.id}: {str(e)}")

    async def handle_message_forwarding(self, pair: ForwardingPair, event, source_client):
        """Handle the actual message forwarding."""
        logger.info(f"⏩ Starting forwarding for pair {pair.id}")

        try:
            # Get destination client (for now, using same client)
            dest_client = source_client  # For Telegram to Telegram, we can use the same client

            # Apply delay if needed
            if pair.delay > 0:
                logger.info(f"⏳ Applying {pair.delay}s delay for pair {pair.id}")
                await asyncio.sleep(pair.delay)

            # Convert destination channel ID
            dest_chat_id = int(pair.destination_channel)

            # Forward the message
            result = await dest_client.forward_messages(
                entity=dest_chat_id,
                messages=event.message,
                from_peer=int(pair.source_channel)
            )

            logger.info(f"✅ Forwarded message {event.message.id} from {pair.source_channel} to {pair.destination_channel}")

            # Update pair statistics (optional)
            try:
                db = SessionLocal()
                db_pair = db.query(ForwardingPair).filter(ForwardingPair.id == pair.id).first()
                if db_pair:
                    # You can add message count tracking here if needed
                    pass
                db.commit()
            except Exception as e:
                logger.error(f"Failed to update pair statistics: {str(e)}")
            finally:
                db.close()

        except Exception as e:
            logger.error(f"⚠️ Failed to forward message for pair {pair.id}: {str(e)}")

    async def add_new_pair_handler(self, pair: ForwardingPair):
        """Add handler for a newly created forwarding pair."""
        logger.info(f"🔄 Adding handler for new pair {pair.id}")
        await self.setup_forwarding_handler(pair)

    async def remove_pair_handler(self, pair_id: int):
        """Remove handler for a deleted forwarding pair."""
        if pair_id in self.forwarding_handlers:
            del self.forwarding_handlers[pair_id]
            logger.info(f"🗑️ Removed handler for pair {pair_id}")

    async def start_all_clients(self):
        """Start all Telegram clients and begin polling."""
        logger.info("🚀 Starting all Telegram clients...")

        try:
            # Start forwarding handlers
            await self.start_forwarding_handlers()

            # Start polling for all clients
            tasks = []
            for client in self.clients.values():
                tasks.append(client.run_until_disconnected())

            if tasks:
                logger.info(f"✅ Started {len(tasks)} Telegram clients")
                await asyncio.gather(*tasks)
            else:
                logger.warning("⚠️ No Telegram clients to start")

        except Exception as e:
            logger.error(f"Failed to start Telegram clients: {str(e)}")

# Global session manager instance
session_manager = SessionManager()