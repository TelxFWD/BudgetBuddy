"""
Production-grade Telegram Bot for AutoForwardX backend integration.
Handles user authentication, forwarding pair management, multi-account sessions, and real-time notifications.
"""
import asyncio
import logging
import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

import aiohttp
import httpx
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup, 
    ReplyKeyboardMarkup, KeyboardButton, BotCommand
)
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler, 
    MessageHandler, filters, ContextTypes
)
from telegram.constants import ParseMode

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class AutoForwardXBot:
    def __init__(self, bot_token: str, backend_url: str):
        self.bot_token = bot_token
        self.backend_url = backend_url.rstrip('/')
        self.user_sessions: Dict[int, Dict] = {}  # Store user sessions and tokens
        
        # Initialize bot application
        self.application = Application.builder().token(bot_token).build()
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up all command and callback handlers."""
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("login", self.login_command))
        self.application.add_handler(CommandHandler("logout", self.logout_command))
        self.application.add_handler(CommandHandler("addpair", self.addpair_command))
        self.application.add_handler(CommandHandler("mypairs", self.mypairs_command))
        self.application.add_handler(CommandHandler("accounts", self.accounts_command))
        self.application.add_handler(CommandHandler("plans", self.plans_command))
        
        # Callback query handler for inline buttons
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        
        # Message handler for OTP and phone numbers
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        user = update.effective_user
        welcome_text = f"""
🚀 **Welcome to AutoForwardX Bot!**

Hello {user.first_name}! I'm your personal assistant for managing message forwarding between Telegram and Discord.

📋 **Available Commands:**
/login - Connect your account via phone number
/logout - Disconnect current session
/addpair - Create new forwarding pair
/mypairs - Manage your forwarding pairs
/accounts - Manage multiple accounts
/plans - View subscription and payments
/help - Show detailed help menu

