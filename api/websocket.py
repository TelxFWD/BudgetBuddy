"""
WebSocket API endpoints for real-time communication between frontend and backend.
Handles live updates for forwarding pairs, session health, and queue status.
"""

import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User, ForwardingPair, TelegramAccount, DiscordAccount
from fastapi import APIRouter

router = APIRouter(prefix="/ws", tags=["websocket"])
from utils.logger import setup_logger

logger = setup_logger()

class WebSocketManager:
    """Manages WebSocket connections and broadcasts."""
    
    def __init__(self):
        # Active connections: user_id -> set of websockets
        self.connections: Dict[int, Set[WebSocket]] = {}
        # Admin connections for system-wide broadcasts
        self.admin_connections: Set[WebSocket] = set()
        
    async def connect(self, websocket: WebSocket, user_id: int, is_admin: bool = False):
        """Accept websocket connection and add to manager."""
        await websocket.accept()
        
        if is_admin:
            self.admin_connections.add(websocket)
            logger.info(f"Admin WebSocket connected")
        else:
            if user_id not in self.connections:
                self.connections[user_id] = set()
            self.connections[user_id].add(websocket)
            logger.info(f"User {user_id} WebSocket connected")
        
        # Send initial connection success message
        await self.send_personal_message({
            "type": "connection_status",
            "status": "connected",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: int = None, is_admin: bool = False):
        """Remove websocket connection."""
        if is_admin and websocket in self.admin_connections:
            self.admin_connections.remove(websocket)
            logger.info("Admin WebSocket disconnected")
        elif user_id and user_id in self.connections:
            self.connections[user_id].discard(websocket)
            if not self.connections[user_id]:
                del self.connections[user_id]
            logger.info(f"User {user_id} WebSocket disconnected")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific websocket."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
    
    async def send_to_user(self, message: dict, user_id: int):
        """Send message to all connections of a specific user."""
        if user_id in self.connections:
            for websocket in self.connections[user_id].copy():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    self.connections[user_id].discard(websocket)
    
    async def broadcast_to_admins(self, message: dict):
        """Broadcast message to all admin connections."""
        for websocket in self.admin_connections.copy():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast to admin: {e}")
                self.admin_connections.discard(websocket)
    
    async def broadcast_system_message(self, message: dict):
        """Broadcast message to all connected users."""
        all_connections = []
        for user_connections in self.connections.values():
            all_connections.extend(user_connections)
        all_connections.extend(self.admin_connections)
        
        for websocket in all_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast system message: {e}")

# Global WebSocket manager instance
manager = WebSocketManager()

async def get_current_user_websocket(websocket: WebSocket, token: str) -> User:
    """Get current user from WebSocket connection with token validation."""
    # This is a simplified version - in production, implement proper JWT validation
    from api.auth import verify_token
    try:
        user_id = verify_token(token)
        # Get user from database
        from database.db import SessionLocal
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        return user
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=4001)
        return None

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str = None,
    db: Session = Depends(get_db)
):
    """Main WebSocket endpoint for user connections."""
    if not token:
        await websocket.close(code=4001)
        return
    
    # Authenticate user
    user = await get_current_user_websocket(websocket, token)
    if not user or user.id != user_id:
        await websocket.close(code=4001)
        return
    
    # Check if user is admin
    is_admin = user.is_admin if hasattr(user, 'is_admin') else False
    
    await manager.connect(websocket, user_id, is_admin)
    
    try:
        while True:
            # Listen for messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            await handle_websocket_message(message, user_id, websocket, db)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, is_admin)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id, is_admin)

async def handle_websocket_message(message: dict, user_id: int, websocket: WebSocket, db: Session):
    """Handle incoming WebSocket messages from clients."""
    message_type = message.get("type")
    
    if message_type == "ping":
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
    
    elif message_type == "get_status":
        # Send current status of user's forwarding pairs
        await send_user_status_update(user_id, db)
    
    elif message_type == "subscribe_pair":
        # Subscribe to updates for specific forwarding pair
        pair_id = message.get("pair_id")
        await send_pair_status_update(pair_id, user_id, db)
    
    elif message_type == "get_system_health":
        # Send system health information
        await send_system_health_update(user_id, db)

