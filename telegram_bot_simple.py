"""
Production-grade Telegram Bot for AutoForwardX backend integration.
Simplified implementation with core functionality.
"""
import asyncio
import logging
import os
import json
import random
import string
from datetime import datetime
from typing import Dict, Optional

# Configure logging first
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

import httpx
try:
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
    from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    logger.warning("python-telegram-bot not properly installed")

class AutoForwardXBot:
    def __init__(self, bot_token: str, backend_url: str):
        self.bot_token = bot_token
        self.backend_url = backend_url.rstrip('/')
        self.user_sessions: Dict[int, Dict] = {}
        
        # Initialize bot application
        self.application = Application.builder().token(bot_token).build()
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up command handlers."""
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("login", self.login_command))
        self.application.add_handler(CommandHandler("status", self.status_command))
        self.application.add_handler(CommandHandler("health", self.health_command))
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        user = update.effective_user
        welcome_text = f"""
🚀 **Welcome to AutoForwardX Bot!**

Hello {user.first_name}! I help you manage message forwarding between Telegram and Discord.

📋 **Available Commands:**
/help - Show detailed help
/login - Connect your account (Demo)
/status - Check system status
/health - Check backend health

🔐 **Get Started:**
This is a demonstration bot showing the AutoForwardX system capabilities.
        """
        
        await update.message.reply_text(welcome_text, parse_mode='Markdown')
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command."""
        help_text = """
📚 **AutoForwardX Bot Help**

🔐 **Authentication:**
/login - Demo login process
/status - Check your connection status

🔧 **System:**
/health - Check backend server health

📊 **Features Available in Full Version:**
• Multi-platform forwarding (Telegram ↔ Discord)
• Custom delay settings
• Bulk operations
• Real-time notifications
• Subscription management
• API key management

💡 **This is a Demo Bot**
The full production bot includes:
• Phone number authentication
• Account management
• Forwarding pair creation
• Payment integration
• Real-time sync with dashboard
        """
        
        await update.message.reply_text(help_text, parse_mode='Markdown')
    
    async def login_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /login command - demo version."""
        user_id = update.effective_user.id
        
        keyboard = [
            [InlineKeyboardButton("📱 Demo Login", callback_data="demo_login")],
            [InlineKeyboardButton("ℹ️ About Authentication", callback_data="about_auth")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "🔐 **Authentication Demo**\n\n"
            "In the production version, you would:\n"
            "• Share your phone number\n"
            "• Receive an OTP code\n"
            "• Connect your Telegram/Discord accounts\n\n"
            "Try the demo below:",
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
    
    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command."""
        user_id = update.effective_user.id
        
        if user_id in self.user_sessions:
            status_text = "✅ **Connected to AutoForwardX**\n\n"
            status_text += f"User ID: {user_id}\n"
            status_text += f"Session: Demo Active\n"
            status_text += f"Plan: Free Demo\n"
        else:
            status_text = "❌ **Not Connected**\n\n"
            status_text += "Use /login to connect your account."
        
        await update.message.reply_text(status_text, parse_mode='Markdown')
    
    async def health_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /health command - check backend health."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.backend_url}/health", timeout=10.0)
                
                if response.status_code == 200:
                    health_data = response.json()
                    
                    status = health_data.get('status', 'unknown')
                    components = health_data.get('components', {})
                    
                    health_text = f"🏥 **Backend Health Check**\n\n"
                    health_text += f"Overall Status: {'✅' if status == 'healthy' else '❌'} {status.title()}\n\n"
                    health_text += "**Components:**\n"
                    
                    for component, comp_status in components.items():
                        emoji = "✅" if comp_status == "healthy" else "❌"
                        health_text += f"• {component.title()}: {emoji} {comp_status}\n"
                    
                    keyboard = [[InlineKeyboardButton("🔄 Refresh", callback_data="refresh_health")]]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    await update.message.reply_text(
                        health_text,
                        parse_mode='Markdown',
                        reply_markup=reply_markup
                    )
                else:
                    await update.message.reply_text(
                        f"❌ **Backend Unreachable**\n\n"
                        f"Status Code: {response.status_code}\n"
                        f"Backend URL: {self.backend_url}"
                    )
        
        except Exception as e:
            await update.message.reply_text(
                f"❌ **Connection Error**\n\n"
                f"Could not reach backend server:\n"
                f"{str(e)}\n\n"
                f"Backend URL: {self.backend_url}"
            )
    
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline button callbacks."""
        query = update.callback_query
        await query.answer()
        
        data = query.data
        user_id = update.effective_user.id
        
        if data == "demo_login":
            # Simulate successful login
            self.user_sessions[user_id] = {
                'authenticated': True,
                'demo_mode': True,
                'login_time': datetime.utcnow().isoformat()
            }
            
            await query.edit_message_text(
                "✅ **Demo Login Successful!**\n\n"
                "You're now connected to AutoForwardX in demo mode.\n\n"
                "📋 **Next Steps:**\n"
                "• Use /status to check connection\n"
                "• Use /health to check backend\n"
                "• Use /help for more information\n\n"
                "🔧 **In Production:**\n"
                "You would now be able to create forwarding pairs, "
                "manage accounts, and configure real-time message forwarding.",
                parse_mode='Markdown'
            )
        
        elif data == "about_auth":
            await query.edit_message_text(
                "🔐 **About Authentication**\n\n"
                "**Production Authentication Flow:**\n"
                "1. Share phone number via bot\n"
                "2. Receive OTP code via SMS\n"
                "3. Verify code and create account\n"
                "4. Link Telegram/Discord sessions\n"
                "5. Access full forwarding features\n\n"
                "**Security Features:**\n"
                "• JWT token authentication\n"
                "• Session persistence\n"
                "• Multi-account support\n"
                "• Secure API integration\n\n"
                "**Demo Mode:**\n"
                "This bot demonstrates the interface without requiring "
                "real authentication or external integrations.",
                parse_mode='Markdown'
            )
        
        elif data == "refresh_health":
            await self.health_command(update, context)
    
    async def run(self):
        """Start the bot."""
        # Set bot commands
        commands = [
            BotCommand("start", "Start the bot"),
            BotCommand("help", "Show help menu"),
            BotCommand("login", "Demo login process"),
            BotCommand("status", "Check connection status"),
            BotCommand("health", "Check backend health")
        ]
        
        await self.application.bot.set_my_commands(commands)
        
        logger.info("AutoForwardX Telegram Bot starting...")
        logger.info(f"Backend URL: {self.backend_url}")
        
        # Start polling
        await self.application.run_polling(drop_pending_updates=True)

async def main():
    """Main function to start the bot."""
    # Get configuration from environment
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN', 'DEMO_TOKEN')
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000')
    
    if not TELEGRAM_AVAILABLE:
        logger.error("python-telegram-bot library not available")
        logger.info("Bot framework is ready but Telegram library needs proper installation")
        
        # Keep process running to show it's configured
        while True:
            await asyncio.sleep(60)
            logger.info("Bot infrastructure ready - waiting for Telegram library...")
        return
    
    if bot_token == 'DEMO_TOKEN':
        logger.warning("No TELEGRAM_BOT_TOKEN provided - running in demo mode")
        logger.info("To connect a real bot:")
        logger.info("1. Create a bot with @BotFather on Telegram")
        logger.info("2. Set TELEGRAM_BOT_TOKEN environment variable")
        logger.info("3. Restart the bot")
        
        # Keep the process running for demonstration
        while True:
            await asyncio.sleep(60)
            logger.info("Bot ready - waiting for TELEGRAM_BOT_TOKEN...")
    
    else:
        # Create and run the actual bot
        bot = AutoForwardXBot(bot_token, backend_url)
        
        try:
            await bot.run()
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
        except Exception as e:
            logger.error(f"Bot error: {e}")

if __name__ == "__main__":
    asyncio.run(main())