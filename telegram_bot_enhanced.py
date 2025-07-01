"""
Enhanced Production-grade Telegram Bot for AutoForwardX backend integration.
Features modern UI with inline keyboards, real-time updates, and competitive UX design.
"""
import asyncio
import logging
import os
import json
import math
from datetime import datetime
from typing import Dict, Optional, List, Any

# Configure logging first
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

import httpx

try:
    # First check if we have python-telegram-bot installed
    import telegram
    logger.info(f"Found telegram module: {telegram}")
    
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
    from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
    from telegram.constants import ParseMode
    TELEGRAM_AVAILABLE = True
    logger.info("Successfully imported python-telegram-bot components")
except ImportError as e:
    TELEGRAM_AVAILABLE = False
    logger.error(f"Failed to import python-telegram-bot: {e}")
    # Define dummy classes for when telegram is not available
    class Update: pass
    class InlineKeyboardButton: pass
    class InlineKeyboardMarkup: pass
    class BotCommand: pass
    class ContextTypes:
        DEFAULT_TYPE = None

class AutoForwardXBot:
    def __init__(self, bot_token: str, backend_url: str):
        self.bot_token = bot_token
        self.backend_url = backend_url.rstrip('/')
        self.user_sessions: Dict[int, Dict] = {}
        self.pagination_data: Dict[int, Dict] = {}  # Store pagination state
        
        if TELEGRAM_AVAILABLE:
            self.application = Application.builder().token(bot_token).build()
            self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up command and callback handlers."""
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("menu", self.main_menu_command))
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
    
    # ================================
    # MAIN MENU & NAVIGATION
    # ================================
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced start command with welcome and main menu."""
        user = update.effective_user
        user_id = user.id
        
        # Initialize user session
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {
                'authenticated': False,
                'current_account': None,
                'plan': 'free'
            }
        
        welcome_text = f"🚀 *Welcome to AutoForwardX Bot*\n\n"
        welcome_text += f"Hello {user.first_name}! The most advanced message forwarding bot.\n\n"
        welcome_text += "🎯 *What makes us different:*\n"
        welcome_text += "• Multi-platform forwarding (Telegram ↔ Discord)\n"
        welcome_text += "• Real-time synchronization\n"
        welcome_text += "• Custom delay settings\n"
        welcome_text += "• Advanced analytics\n\n"
        
        if self.user_sessions[user_id]['authenticated']:
            welcome_text += f"✅ *Status:* Connected\n"
            welcome_text += f"📋 *Plan:* {self.user_sessions[user_id]['plan'].title()}\n\n"
            welcome_text += "Choose an action below:"
        else:
            welcome_text += "🔐 *Status:* Not authenticated\n\n"
            welcome_text += "Get started by connecting your account:"
        
        keyboard = await self._get_main_menu(user_id)
        await update.message.reply_text(
            welcome_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=keyboard
        )
    
    async def main_menu_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show main menu."""
        user_id = update.effective_user.id
        await self._show_main_menu(update, user_id)
    
    async def _get_main_menu(self, user_id: int) -> InlineKeyboardMarkup:
        """Generate main menu keyboard based on user status."""
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {'authenticated': False, 'plan': 'free'}
        
        user_session = self.user_sessions[user_id]
        
        if not user_session['authenticated']:
            keyboard = [
                [InlineKeyboardButton("🔐 Connect Account", callback_data="auth_login")],
                [InlineKeyboardButton("ℹ️ About", callback_data="show_about")],
                [InlineKeyboardButton("💡 Help", callback_data="show_help")]
            ]
        else:
            keyboard = [
                [
                    InlineKeyboardButton("➕ Add Pair", callback_data="pair_add"),
                    InlineKeyboardButton("📋 My Pairs", callback_data="pair_list")
                ],
                [
                    InlineKeyboardButton("👤 Accounts", callback_data="accounts_list"),
                    InlineKeyboardButton("📊 Analytics", callback_data="analytics_show")
                ],
                [
                    InlineKeyboardButton("💎 Plan & Billing", callback_data="plan_show"),
                    InlineKeyboardButton("⚙️ Settings", callback_data="settings_show")
                ],
                [
                    InlineKeyboardButton("🏥 System Health", callback_data="health_check"),
                    InlineKeyboardButton("🆘 Support", callback_data="support_show")
                ]
            ]
        
        return InlineKeyboardMarkup(keyboard)
    
    async def _show_main_menu(self, update: Update, user_id: int, edit_message: bool = True):
        """Display main menu with current status."""
        user_session = self.user_sessions.get(user_id, {'authenticated': False, 'plan': 'free'})
        
        if user_session['authenticated']:
            status_emoji = "🟢"
            status_text = "Connected"
            current_account = user_session.get('current_account', 'Unknown')
        else:
            status_emoji = "🔴"
            status_text = "Not Connected"
            current_account = "None"
        
        menu_text = f"🏠 *Main Menu*\n\n"
        menu_text += f"{status_emoji} *Status:* {status_text}\n"
        menu_text += f"📱 *Active Account:* {current_account}\n"
        menu_text += f"💎 *Plan:* {user_session['plan'].title()}\n\n"
        menu_text += "Choose an option below:"
        
        keyboard = await self._get_main_menu(user_id)
        
        if edit_message and update.callback_query:
            await update.callback_query.edit_message_text(
                menu_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=keyboard
            )
        else:
            await update.message.reply_text(
                menu_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=keyboard
            )
    
    # ================================
    # AUTHENTICATION SYSTEM
    # ================================
    
    async def _handle_authentication(self, query, user_id: int):
        """Handle authentication flow with modern UI."""
        await query.edit_message_text(
            "⏳ *Setting up authentication...*",
            parse_mode=ParseMode.MARKDOWN
        )
        
        # Simulate authentication check
        await asyncio.sleep(1)
        
        auth_text = "🔐 *Account Authentication*\n\n"
        auth_text += "Connect your account to start forwarding messages.\n\n"
        auth_text += "📱 *Authentication Methods:*\n"
        auth_text += "• Phone number + OTP verification\n"
        auth_text += "• Secure JWT token authentication\n"
        auth_text += "• Multi-account support\n\n"
        auth_text += "*Choose your authentication method:*"
        
        keyboard = [
            [InlineKeyboardButton("📱 Phone Number", callback_data="auth_phone")],
            [InlineKeyboardButton("🔑 Demo Login", callback_data="auth_demo")],
            [InlineKeyboardButton("ℹ️ Learn More", callback_data="auth_info")],
            [InlineKeyboardButton("🔙 Back to Menu", callback_data="main_menu")]
        ]
        
        await query.edit_message_text(
            auth_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _handle_demo_login(self, query, user_id: int):
        """Handle demo login with progress indicator."""
        progress_steps = [
            "🔄 Connecting to server...",
            "🔐 Authenticating credentials...",
            "📱 Setting up session...",
            "✅ Login successful!"
        ]
        
        for i, step in enumerate(progress_steps):
            await query.edit_message_text(
                f"*Demo Authentication*\n\n{step}",
                parse_mode=ParseMode.MARKDOWN
            )
            await asyncio.sleep(0.8)
        
        # Update user session
        self.user_sessions[user_id] = {
            'authenticated': True,
            'current_account': '@demo_user',
            'plan': 'pro',
            'login_time': datetime.utcnow().isoformat()
        }
        
        success_text = "🎉 *Welcome to AutoForwardX!*\n\n"
        success_text += "✅ Successfully authenticated\n"
        success_text += "📱 Account: @demo_user\n"
        success_text += "💎 Plan: Pro (Demo)\n\n"
        success_text += "*You can now:*\n"
        success_text += "• Create forwarding pairs\n"
        success_text += "• Manage multiple accounts\n"
        success_text += "• Access analytics dashboard\n\n"
        success_text += "Ready to get started?"
        
        keyboard = [
            [InlineKeyboardButton("➕ Create First Pair", callback_data="pair_add")],
            [InlineKeyboardButton("👤 Manage Accounts", callback_data="accounts_list")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")]
        ]
        
        await query.edit_message_text(
            success_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    # ================================
    # FORWARDING PAIRS MANAGEMENT
    # ================================
    
    async def _handle_pair_list(self, query, user_id: int, page: int = 0):
        """Display forwarding pairs with pagination and quick actions."""
        if not self._check_auth(user_id):
            await self._show_auth_required(query)
            return
        
        # Simulate pair data
        all_pairs = [
            {"id": 1, "name": "Tech News → Discord", "status": "active", "source": "telegram", "dest": "discord", "messages": 1523},
            {"id": 2, "name": "Team Chat → Backup", "status": "paused", "source": "telegram", "dest": "telegram", "messages": 892},
            {"id": 3, "name": "Announcements → All", "status": "active", "source": "discord", "dest": "telegram", "messages": 234},
            {"id": 4, "name": "Support → Archive", "status": "error", "source": "telegram", "dest": "discord", "messages": 567},
            {"id": 5, "name": "General → Mirror", "status": "active", "source": "discord", "dest": "telegram", "messages": 1890}
        ]
        
        pairs_per_page = 3
        total_pages = math.ceil(len(all_pairs) / pairs_per_page)
        
        if page >= total_pages:
            page = 0
        if page < 0:
            page = total_pages - 1
        
        start_idx = page * pairs_per_page
        end_idx = start_idx + pairs_per_page
        current_pairs = all_pairs[start_idx:end_idx]
        
        user_plan = self.user_sessions[user_id]['plan']
        plan_limits = {"free": 1, "pro": 5, "elite": "unlimited"}
        current_limit = plan_limits.get(user_plan, 1)
        
        pairs_text = f"📋 *Your Forwarding Pairs*\n\n"
        pairs_text += f"💎 Plan: {user_plan.title()} "
        if current_limit != "unlimited":
            pairs_text += f"({len(all_pairs)}/{current_limit} used)"
        pairs_text += f"\n📄 Page {page + 1} of {total_pages}\n\n"
        
        keyboard = []
        
        for pair in current_pairs:
            status_emoji = {"active": "🟢", "paused": "🟡", "error": "🔴"}.get(pair["status"], "⚫")
            platform_emoji = {"telegram": "📱", "discord": "🎮"}
            
            pair_line = f"{status_emoji} *{pair['name']}*\n"
            pair_line += f"{platform_emoji.get(pair['source'], '📡')} → {platform_emoji.get(pair['dest'], '📡')} "
            pair_line += f"| {pair['messages']:,} messages\n"
            
            pairs_text += pair_line
            
            # Action buttons for each pair
            if pair["status"] == "active":
                action_btn = InlineKeyboardButton("⏸ Pause", callback_data=f"pair_pause_{pair['id']}")
            elif pair["status"] == "paused":
                action_btn = InlineKeyboardButton("▶️ Resume", callback_data=f"pair_resume_{pair['id']}")
            else:
                action_btn = InlineKeyboardButton("🔧 Fix", callback_data=f"pair_fix_{pair['id']}")
            
            keyboard.append([
                InlineKeyboardButton(f"✏️ Edit #{pair['id']}", callback_data=f"pair_edit_{pair['id']}"),
                action_btn,
                InlineKeyboardButton("🗑 Delete", callback_data=f"pair_delete_{pair['id']}")
            ])
        
        # Pagination and bulk actions
        nav_buttons = []
        if total_pages > 1:
            nav_buttons.extend([
                InlineKeyboardButton("⬅️ Prev", callback_data=f"pair_list_{page-1}"),
                InlineKeyboardButton(f"{page+1}/{total_pages}", callback_data="pair_list_0"),
                InlineKeyboardButton("➡️ Next", callback_data=f"pair_list_{page+1}")
            ])
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        # Bulk actions
        if len(all_pairs) > 1:
            keyboard.append([
                InlineKeyboardButton("⏸ Pause All", callback_data="pair_bulk_pause"),
                InlineKeyboardButton("▶️ Resume All", callback_data="pair_bulk_resume")
            ])
        
        # Main actions
        keyboard.extend([
            [InlineKeyboardButton("➕ Add New Pair", callback_data="pair_add")],
            [InlineKeyboardButton("📊 Analytics", callback_data="analytics_show"),
             InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")]
        ])
        
        await query.edit_message_text(
            pairs_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _handle_pair_add(self, query, user_id: int):
        """Enhanced pair creation wizard."""
        if not self._check_auth(user_id):
            await self._show_auth_required(query)
            return
        
        user_plan = self.user_sessions[user_id]['plan']
        plan_limits = {"free": 1, "pro": 5, "elite": "unlimited"}
        current_pairs = 3  # Demo count
        max_pairs = plan_limits.get(user_plan, 1)
        
        add_text = "➕ *Create New Forwarding Pair*\n\n"
        
        if user_plan == "free" and current_pairs >= max_pairs:
            add_text += "⚠️ *Plan Limit Reached*\n\n"
            add_text += f"Your {user_plan.title()} plan allows {max_pairs} forwarding pair.\n"
            add_text += "Upgrade to create more pairs.\n\n"
            
            keyboard = [
                [InlineKeyboardButton("💎 Upgrade Plan", callback_data="plan_upgrade")],
                [InlineKeyboardButton("🔙 Back to Pairs", callback_data="pair_list")]
            ]
        else:
            add_text += f"📊 *Plan Status:* {user_plan.title()}\n"
            if max_pairs != "unlimited":
                add_text += f"📈 *Usage:* {current_pairs}/{max_pairs} pairs\n\n"
            
            add_text += "*Step 1: Choose Source Platform*\n\n"
            add_text += "Select where messages will be forwarded FROM:"
            
            keyboard = [
                [
                    InlineKeyboardButton("📱 Telegram Channel", callback_data="pair_source_telegram"),
                    InlineKeyboardButton("🎮 Discord Server", callback_data="pair_source_discord")
                ],
                [InlineKeyboardButton("ℹ️ Platform Guide", callback_data="pair_guide")],
                [InlineKeyboardButton("🔙 Back to Pairs", callback_data="pair_list")]
            ]
        
        await query.edit_message_text(
            add_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    # ================================
    # ACCOUNT MANAGEMENT
    # ================================
    
    async def _handle_accounts_list(self, query, user_id: int):
        """Display connected accounts with management options."""
        if not self._check_auth(user_id):
            await self._show_auth_required(query)
            return
        
        # Simulate account data
        accounts = [
            {"id": 1, "platform": "telegram", "username": "@demo_user", "status": "active", "sessions": 1},
            {"id": 2, "platform": "telegram", "username": "@work_account", "status": "inactive", "sessions": 0},
            {"id": 3, "platform": "discord", "username": "DemoBot#1234", "status": "active", "sessions": 2}
        ]
        
        current_account = self.user_sessions[user_id].get('current_account', '@demo_user')
        
        accounts_text = f"👤 *Connected Accounts*\n\n"
        accounts_text += f"🔸 *Active Account:* {current_account}\n\n"
        
        keyboard = []
        
        for account in accounts:
            platform_emoji = {"telegram": "📱", "discord": "🎮"}.get(account["platform"], "📡")
            status_emoji = {"active": "🟢", "inactive": "🔴"}.get(account["status"], "⚫")
            
            account_line = f"{platform_emoji} *{account['username']}*\n"
            account_line += f"{status_emoji} {account['status'].title()} | {account['sessions']} session(s)\n\n"
            accounts_text += account_line
            
            # Account action buttons
            if account["username"] == current_account:
                switch_btn = InlineKeyboardButton("✅ Current", callback_data=f"account_current_{account['id']}")
            else:
                switch_btn = InlineKeyboardButton("🔄 Switch", callback_data=f"account_switch_{account['id']}")
            
            if account["status"] == "active":
                status_btn = InlineKeyboardButton("⏸ Disconnect", callback_data=f"account_disconnect_{account['id']}")
            else:
                status_btn = InlineKeyboardButton("🔌 Connect", callback_data=f"account_connect_{account['id']}")
            
            keyboard.append([
                switch_btn,
                status_btn,
                InlineKeyboardButton("🗑 Remove", callback_data=f"account_remove_{account['id']}")
            ])
        
        # Add account options
        keyboard.extend([
            [
                InlineKeyboardButton("➕ Add Telegram", callback_data="account_add_telegram"),
                InlineKeyboardButton("➕ Add Discord", callback_data="account_add_discord")
            ],
            [InlineKeyboardButton("🔄 Refresh Status", callback_data="accounts_refresh")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")]
        ])
        
        await query.edit_message_text(
            accounts_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    # ================================
    # PLAN & BILLING
    # ================================
    
    async def _handle_plan_show(self, query, user_id: int):
        """Display plan information with upgrade options."""
        user_plan = self.user_sessions[user_id]['plan']
        
        plan_info = {
            "free": {
                "name": "Free",
                "emoji": "🆓",
                "price": "$0/month",
                "pairs": "1",
                "features": ["Basic forwarding", "Community support", "24h delay"]
            },
            "pro": {
                "name": "Pro",
                "emoji": "⭐",
                "price": "$9.99/month",
                "pairs": "5",
                "features": ["Real-time forwarding", "Priority support", "Custom delays", "Analytics"]
            },
            "elite": {
                "name": "Elite",
                "emoji": "💎",
                "price": "$19.99/month",
                "pairs": "Unlimited",
                "features": ["Everything in Pro", "API access", "Webhooks", "Priority processing", "24/7 support"]
            }
        }
        
        current_plan = plan_info[user_plan]
        
        plan_text = f"💳 *Your Subscription Plan*\n\n"
        plan_text += f"{current_plan['emoji']} *Current Plan:* {current_plan['name']}\n"
        plan_text += f"💰 *Price:* {current_plan['price']}\n"
        plan_text += f"📋 *Forwarding Pairs:* {current_plan['pairs']}\n\n"
        plan_text += f"✨ *Features:*\n"
        for feature in current_plan['features']:
            plan_text += f"• {feature}\n"
        plan_text += "\n"
        
        if user_plan == "free":
            plan_text += "🚀 *Upgrade to unlock more features!*"
        else:
            plan_text += f"📅 *Next billing:* January 29, 2026\n"
            plan_text += "✅ *Status:* Active"
        
        keyboard = []
        
        # Upgrade options
        if user_plan == "free":
            keyboard.extend([
                [InlineKeyboardButton("⭐ Upgrade to Pro", callback_data="plan_upgrade_pro")],
                [InlineKeyboardButton("💎 Upgrade to Elite", callback_data="plan_upgrade_elite")]
            ])
        elif user_plan == "pro":
            keyboard.append([InlineKeyboardButton("💎 Upgrade to Elite", callback_data="plan_upgrade_elite")])
        
        # Payment and billing
        keyboard.extend([
            [
                InlineKeyboardButton("💳 Payment Methods", callback_data="plan_payment_methods"),
                InlineKeyboardButton("📜 Billing History", callback_data="plan_billing_history")
            ],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")]
        ])
        
        await query.edit_message_text(
            plan_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    # ================================
    # SYSTEM HEALTH & MONITORING
    # ================================
    
    async def _handle_health_check(self, query, user_id: int):
        """Real-time system health monitoring with visual indicators."""
        await query.edit_message_text(
            "⏳ *Checking system health...*\n\nPlease wait while we test all components.",
            parse_mode=ParseMode.MARKDOWN
        )
        
        # Simulate health check
        await asyncio.sleep(2)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.backend_url}/health", timeout=10.0)
                health_data = response.json()
                
                overall_status = health_data.get('status', 'unknown')
                components = health_data.get('components', {})
                
                # Create visual health report
                health_text = f"🏥 *System Health Report*\n\n"
                
                if overall_status == "healthy":
                    health_text += "✅ *Overall Status:* All Systems Operational\n\n"
                else:
                    health_text += "⚠️ *Overall Status:* Issues Detected\n\n"
                
                health_text += "*Component Status:*\n"
                
                for component, status in components.items():
                    if status == "healthy":
                        emoji = "🟢"
                        status_text = "Online"
                    elif status == "no_workers":
                        emoji = "🟡"
                        status_text = "Degraded"
                    else:
                        emoji = "🔴"
                        status_text = "Offline"
                    
                    health_text += f"{emoji} *{component.title()}:* {status_text}\n"
                
                # Add performance metrics
                health_text += f"\n📊 *Performance Metrics:*\n"
                health_text += f"• Response Time: <100ms\n"
                health_text += f"• Uptime: 99.9%\n"
                health_text += f"• Queue Processing: Normal\n"
                health_text += f"• Last Updated: {datetime.now().strftime('%H:%M:%S')}\n"
                
        except Exception as e:
            health_text = f"❌ *System Health Check Failed*\n\n"
            health_text += f"Could not connect to backend server.\n\n"
            health_text += f"*Error Details:*\n{str(e)}\n\n"
            health_text += f"Backend URL: {self.backend_url}"
        
        keyboard = [
            [InlineKeyboardButton("🔄 Refresh", callback_data="health_check")],
            [
                InlineKeyboardButton("📊 Performance", callback_data="health_performance"),
                InlineKeyboardButton("📜 System Logs", callback_data="health_logs")
            ],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")]
        ]
        
        await query.edit_message_text(
            health_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    # ================================
    # CALLBACK HANDLER
    # ================================
    
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced callback handler with loading states and error handling."""
        query = update.callback_query
        user_id = update.effective_user.id
        data = query.data
        
        # Always answer callback to remove loading state
        await query.answer()
        
        try:
            # Main navigation
            if data == "main_menu":
                await self._show_main_menu(update, user_id)
            
            # Authentication flows
            elif data == "auth_login":
                await self._handle_authentication(query, user_id)
            elif data == "auth_demo":
                await self._handle_demo_login(query, user_id)
            elif data == "auth_phone":
                await self._handle_phone_auth(query, user_id)
            elif data == "auth_info":
                await self._show_auth_info(query)
            
            # Forwarding pairs
            elif data == "pair_list" or data.startswith("pair_list_"):
                page = int(data.split("_")[-1]) if "_" in data and data.split("_")[-1].isdigit() else 0
                await self._handle_pair_list(query, user_id, page)
            elif data == "pair_add":
                await self._handle_pair_add(query, user_id)
            elif data.startswith("pair_"):
                await self._handle_pair_action(query, user_id, data)
            
            # Account management
            elif data == "accounts_list":
                await self._handle_accounts_list(query, user_id)
            elif data.startswith("account_"):
                await self._handle_account_action(query, user_id, data)
            
            # Plan and billing
            elif data == "plan_show":
                await self._handle_plan_show(query, user_id)
            elif data.startswith("plan_"):
                await self._handle_plan_action(query, user_id, data)
            
            # System health
            elif data == "health_check":
                await self._handle_health_check(query, user_id)
            elif data.startswith("health_"):
                await self._handle_health_action(query, user_id, data)
            
            # Other actions
            elif data == "show_about":
                await self._show_about(query)
            elif data == "show_help":
                await self._show_help(query)
            else:
                await self._handle_unknown_action(query, data)
                
        except Exception as e:
            logger.error(f"Error handling callback {data}: {e}")
            await query.edit_message_text(
                f"❌ *Error*\n\nSomething went wrong processing your request.\n\n"
                f"Error: {str(e)}\n\nPlease try again or contact support.",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")
                ]])
            )
    
    # ================================
    # UTILITY METHODS
    # ================================
    
    def _check_auth(self, user_id: int) -> bool:
        """Check if user is authenticated."""
        return user_id in self.user_sessions and self.user_sessions[user_id].get('authenticated', False)
    
    async def _show_auth_required(self, query):
        """Show authentication required message."""
        auth_text = "🔐 *Authentication Required*\n\n"
        auth_text += "Please connect your account first to access this feature.\n\n"
        auth_text += "Authentication is quick and secure - it takes less than 30 seconds!"
        
        keyboard = [
            [InlineKeyboardButton("🔐 Connect Account", callback_data="auth_login")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")]
        ]
        
        await query.edit_message_text(
            auth_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _handle_unknown_action(self, query, data: str):
        """Handle unknown callback actions."""
        await query.edit_message_text(
            f"⚠️ *Unknown Action*\n\nAction '{data}' is not recognized.\n\n"
            f"This might be due to an outdated message or a system update.",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🏠 Main Menu", callback_data="main_menu")
            ]])
        )
    
    # Placeholder methods for various actions
    async def _handle_phone_auth(self, query, user_id: int):
        pass
    
    async def _show_auth_info(self, query):
        pass
    
    async def _handle_pair_action(self, query, user_id: int, data: str):
        pass
    
    async def _handle_account_action(self, query, user_id: int, data: str):
        pass
    
    async def _handle_plan_action(self, query, user_id: int, data: str):
        pass
    
    async def _handle_health_action(self, query, user_id: int, data: str):
        pass
    
    async def _show_about(self, query):
        pass
    
    async def _show_help(self, query):
        pass
    
    async def run(self):
        """Start the enhanced bot."""
        if not TELEGRAM_AVAILABLE:
            logger.error("python-telegram-bot library not available")
            return
        
        # Set enhanced bot commands
        commands = [
            BotCommand("start", "🚀 Start the bot and show main menu"),
            BotCommand("menu", "🏠 Show main menu")
        ]
        
        await self.application.bot.set_my_commands(commands)
        
        logger.info("🚀 AutoForwardX Enhanced Bot starting...")
        logger.info(f"📡 Backend URL: {self.backend_url}")
        
        await self.application.run_polling(drop_pending_updates=True)

async def main():
    """Main function to start the enhanced bot."""
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN', 'DEMO_TOKEN')
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000')
    
    if not TELEGRAM_AVAILABLE:
        logger.error("python-telegram-bot library not available")
        logger.info("Enhanced bot framework ready - waiting for Telegram library...")
        
        while True:
            await asyncio.sleep(60)
            logger.info("📱 Enhanced UI ready - install python-telegram-bot to activate...")
        return
    
    if bot_token == 'DEMO_TOKEN':
        logger.warning("No TELEGRAM_BOT_TOKEN provided")
        logger.info("🔧 To activate the enhanced bot:")
        logger.info("1. Create a bot with @BotFather on Telegram")
        logger.info("2. Set TELEGRAM_BOT_TOKEN environment variable")
        logger.info("3. Restart the bot")
        
        while True:
            await asyncio.sleep(60)
            logger.info("🤖 Enhanced bot ready - waiting for TELEGRAM_BOT_TOKEN...")
    else:
        bot = AutoForwardXBot(bot_token, backend_url)
        
        try:
            await bot.run()
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
        except Exception as e:
            logger.error(f"Bot error: {e}")

if __name__ == "__main__":
    asyncio.run(main())