"""
Real-time API endpoints using WebSocket for live dashboard updates.
Simplified implementation for status updates and notifications.
"""

import json
import asyncio
from typing import Dict, Set, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from database.db import get_db, SessionLocal
from database.models import User, ForwardingPair, TelegramAccount, DiscordAccount
from utils.logger import setup_logger

logger = setup_logger()
router = APIRouter(prefix="/realtime", tags=["realtime"])

class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.admin_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept and store new WebSocket connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    async def send_to_user(self, message: dict, user_id: int):
        """Send message to all connections for a user."""
        if user_id in self.active_connections:
            for websocket in list(self.active_connections[user_id]):
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send to user {user_id}: {e}")
                    self.active_connections[user_id].discard(websocket)

# Global connection manager
manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: int = Query(...)):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket, user_id)
    
    try:
        # Send initial status
        await send_user_status(user_id, websocket)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
            elif message.get("type") == "get_status":
                await send_user_status(user_id, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)

async def send_user_status(user_id: int, websocket: WebSocket):
    """Send current user status via WebSocket."""
    try:
        db = SessionLocal()
        
        # Get user's forwarding pairs
        pairs = db.query(ForwardingPair).filter(ForwardingPair.user_id == user_id).all()
        telegram_accounts = db.query(TelegramAccount).filter(TelegramAccount.user_id == user_id).all()
        discord_accounts = db.query(DiscordAccount).filter(DiscordAccount.user_id == user_id).all()
        
        status_data = {
            "type": "status_update",
            "forwarding_pairs": [
                {
                    "id": pair.id,
                    "status": pair.status,
                    "platform_type": pair.platform_type,
                    "source_channel": pair.source_channel,
                    "destination_channel": pair.destination_channel,
                    "delay": pair.delay,
                    "silent_mode": pair.silent_mode,
                    "copy_mode": pair.copy_mode
                }
                for pair in pairs
            ],
            "telegram_accounts": [
                {
                    "id": acc.id,
                    "status": acc.status,
                    "phone_number": acc.phone_number
                }
                for acc in telegram_accounts
            ],
            "discord_accounts": [
                {
                    "id": acc.id,
                    "status": acc.status,
                    "bot_name": acc.bot_name
                }
                for acc in discord_accounts
            ]
        }
        
        await manager.send_personal_message(status_data, websocket)
        db.close()
        
    except Exception as e:
        logger.error(f"Failed to send user status: {e}")

# Helper functions for broadcasting updates
async def broadcast_pair_update(user_id: int, pair_id: int, status: str):
    """Broadcast forwarding pair status update."""
    message = {
        "type": "pair_updated",
        "pair_id": pair_id,
        "status": status
    }
    await manager.send_to_user(message, user_id)

async def broadcast_session_update(user_id: int, platform: str, account_id: int, status: str):
    """Broadcast session status update."""
    message = {
        "type": "session_updated",
        "platform": platform,
        "account_id": account_id,
        "status": status
    }
    await manager.send_to_user(message, user_id)

async def broadcast_notification(user_id: int, notification_type: str, message: str):
    """Broadcast notification to user."""
    notification = {
        "type": "notification",
        "notification_type": notification_type,
        "message": message
    }
    await manager.send_to_user(notification, user_id)