🔐 **Get Started:**
Use /login to connect your account and start forwarding messages!
        """
        
        await update.message.reply_text(
            welcome_text,
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command with categorized commands."""
        help_text = """
📚 **AutoForwardX Bot Help**

🔐 **Authentication:**
/login - Login with phone number + OTP
/logout - Disconnect current session

📨 **Forwarding Management:**
/addpair - Create new forwarding pair
  • Select source and destination channels
  • Set custom delays
  • Choose copy or forward mode
/mypairs - View and manage all pairs
  • Start/Stop individual pairs
  • Delete pairs
  • Bulk operations (Pause All, Resume All)

👥 **Multi-Account:**
/accounts - Manage multiple accounts
  • Add new Telegram account
  • Switch between accounts
  • Remove accounts

💳 **Subscription:**
/plans - View current plan and payments
  • Free, Pro, Elite plans
  • PayPal and Crypto payment options
  • Plan expiry notifications

❓ **Support:**
/help - Show this help menu

💡 **Tips:**
• Use inline buttons for quick actions
• All changes sync with your dashboard
• Notifications are sent automatically
        """
        
        await update.message.reply_text(
            help_text,
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def login_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /login command - request phone number."""
        user_id = update.effective_user.id
        
        # Check if already logged in
        if user_id in self.user_sessions and self.user_sessions[user_id].get('authenticated'):
            await update.message.reply_text(
                "✅ You're already logged in! Use /logout to disconnect first."
            )
            return
        
        # Store login state
        context.user_data['awaiting_phone'] = True
        
        keyboard = [[KeyboardButton("📱 Share Phone Number", request_contact=True)]]
        reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)
        
        await update.message.reply_text(
            "🔐 **Login to AutoForwardX**\n\n"
            "Please share your phone number to receive an OTP code.\n"
            "You can either:\n"
            "• Click the button below to share automatically\n"
            "• Type your phone number (e.g., +1234567890)",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def logout_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /logout command."""
        user_id = update.effective_user.id
        
        if user_id not in self.user_sessions:
            await update.message.reply_text("❌ You're not logged in.")
            return
        
        keyboard = [
            [InlineKeyboardButton("✅ Yes, Logout", callback_data="logout_confirm")],
            [InlineKeyboardButton("❌ Cancel", callback_data="logout_cancel")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "🔓 **Confirm Logout**\n\n"
            "Are you sure you want to disconnect your session?",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def addpair_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /addpair command - create new forwarding pair."""
        user_id = update.effective_user.id
        
        if not await self._check_authentication(update, user_id):
            return
        
        # Get user's accounts and channels
        accounts_data = await self._api_request(
            'GET', '/api/auth/linked-accounts', user_id
        )
        
        if not accounts_data or 'success' not in accounts_data:
            await update.message.reply_text(
                "❌ Could not load your accounts. Please try logging in again."
            )
            return
        
        telegram_accounts = accounts_data.get('telegram_accounts', [])
        discord_accounts = accounts_data.get('discord_accounts', [])
        
        if not telegram_accounts and not discord_accounts:
            await update.message.reply_text(
                "📱 **No Accounts Connected**\n\n"
                "You need to connect at least one Telegram or Discord account first.\n"
                "Use /accounts to add accounts."
            )
            return
        
        # Show account selection for source
        context.user_data['addpair_step'] = 'select_source'
        context.user_data['telegram_accounts'] = telegram_accounts
        context.user_data['discord_accounts'] = discord_accounts
        
        keyboard = []
        
        if telegram_accounts:
            keyboard.append([InlineKeyboardButton("📱 Telegram Account", callback_data="source_telegram")])
        
        if discord_accounts:
            keyboard.append([InlineKeyboardButton("🎮 Discord Account", callback_data="source_discord")])
        
        keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="addpair_cancel")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "➕ **Create New Forwarding Pair**\n\n"
            "**Step 1:** Select source platform",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def mypairs_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /mypairs command - show all forwarding pairs."""
        user_id = update.effective_user.id
        
        if not await self._check_authentication(update, user_id):
            return
        
        # Get user's forwarding pairs
        pairs_data = await self._api_request(
            'GET', '/api/forwarding/pairs', user_id
        )
        
        if not pairs_data or 'success' not in pairs_data:
            await update.message.reply_text(
                "❌ Could not load your forwarding pairs."
            )
            return
        
        pairs = pairs_data.get('pairs', [])
        
        if not pairs:
            keyboard = [[InlineKeyboardButton("➕ Create First Pair", callback_data="create_first_pair")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                "📋 **Your Forwarding Pairs**\n\n"
                "You don't have any forwarding pairs yet.\n"
                "Create your first pair to start forwarding messages!",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            return
        
        # Show pairs with management options
        await self._show_pairs_list(update, pairs)
    
    async def accounts_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /accounts command - manage multiple accounts."""
        user_id = update.effective_user.id
        
        if not await self._check_authentication(update, user_id):
            return
        
        # Get linked accounts
        accounts_data = await self._api_request(
            'GET', '/api/auth/linked-accounts', user_id
        )
        
        if not accounts_data:
            await update.message.reply_text(
                "❌ Could not load your accounts."
            )
            return
        
        telegram_accounts = accounts_data.get('telegram_accounts', [])
        discord_accounts = accounts_data.get('discord_accounts', [])
        
        accounts_text = "👥 **Your Connected Accounts**\n\n"
        
        if telegram_accounts:
            accounts_text += "📱 **Telegram Accounts:**\n"
            for acc in telegram_accounts:
                status = "🟢 Active" if acc.get('is_active') else "🔴 Inactive"
                accounts_text += f"• {acc.get('phone_number', 'Unknown')} - {status}\n"
            accounts_text += "\n"
        
        if discord_accounts:
            accounts_text += "🎮 **Discord Accounts:**\n"
            for acc in discord_accounts:
                status = "🟢 Active" if acc.get('is_active') else "🔴 Inactive"
                accounts_text += f"• {acc.get('username', 'Unknown')} - {status}\n"
            accounts_text += "\n"
        
        if not telegram_accounts and not discord_accounts:
            accounts_text += "No accounts connected yet.\n\n"
        
        keyboard = [
            [InlineKeyboardButton("➕ Add Telegram Account", callback_data="add_telegram")],
            [InlineKeyboardButton("➕ Add Discord Account", callback_data="add_discord")],
            [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_accounts")]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            accounts_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def plans_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /plans command - show subscription info."""
        user_id = update.effective_user.id
        
        if not await self._check_authentication(update, user_id):
            return
        
        # Get user info including plan
        user_data = await self._api_request(
            'GET', '/api/auth/me', user_id
        )
        
        if not user_data:
            await update.message.reply_text(
                "❌ Could not load your subscription info."
            )
            return
        
        plan = user_data.get('plan', 'free').title()
        plan_emoji = {"Free": "🆓", "Pro": "⭐", "Elite": "💎"}.get(plan, "📋")
        
        plans_text = f"💳 **Your Subscription**\n\n"
        plans_text += f"{plan_emoji} **Current Plan:** {plan}\n"
        
        if 'plan_expiry' in user_data and user_data['plan_expiry']:
            expiry = user_data['plan_expiry']
            plans_text += f"📅 **Expires:** {expiry}\n"
        
        plans_text += "\n**Plan Features:**\n"
        
        if plan == "Free":
            plans_text += "• 1 forwarding pair\n• Basic support\n• 24-hour delay\n"
        elif plan == "Pro":
            plans_text += "• 10 forwarding pairs\n• Priority support\n• Custom delays\n• Analytics\n"
        elif plan == "Elite":
            plans_text += "• Unlimited pairs\n• API access\n• Webhooks\n• Premium support\n"
        
        keyboard = []
        
        if plan == "Free":
            keyboard.extend([
                [InlineKeyboardButton("⭐ Upgrade to Pro", callback_data="upgrade_pro")],
                [InlineKeyboardButton("💎 Upgrade to Elite", callback_data="upgrade_elite")]
            ])
        elif plan == "Pro":
            keyboard.append([InlineKeyboardButton("💎 Upgrade to Elite", callback_data="upgrade_elite")])
        
        keyboard.extend([
            [InlineKeyboardButton("💰 Payment History", callback_data="payment_history")],
            [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_plans")]
        ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            plans_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle all inline button callbacks."""
        query = update.callback_query
        await query.answer()
        
        data = query.data
        user_id = update.effective_user.id
        
        # Logout handlers
        if data == "logout_confirm":
            await self._handle_logout(query, user_id)
        elif data == "logout_cancel":
            await query.edit_message_text("❌ Logout cancelled.")
        
        # Add pair handlers
        elif data.startswith("source_"):
            await self._handle_source_selection(query, context, data)
        elif data == "addpair_cancel":
            await query.edit_message_text("❌ Pair creation cancelled.")
        
        # Pairs management
        elif data == "create_first_pair":
            await self.addpair_command(update, context)
        elif data.startswith("pair_"):
            await self._handle_pair_action(query, context, data)
        
        # Account management
        elif data.startswith("add_"):
            await self._handle_add_account(query, context, data)
        elif data == "refresh_accounts":
            await self.accounts_command(update, context)
        
        # Plan management
        elif data.startswith("upgrade_"):
            await self._handle_upgrade(query, context, data)
        elif data == "payment_history":
            await self._show_payment_history(query, user_id)
        elif data == "refresh_plans":
            await self.plans_command(update, context)
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle text messages (phone numbers, OTP codes)."""
        user_id = update.effective_user.id
        text = update.message.text
        
        # Handle phone number input
        if context.user_data.get('awaiting_phone'):
            await self._handle_phone_input(update, context, text)
        
        # Handle OTP input
        elif context.user_data.get('awaiting_otp'):
            await self._handle_otp_input(update, context, text)
    
    async def _handle_phone_input(self, update: Update, context: ContextTypes.DEFAULT_TYPE, phone: str):
        """Handle phone number input for login."""
        user_id = update.effective_user.id
        
        # Clean phone number
        if update.message.contact:
            phone = update.message.contact.phone_number
        
        if not phone.startswith('+'):
            phone = '+' + phone.lstrip('+')
        
        # Request OTP from backend
        otp_response = await self._api_request(
            'POST', '/api/auth/request-otp',
            user_id, {'phone_number': phone}
        )
        
        if not otp_response or not otp_response.get('success'):
            await update.message.reply_text(
                "❌ Failed to send OTP. Please check your phone number and try again."
            )
            context.user_data.clear()
            return
        
        # Store phone and wait for OTP
        context.user_data['phone_number'] = phone
        context.user_data['awaiting_phone'] = False
        context.user_data['awaiting_otp'] = True
        
        await update.message.reply_text(
            f"📱 **OTP Sent!**\n\n"
            f"We've sent a verification code to {phone}\n"
            f"Please enter the code to complete login:",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _handle_otp_input(self, update: Update, context: ContextTypes.DEFAULT_TYPE, otp: str):
        """Handle OTP code input for login."""
        user_id = update.effective_user.id
        phone = context.user_data.get('phone_number')
        
        if not phone:
            await update.message.reply_text("❌ Session expired. Please start login again with /login")
            context.user_data.clear()
            return
        
        # Verify OTP with backend
        login_response = await self._api_request(
            'POST', '/api/auth/verify-otp',
            user_id, {'phone_number': phone, 'otp_code': otp}
        )
        
        if not login_response or not login_response.get('success'):
            await update.message.reply_text(
                "❌ Invalid OTP code. Please try again or use /login to start over."
            )
            return
        
        # Store session
        token = login_response.get('access_token')
        user_info = login_response.get('user')
        
        self.user_sessions[user_id] = {
            'authenticated': True,
            'access_token': token,
            'phone_number': phone,
            'user_info': user_info
        }
        
        context.user_data.clear()
        
        await update.message.reply_text(
            f"✅ **Login Successful!**\n\n"
            f"Welcome back! You're now connected to AutoForwardX.\n\n"
            f"📋 **Quick Actions:**\n"
            f"• /addpair - Create forwarding pair\n"
            f"• /mypairs - Manage existing pairs\n"
            f"• /accounts - Add more accounts\n"
            f"• /plans - Check subscription",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _check_authentication(self, update: Update, user_id: int) -> bool:
        """Check if user is authenticated."""
        if user_id not in self.user_sessions or not self.user_sessions[user_id].get('authenticated'):
            await update.message.reply_text(
                "🔐 **Authentication Required**\n\n"
                "Please login first using /login to access this feature.",
                parse_mode=ParseMode.MARKDOWN
            )
            return False
        return True
    
    async def _api_request(self, method: str, endpoint: str, user_id: int, data: Dict = None) -> Optional[Dict]:
        """Make authenticated API request to backend."""
        if user_id not in self.user_sessions:
            return None
        
        token = self.user_sessions[user_id].get('access_token')
        if not token:
            return None
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.backend_url}{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                if method == 'GET':
                    async with session.get(url, headers=headers) as response:
                        return await response.json()
                elif method == 'POST':
                    async with session.post(url, headers=headers, json=data) as response:
                        return await response.json()
                elif method == 'PUT':
                    async with session.put(url, headers=headers, json=data) as response:
                        return await response.json()
                elif method == 'DELETE':
                    async with session.delete(url, headers=headers) as response:
                        return await response.json()
        except Exception as e:
            logger.error(f"API request failed: {e}")
            return None
    
    async def _show_pairs_list(self, update: Update, pairs: List[Dict]):
        """Show list of forwarding pairs with management buttons."""
        pairs_text = "📋 **Your Forwarding Pairs**\n\n"
        
        keyboard = []
        
        for i, pair in enumerate(pairs, 1):
            status = "🟢 Active" if pair.get('is_active') else "🔴 Paused"
            source = f"{pair.get('source_platform', '').title()}"
            dest = f"{pair.get('destination_platform', '').title()}"
            delay = pair.get('delay_seconds', 0)
            
            pairs_text += f"**{i}.** {source} → {dest}\n"
            pairs_text += f"Status: {status}\n"
            if delay > 0:
                pairs_text += f"Delay: {delay}s\n"
            pairs_text += "\n"
            
            # Add management buttons for each pair
            pair_id = pair.get('id')
            if pair.get('is_active'):
                keyboard.append([
                    InlineKeyboardButton(f"⏸ Pause #{i}", callback_data=f"pair_pause_{pair_id}"),
                    InlineKeyboardButton(f"🗑 Delete #{i}", callback_data=f"pair_delete_{pair_id}")
                ])
            else:
                keyboard.append([
                    InlineKeyboardButton(f"▶️ Resume #{i}", callback_data=f"pair_resume_{pair_id}"),
                    InlineKeyboardButton(f"🗑 Delete #{i}", callback_data=f"pair_delete_{pair_id}")
                ])
        
        # Add bulk operation buttons
        if len(pairs) > 1:
            keyboard.extend([
                [InlineKeyboardButton("⏸ Pause All", callback_data="bulk_pause_all")],
                [InlineKeyboardButton("▶️ Resume All", callback_data="bulk_resume_all")],
                [InlineKeyboardButton("🗑 Delete All", callback_data="bulk_delete_all")]
            ])
        
        keyboard.append([InlineKeyboardButton("➕ Add New Pair", callback_data="create_first_pair")])
        keyboard.append([InlineKeyboardButton("🔄 Refresh", callback_data="refresh_pairs")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            pairs_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def run(self):
        """Start the bot."""
        # Set bot commands for menu
        commands = [
            BotCommand("start", "Start the bot"),
            BotCommand("help", "Show help menu"),
            BotCommand("login", "Login with phone number"),
            BotCommand("logout", "Logout from account"),
            BotCommand("addpair", "Create forwarding pair"),
            BotCommand("mypairs", "Manage forwarding pairs"),
            BotCommand("accounts", "Manage accounts"),
            BotCommand("plans", "View subscription")
        ]
        
        await self.application.bot.set_my_commands(commands)
        
        # Start the bot
        await self.application.run_polling()

# Main entry point
async def main():
    """Main function to start the bot."""
    # Get environment variables
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000')
    
    if not bot_token:
        logger.error("TELEGRAM_BOT_TOKEN environment variable is required")
        return
    
    # Create and run bot
    bot = AutoForwardXBot(bot_token, backend_url)
    logger.info(f"Starting AutoForwardX Telegram Bot...")
    logger.info(f"Backend URL: {backend_url}")
    
    try:
        await bot.run()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot error: {e}")

if __name__ == "__main__":
    asyncio.run(main())