async def send_user_status_update(user_id: int, db: Session):
    """Send complete status update for user's forwarding pairs."""
    try:
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
                    "last_updated": pair.updated_at.isoformat() if pair.updated_at else None
                }
                for pair in pairs
            ],
            "telegram_accounts": [
                {
                    "id": acc.id,
                    "status": acc.status,
                    "phone_number": acc.phone_number,
                    "last_seen": acc.last_seen.isoformat() if acc.last_seen else None
                }
                for acc in telegram_accounts
            ],
            "discord_accounts": [
                {
                    "id": acc.id,
                    "status": acc.status,
                    "bot_name": acc.bot_name,
                    "last_seen": acc.last_seen.isoformat() if acc.last_seen else None
                }
                for acc in discord_accounts
            ],
            "timestamp": asyncio.get_event_loop().time()
        }
        
        await manager.send_to_user(status_data, user_id)
        
    except Exception as e:
        logger.error(f"Failed to send user status update: {e}")

async def send_pair_status_update(pair_id: int, user_id: int, db: Session):
    """Send status update for specific forwarding pair."""
    try:
        pair = db.query(ForwardingPair).filter(
            ForwardingPair.id == pair_id,
            ForwardingPair.user_id == user_id
        ).first()
        
        if pair:
            status_data = {
                "type": "pair_status_update",
                "pair": {
                    "id": pair.id,
                    "status": pair.status,
                    "platform_type": pair.platform_type,
                    "source_channel": pair.source_channel,
                    "destination_channel": pair.destination_channel,
                    "delay": pair.delay,
                    "silent_mode": pair.silent_mode,
                    "copy_mode": pair.copy_mode,
                    "last_updated": pair.updated_at.isoformat() if pair.updated_at else None,
                    "created_at": pair.created_at.isoformat() if pair.created_at else None
                },
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await manager.send_to_user(status_data, user_id)
        
    except Exception as e:
        logger.error(f"Failed to send pair status update: {e}")

async def send_system_health_update(user_id: int, db: Session):
    """Send system health status to user."""
    try:
        # Get queue status
        from services.queue_manager import get_queue_manager
        queue_manager = get_queue_manager()
        queue_stats = queue_manager.get_queue_stats() if queue_manager else {}
        
        # Get session manager status
        from services.session_manager import get_session_manager
        session_manager = get_session_manager()
        
        health_data = {
            "type": "system_health_update",
            "health": {
                "queue_status": queue_stats.get("status", "unknown"),
                "queue_backlog": queue_stats.get("backlog", 0),
                "active_sessions": len(session_manager.telegram_clients) + len(session_manager.discord_clients) if session_manager else 0,
                "database_status": "connected",
                "timestamp": asyncio.get_event_loop().time()
            }
        }
        
        await manager.send_to_user(health_data, user_id)
        
    except Exception as e:
        logger.error(f"Failed to send system health update: {e}")

# WebSocket event broadcasting functions for use by other services

async def broadcast_pair_status_change(pair_id: int, user_id: int, status: str, db: Session):
    """Broadcast forwarding pair status change to user."""
    message = {
        "type": "pair_status_changed",
        "pair_id": pair_id,
        "status": status,
        "timestamp": asyncio.get_event_loop().time()
    }
    await manager.send_to_user(message, user_id)

async def broadcast_session_status_change(user_id: int, platform: str, account_id: int, status: str):
    """Broadcast session status change to user."""
    message = {
        "type": "session_status_changed",
        "platform": platform,
        "account_id": account_id,
        "status": status,
        "timestamp": asyncio.get_event_loop().time()
    }
    await manager.send_to_user(message, user_id)

async def broadcast_queue_update(backlog_count: int, processing_rate: float):
    """Broadcast queue status update to all admin users."""
    message = {
        "type": "queue_update",
        "backlog": backlog_count,
        "processing_rate": processing_rate,
        "timestamp": asyncio.get_event_loop().time()
    }
    await manager.broadcast_to_admins(message)

async def broadcast_error_notification(user_id: int, error_type: str, error_message: str):
    """Broadcast error notification to specific user."""
    message = {
        "type": "error_notification",
        "error_type": error_type,
        "message": error_message,
        "timestamp": asyncio.get_event_loop().time()
    }
    await manager.send_to_user(message, user_id)

async def broadcast_system_announcement(announcement: str, priority: str = "normal"):
    """Broadcast system-wide announcement to all users."""
    message = {
        "type": "system_announcement",
        "announcement": announcement,
        "priority": priority,
        "timestamp": asyncio.get_event_loop().time()
    }
    await manager.broadcast_system_message(message)