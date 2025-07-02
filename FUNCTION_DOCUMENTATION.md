
# 📚 AutoForwardX Project Function Documentation

> This document provides a detailed explanation of every function, component, and service in the AutoForwardX message forwarding platform. It covers both backend FastAPI services and frontend React components.

---

## 🗂 Table of Contents

1. [Backend API Functions](#backend-api-functions)
2. [Frontend Components](#frontend-components)
3. [Services & Utilities](#services--utilities)
4. [Database Models](#database-models)
5. [Bot Clients](#bot-clients)
6. [Task Queue System](#task-queue-system)

---

## 🔧 Backend API Functions

### 📁 `main.py` - FastAPI Application Entry Point

#### `lifespan(app: FastAPI)`
**Purpose**: Manages application startup and shutdown lifecycle
- **Startup**: Creates database tables, initializes session manager and queue manager
- **Shutdown**: Cleans up resources and connections
- **Error Handling**: Logs errors but continues initialization to prevent complete failure

#### `root()`
**Purpose**: Health check endpoint at "/"
- **Returns**: Application status, message, and version info
- **Use Case**: Basic connectivity testing

#### `test_endpoint()`
**Purpose**: Debug endpoint for external access testing
- **Returns**: Success message confirming external API access
- **Use Case**: Debugging external connectivity issues

#### `health_check()` & `api_health_check()`
**Purpose**: Comprehensive system health monitoring
- **Checks**: Database connection, Redis status, Celery worker status
- **Returns**: Detailed component health status
- **Use Case**: System monitoring and troubleshooting

#### `get_stats()`
**Purpose**: Retrieve system statistics
- **Data**: Telegram/Discord session counts, active queues, pending tasks
- **Use Case**: Dashboard metrics and monitoring

---

### 📁 `api/auth.py` - Authentication System

#### `create_access_token(data: dict, expires_delta: Optional[timedelta])`
**Purpose**: Generate JWT access tokens
- **Input**: User data dictionary and optional expiration time
- **Process**: Encodes user ID with expiration timestamp
- **Output**: JWT token string
- **Security**: Uses SECRET_KEY and HS256 algorithm

#### `create_refresh_token(data: dict)`
**Purpose**: Generate JWT refresh tokens for token renewal
- **Input**: User data dictionary
- **Process**: Creates longer-lived token with "refresh" type marker
- **Output**: JWT refresh token
- **Expiration**: 7 days by default

#### `verify_token(credentials: HTTPAuthorizationCredentials)`
**Purpose**: Validate and decode JWT tokens
- **Input**: Bearer token from Authorization header
- **Process**: Decodes JWT and extracts user ID
- **Output**: User ID if valid
- **Error Handling**: Raises 401 for invalid/expired tokens

#### `get_current_user(user_id: int, db: Session)`
**Purpose**: Retrieve authenticated user from database
- **Input**: User ID from verified token
- **Process**: Queries database for user record
- **Output**: User object
- **Error Handling**: Returns 401 if user not found

#### `hash_password(password: str)`
**Purpose**: Securely hash passwords using bcrypt
- **Input**: Plain text password
- **Process**: Generates salt and hashes password
- **Output**: Hashed password string
- **Security**: Uses bcrypt with auto-generated salt

#### `verify_password(plain_password: str, hashed_password: str)`
**Purpose**: Verify password against stored hash
- **Input**: Plain password and stored hash
- **Process**: Uses bcrypt to compare passwords
- **Output**: Boolean indicating match
- **Security**: Timing-safe comparison

#### `register(user_data: UserRegister, db: Session)`
**Purpose**: Create new user account
- **Validation**: Checks for existing username/email
- **Process**: Hashes password, creates user record
- **Output**: JWT tokens for immediate login
- **Default**: Sets user to "free" plan

#### `login(user_data: UserLogin, db: Session)`
**Purpose**: Authenticate existing user
- **Validation**: Verifies username and password
- **Security**: Checks account status (active/suspended)
- **Output**: JWT access and refresh tokens
- **Logging**: Records successful login events

#### `demo_login(db: Session)`
**Purpose**: Demonstration login for testing
- **Process**: Creates/finds demo user with pro plan
- **Credentials**: Username: "demo_user", Password: "demo123"
- **Output**: JWT tokens for demo account
- **Use Case**: Testing and demonstration purposes

#### `refresh_token(refresh_token: str, db: Session)`
**Purpose**: Renew access token using refresh token
- **Validation**: Verifies refresh token validity and type
- **Process**: Generates new access and refresh tokens
- **Output**: New token pair
- **Security**: Invalidates old refresh token

#### `get_current_user_info(current_user: User)`
**Purpose**: Return current user profile information
- **Input**: Authenticated user object
- **Output**: User details (ID, username, email, plan, status)
- **Use Case**: Profile display in frontend

#### `get_linked_accounts(current_user: User, db: Session)`
**Purpose**: Retrieve user's connected platform accounts
- **Query**: Finds active Telegram and Discord accounts
- **Output**: Lists of connected accounts with details
- **Use Case**: Account management dashboard

---

### 📁 `api/accounts.py` - Account Management

#### `get_telegram_accounts(current_user: User, db: Session)`
**Purpose**: List user's Telegram accounts
- **Filter**: Shows only accounts belonging to current user
- **Processing**: Converts database records to response format
- **Status Logic**: Determines connection status based on is_active field
- **Output**: List of TelegramAccountResponse objects

#### `get_discord_accounts(current_user: User, db: Session)`
**Purpose**: List user's Discord bot accounts
- **Filter**: Shows only accounts belonging to current user
- **Processing**: Generates display names for bots
- **Status Logic**: Shows connection status and guild counts
- **Output**: List of DiscordAccountResponse objects

#### `initiate_telegram_session(request: TelegramSessionRequest, current_user: User, db: Session)`
**Purpose**: Start Telegram account connection process
- **Plan Validation**: Checks free plan limit (1 account)
- **Duplicate Check**: Prevents adding same phone number twice
- **Demo Implementation**: Creates demo account for testing
- **Output**: Success message with session details
- **Error Handling**: Rolls back transaction on failure

#### `get_discord_auth_url(current_user: User)`
**Purpose**: Generate Discord OAuth2 authorization URL
- **Plan Restriction**: Requires Pro or Elite plan
- **State Generation**: Creates unique state parameter for security
- **Output**: OAuth2 URL and state for verification
- **Use Case**: Discord bot authorization flow

#### `reconnect_telegram_session(session_id: int, current_user: User, db: Session)`
**Purpose**: Reconnect disconnected Telegram session
- **Ownership Verification**: Ensures session belongs to user
- **Reconnection Logic**: Updates account status to active
- **Output**: Success/error message with connection status
- **Use Case**: Fixing connection issues

#### `reconnect_discord_session(session_id: int, current_user: User, db: Session)`
**Purpose**: Reconnect disconnected Discord bot
- **Ownership Verification**: Ensures bot belongs to user
- **Reconnection Logic**: Updates account status to active
- **Output**: Success/error message with connection status
- **Use Case**: Fixing bot connection issues

#### `switch_telegram_session(session_id: int, current_user: User, db: Session)`
**Purpose**: Change active Telegram session
- **Ownership Verification**: Ensures session belongs to user
- **Switching Logic**: Deactivates other sessions, activates selected one
- **Output**: Confirmation with active session details
- **Use Case**: Multi-account management

#### `switch_discord_session(session_id: int, current_user: User, db: Session)`
**Purpose**: Change active Discord bot
- **Ownership Verification**: Ensures bot belongs to user
- **Switching Logic**: Deactivates other bots, activates selected one
- **Output**: Confirmation with active bot details
- **Use Case**: Multi-bot management

#### `delete_telegram_session(session_id: int, current_user: User, db: Session)`
**Purpose**: Remove Telegram account
- **Ownership Verification**: Ensures session belongs to user
- **Cleanup**: Removes account record from database
- **Output**: Success confirmation
- **Use Case**: Account removal

#### `delete_discord_session(session_id: int, current_user: User, db: Session)`
**Purpose**: Remove Discord bot
- **Ownership Verification**: Ensures bot belongs to user
- **Cleanup**: Removes account record from database
- **Output**: Success confirmation
- **Use Case**: Bot removal

---

### 📁 `api/forwarding.py` - Forwarding Pairs Management

#### `validate_plan_limits(user: User, db: Session)`
**Purpose**: Check user's plan limits for forwarding pairs
- **Current Usage**: Counts active forwarding pairs
- **Plan Limits**: Defines max pairs and delay limits per plan
- **Output**: Dictionary with current usage and limits
- **Plans**: Free (3 pairs, 5min delay), Pro (50 pairs, 1min delay), Elite (500 pairs, no delay)

#### `validate_account_ownership(user_id: int, platform: str, account_id: int, db: Session)`
**Purpose**: Verify user owns specified account
- **Platform Support**: Handles both Telegram and Discord accounts
- **Ownership Check**: Queries database for account ownership
- **Status Verification**: Ensures account is active
- **Output**: Boolean indicating ownership

#### `list_forwarding_pairs(current_user: User, db: Session)`
**Purpose**: Get all user's forwarding pairs
- **Filtering**: Shows only pairs belonging to current user
- **Sorting**: Orders by creation date (newest first)
- **Output**: List of ForwardingPairResponse objects
- **Use Case**: Dashboard display

#### `create_forwarding_pair(pair_data: ForwardingPairCreate, current_user: User, db: Session)`
**Purpose**: Create new forwarding configuration
- **Plan Validation**: Checks pair and delay limits
- **Platform Validation**: Ensures valid platform names
- **Ownership Verification**: Confirms user owns source/destination accounts
- **Duplicate Prevention**: Checks for existing identical pairs
- **Database Creation**: Creates new ForwardingPair record
- **Output**: Created pair details

#### `update_forwarding_pair(pair_id: int, pair_data: ForwardingPairUpdate, current_user: User, db: Session)`
**Purpose**: Modify existing forwarding pair
- **Ownership Verification**: Ensures pair belongs to user
- **Selective Updates**: Only updates provided fields
- **Plan Validation**: Checks delay limits for plan
- **Timestamp Update**: Records modification time
- **Output**: Updated pair details

#### `delete_forwarding_pair(pair_id: int, current_user: User, db: Session)`
**Purpose**: Remove forwarding pair
- **Ownership Verification**: Ensures pair belongs to user
- **Database Deletion**: Removes pair record
- **Output**: Success confirmation
- **Use Case**: Pair management

#### `pause_forwarding_pair(pair_id: int, current_user: User, db: Session)`
**Purpose**: Temporarily disable forwarding pair
- **Ownership Verification**: Ensures pair belongs to user
- **Status Update**: Sets is_active to False
- **Timestamp Update**: Records modification time
- **Output**: Pause confirmation

#### `resume_forwarding_pair(pair_id: int, current_user: User, db: Session)`
**Purpose**: Re-enable paused forwarding pair
- **Ownership Verification**: Ensures pair belongs to user
- **Status Update**: Sets is_active to True
- **Timestamp Update**: Records modification time
- **Output**: Resume confirmation

#### `get_plan_limits(current_user: User, db: Session)`
**Purpose**: Get user's current plan limits and usage
- **Current Usage**: Calculates active pairs count
- **Plan Details**: Returns limits for user's current plan
- **Output**: Limits and usage information
- **Use Case**: Frontend plan display and validation

---

## 🎨 Frontend Components

### 📁 `src/App.tsx` - Main Application Component

#### `App()`
**Purpose**: Root application component with routing
- **Router Setup**: Configures React Router with authentication protection
- **Route Definition**: Maps URLs to page components
- **Protected Routes**: Wraps dashboard routes with authentication
- **Layout**: Applies DashboardLayout to authenticated pages

### 📁 `src/context/AuthContext.tsx` - Authentication State Management

#### `AuthProvider({ children })`
**Purpose**: Global authentication state management
- **State Management**: Manages user data, loading states, tokens
- **Token Storage**: Handles localStorage for token persistence
- **API Integration**: Provides login, logout, and user data functions
- **Context Provision**: Makes auth state available to all components

#### `login(credentials)`
**Purpose**: Authenticate user and store session
- **API Call**: Sends credentials to demo-login endpoint
- **Token Storage**: Saves JWT token to localStorage
- **User Fetch**: Retrieves user data after successful login
- **State Update**: Updates authentication state

#### `logout()`
**Purpose**: Clear user session and redirect
- **Token Removal**: Clears token from localStorage
- **State Reset**: Resets user and authentication state
- **Navigation**: Redirects to login page

#### `fetchUser()`
**Purpose**: Get current user data from API
- **API Call**: Retrieves user profile from /auth/me
- **Error Handling**: Handles token expiration and API errors
- **State Update**: Updates user data in context

### 📁 `src/layouts/DashboardLayout.tsx` - Dashboard Layout

#### `DashboardLayout({ children })`
**Purpose**: Common layout for authenticated pages
- **Sidebar Navigation**: Provides navigation menu with active state
- **Header**: Shows user info, plan badge, and logout button
- **Content Area**: Renders page-specific content
- **Responsive**: Adapts to different screen sizes

#### `SidebarItem({ to, icon: Icon, children })`
**Purpose**: Navigation menu item component
- **Active State**: Highlights current page
- **Icon Integration**: Displays Lucide React icons
- **Click Handling**: Navigates to specified route
- **Styling**: Applies consistent navigation styling

### 📁 `src/pages/DashboardHome.tsx` - Dashboard Overview

#### `DashboardHome()`
**Purpose**: Main dashboard page with system overview
- **Authentication**: Uses useAuth hook for user data
- **Statistics Display**: Shows forwarding pairs, accounts, plan info
- **Quick Actions**: Provides buttons for common operations
- **Status Indicators**: Displays system health status

#### `StatCard({ title, value, description, icon: Icon })`
**Purpose**: Reusable statistics display component
- **Visual Design**: Card-based layout with icon
- **Data Display**: Shows metric title, value, and description
- **Icon Support**: Integrates Lucide React icons
- **Styling**: Consistent card appearance

### 📁 `src/pages/ForwardingPairs.tsx` - Forwarding Management

#### `ForwardingPairs()`
**Purpose**: Manage forwarding pairs CRUD operations
- **Data Fetching**: Loads pairs from API
- **CRUD Operations**: Create, read, update, delete pairs
- **Modal Integration**: Uses AddPairModal for pair creation
- **Error Handling**: Displays API errors to user

#### `PairCard({ pair, onEdit, onDelete, onToggle })`
**Purpose**: Individual forwarding pair display and controls
- **Pair Information**: Shows source, destination, settings
- **Action Buttons**: Edit, delete, pause/resume controls
- **Status Display**: Visual status indicators
- **Event Handling**: Triggers parent component actions

#### `AddPairModal({ isOpen, onClose, onSubmit })`
**Purpose**: Modal for creating new forwarding pairs
- **Form Management**: Handles pair creation form
- **Validation**: Client-side form validation
- **API Integration**: Submits new pair data
- **Error Display**: Shows validation and API errors

### 📁 `src/pages/AccountsPage.tsx` - Account Management

#### `AccountsPage()`
**Purpose**: Manage Telegram and Discord account connections
- **Tab Navigation**: Switches between Telegram and Discord accounts
- **Account Listing**: Displays connected accounts with status
- **Account Actions**: Add, remove, reconnect accounts
- **Plan Enforcement**: Shows upgrade prompts for plan limits

#### `AccountCard({ account, type, onReconnect, onSwitch, onRemove })`
**Purpose**: Individual account display and management
- **Account Info**: Shows username, status, connection details
- **Action Buttons**: Reconnect, switch, remove controls
- **Status Indicators**: Visual connection status
- **Platform Icons**: Distinguishes Telegram and Discord accounts

### 📁 `src/pages/AnalyticsPage.tsx` - Analytics Dashboard

#### `AnalyticsPage()`
**Purpose**: Display forwarding statistics and analytics
- **Chart Integration**: Uses Recharts for data visualization
- **Date Filtering**: Allows filtering by date range
- **Export Functions**: CSV and PDF export capabilities
- **Plan Restrictions**: Limits features by plan tier

#### `VolumeChart({ data })`
**Purpose**: Bar chart for message volume over time
- **Data Visualization**: Shows forwarding volume trends
- **Interactive**: Hover tooltips and legends
- **Responsive**: Adapts to container size
- **Styling**: Consistent color scheme

#### `SuccessRateChart({ data })`
**Purpose**: Pie chart for success vs failure rates
- **Success Metrics**: Visualizes forwarding success rates
- **Color Coding**: Green for success, red for failures
- **Percentages**: Shows success rate percentages
- **Legend**: Interactive legend for data filtering

### 📁 `src/pages/SettingsPage.tsx` - User Settings

#### `SettingsPage()`
**Purpose**: User account and application settings
- **Profile Management**: Update user profile information
- **Preferences**: Theme, notification settings
- **Account Actions**: Delete account, plan management
- **Security**: Password change, API key management

### 📁 `src/pages/LoginPage.tsx` - Authentication

#### `LoginPage()`
**Purpose**: User authentication interface
- **Demo Login**: Quick demo authentication
- **Form Handling**: Manages login form state
- **Error Display**: Shows authentication errors
- **Redirect**: Navigates to dashboard on success

---

## 🔧 Services & Utilities

### 📁 `src/api/axiosInstance.ts` - HTTP Client Configuration

#### `api` (Axios Instance)
**Purpose**: Configured Axios client for API communication
- **Base URL**: Sets API base URL to '/api'
- **Request Interceptor**: Adds JWT token to requests
- **Response Interceptor**: Handles authentication errors
- **Error Handling**: Redirects on 401 errors

### 📁 `src/api/endpoints.ts` - API Endpoint Definitions

#### `authAPI`
**Purpose**: Authentication endpoint functions
- **login()**: Demo login API call
- **getCurrentUser()**: Get user profile
- **logout()**: Logout API call

#### `forwardingAPI`
**Purpose**: Forwarding pairs API functions
- **getPairs()**: Fetch forwarding pairs
- **createPair()**: Create new pair
- **updatePair()**: Update existing pair
- **deletePair()**: Remove pair

#### `accountsAPI`
**Purpose**: Account management API functions
- **getTelegramAccounts()**: Get Telegram accounts
- **getDiscordAccounts()**: Get Discord accounts
- **addTelegramAccount()**: Add Telegram account
- **removeAccount()**: Remove account

### 📁 `services/session_manager.py` - Session Management Service

#### `SessionManager`
**Purpose**: Manages Telegram and Discord client sessions
- **Initialization**: Sets up session managers for both platforms
- **Health Monitoring**: Tracks session health and connectivity
- **Session Counts**: Provides session statistics
- **Cleanup**: Properly closes sessions on shutdown

#### `initialize()`
**Purpose**: Initialize session managers
- **Telegram Setup**: Initializes Telegram client manager
- **Discord Setup**: Initializes Discord client manager
- **Error Handling**: Logs initialization errors
- **Health Checks**: Starts health monitoring

#### `get_telegram_session_count()`
**Purpose**: Get number of active Telegram sessions
- **Count Retrieval**: Queries Telegram client manager
- **Return**: Integer count of active sessions

#### `get_discord_session_count()`
**Purpose**: Get number of active Discord sessions
- **Count Retrieval**: Queries Discord client manager
- **Return**: Integer count of active bot sessions

#### `cleanup()`
**Purpose**: Clean up all sessions on shutdown
- **Telegram Cleanup**: Closes all Telegram clients
- **Discord Cleanup**: Closes all Discord bots
- **Resource Management**: Ensures proper resource cleanup

### 📁 `services/queue_manager.py` - Task Queue Management

#### `QueueManager`
**Purpose**: Manages Redis-based task queues for message processing
- **Redis Connection**: Manages Redis client for queue operations
- **Queue Creation**: Sets up priority-based queues
- **Task Scheduling**: Schedules forwarding tasks
- **Health Monitoring**: Monitors queue health and performance

#### `initialize()`
**Purpose**: Initialize queue manager and Redis connection
- **Redis Setup**: Establishes Redis connection
- **Queue Creation**: Creates high, medium, low priority queues
- **Celery Integration**: Connects with Celery task system
- **Error Handling**: Handles Redis connection failures

#### `get_active_queue_count()`
**Purpose**: Get number of active queues
- **Queue Monitoring**: Checks active queue status
- **Return**: Count of operational queues

#### `get_pending_task_count()`
**Purpose**: Get number of pending tasks across all queues
- **Task Counting**: Sums pending tasks in all priority queues
- **Return**: Total pending task count

#### `cleanup()`
**Purpose**: Clean up queue connections
- **Redis Cleanup**: Closes Redis connections
- **Resource Management**: Ensures proper cleanup

---

## 🗄 Database Models

### 📁 `database/models.py` - SQLAlchemy Models

#### `User` Model
**Purpose**: Stores user account information
- **Fields**: ID, username, email, password_hash, plan, status
- **Relationships**: One-to-many with accounts and forwarding pairs
- **Methods**: User authentication and profile management
- **Plan Limits**: Enforces plan-based feature restrictions

#### `TelegramAccount` Model
**Purpose**: Manages Telegram account sessions
- **Fields**: User ID, phone number, session data, status
- **Encryption**: Session data is encrypted for security
- **Status Tracking**: Tracks connection status and last seen
- **Relationships**: Belongs to User, used in ForwardingPair

#### `DiscordAccount` Model
**Purpose**: Manages Discord bot accounts
- **Fields**: User ID, bot token, bot name, status, servers
- **Token Security**: Bot tokens stored securely
- **Server Tracking**: Tracks connected Discord servers
- **Relationships**: Belongs to User, used in ForwardingPair

#### `ForwardingPair` Model
**Purpose**: Defines message forwarding configurations
- **Fields**: Source/destination channels, delay, settings
- **Platform Support**: Handles cross-platform forwarding
- **Advanced Settings**: Filters, prefixes, copy mode
- **Relationships**: Links to User and Account models

#### `PaymentHistory` Model
**Purpose**: Tracks user payment transactions
- **Fields**: Payment type, status, amount, currency
- **Gateway Integration**: Stores payment gateway responses
- **Plan Tracking**: Links payments to plan purchases
- **Audit Trail**: Complete payment history tracking

#### `ErrorLog` Model
**Purpose**: System error logging and tracking
- **Fields**: Error type, message, stack trace, severity
- **Context Data**: Additional error context information
- **User Association**: Links errors to specific users
- **Resolution Tracking**: Tracks error resolution status

---

## 🤖 Bot Clients

### 📁 `bots/telegram_client.py` - Telegram Client Management

#### `TelegramClient`
**Purpose**: Multi-account Telegram client using Pyrogram
- **Session Management**: Handles multiple Telegram sessions
- **Authentication**: Manages OTP-based account verification
- **Message Operations**: Send and forward messages
- **Health Monitoring**: Monitors session health and reconnection

#### `initialize()`
**Purpose**: Initialize Telegram client manager
- **Session Loading**: Loads existing sessions from database
- **Health Checker**: Starts session health monitoring
- **Error Handling**: Handles initialization failures gracefully

#### `add_account(user_id: int, phone_number: str)`
**Purpose**: Add new Telegram account with OTP verification
- **Plan Validation**: Checks user's plan limits
- **OTP Sending**: Sends verification code to phone
- **Database Creation**: Creates pending account record
- **Return**: Account ID and verification hash

#### `verify_account(account_id: int, otp_code: str, phone_hash: str)`
**Purpose**: Verify Telegram account with OTP
- **OTP Verification**: Validates OTP code with Telegram
- **Session Creation**: Creates and stores session string
- **Database Update**: Updates account status to active
- **Client Start**: Starts Telegram client for account

#### `remove_account(account_id: int)`
**Purpose**: Remove Telegram account and cleanup
- **Client Shutdown**: Stops running Telegram client
- **File Cleanup**: Removes session files
- **Database Update**: Marks account as inactive
- **Error Handling**: Handles cleanup errors

#### `send_message(account_id: int, chat_id: str, message: str)`
**Purpose**: Send message using specific Telegram account
- **Client Lookup**: Finds client for account
- **Message Sending**: Sends message to specified chat
- **Error Handling**: Logs and handles sending errors
- **Return**: Boolean success status

#### `forward_message(account_id: int, from_chat_id: str, to_chat_id: str, message_id: int)`
**Purpose**: Forward message between chats
- **Client Lookup**: Finds client for account
- **Message Forwarding**: Forwards specific message
- **Error Handling**: Logs forwarding errors
- **Return**: Boolean success status

### 📁 `bots/discord_client.py` - Discord Bot Management

#### `DiscordClient`
**Purpose**: Multi-server Discord bot management using discord.py
- **Bot Management**: Handles multiple Discord bots
- **Guild Operations**: Manages server connections
- **Message Operations**: Send and forward messages
- **Health Monitoring**: Monitors bot health and reconnection

#### `initialize()`
**Purpose**: Initialize Discord client manager
- **Bot Loading**: Loads existing bots from database
- **Health Checker**: Starts bot health monitoring
- **Event Handlers**: Sets up bot event handlers

#### `add_account(user_id: int, discord_token: str, server_ids: List[str])`
**Purpose**: Add new Discord bot account
- **Plan Validation**: Checks user's plan limits
- **Token Validation**: Validates Discord bot token
- **Bot Creation**: Creates and starts Discord bot
- **Database Storage**: Stores bot information

#### `remove_account(account_id: int)`
**Purpose**: Remove Discord bot account
- **Bot Shutdown**: Stops running Discord bot
- **Database Update**: Marks account as inactive
- **Resource Cleanup**: Cleans up bot resources

#### `send_message(account_id: int, channel_id: int, message: str, embed: discord.Embed)`
**Purpose**: Send message using Discord bot
- **Bot Lookup**: Finds bot for account
- **Channel Lookup**: Finds Discord channel
- **Message Sending**: Sends text or embed message
- **Error Handling**: Handles sending errors

#### `forward_message(account_id: int, to_channel_id: int, message_content: str, attachments: List[Any])`
**Purpose**: Forward message to Discord channel
- **Bot Lookup**: Finds bot for account
- **Channel Lookup**: Finds destination channel
- **Content Processing**: Handles text and attachments
- **Message Sending**: Sends forwarded content

#### `get_server_channels(account_id: int, server_id: int)`
**Purpose**: Get channels for specific Discord server
- **Bot Lookup**: Finds bot for account
- **Guild Lookup**: Finds Discord server
- **Channel Enumeration**: Lists text and voice channels
- **Return**: List of channel information

---

## ⚙️ Task Queue System

### 📁 `tasks/celery_config.py` - Celery Configuration

#### `create_celery_app()`
**Purpose**: Configure and create Celery application
- **Redis Configuration**: Sets up Redis as broker and result backend
- **Queue Setup**: Creates priority-based queues
- **Task Discovery**: Auto-discovers task modules
- **Error Handling**: Configures task failure handling

#### `task_success_handler(sender, result, **kwargs)`
**Purpose**: Handle successful task completion
- **Logging**: Records task success in logs
- **Database Update**: Updates task status in database
- **Metrics**: Updates success metrics

#### `task_failure_handler(sender, task_id, exception, einfo, **kwargs)`
**Purpose**: Handle task failures and retries
- **Error Logging**: Records task failures with stack traces
- **Retry Logic**: Implements intelligent retry mechanisms
- **Database Update**: Updates task status and error information

### 📁 `tasks/forwarding_tasks.py` - Message Forwarding Tasks

#### `forward_message_task(pair_id: int, message_data: dict)`
**Purpose**: Asynchronous message forwarding between platforms
- **Pair Lookup**: Finds forwarding pair configuration
- **Platform Routing**: Routes message to appropriate platform
- **Delay Handling**: Implements configured forwarding delays
- **Error Handling**: Retries failed forwards with exponential backoff

#### `send_message_task(account_id: int, platform: str, chat_id: str, message: str)`
**Purpose**: Send message using specific platform account
- **Platform Selection**: Routes to Telegram or Discord client
- **Account Lookup**: Finds specified account
- **Message Delivery**: Sends message to destination
- **Status Tracking**: Records delivery status

#### `bulk_forward_task(pair_ids: List[int], message_data: dict)`
**Purpose**: Bulk forwarding to multiple destinations
- **Batch Processing**: Processes multiple pairs efficiently
- **Parallel Execution**: Uses threading for concurrent forwarding
- **Progress Tracking**: Tracks bulk operation progress
- **Error Aggregation**: Collects and reports bulk errors

#### `session_health_check_task()`
**Purpose**: Periodic health checking of all sessions
- **Session Scanning**: Checks all active sessions
- **Connection Testing**: Tests session connectivity
- **Auto-Recovery**: Attempts to reconnect failed sessions
- **Status Reporting**: Updates session status in database

#### `cleanup_task()`
**Purpose**: Cleanup old logs and temporary data
- **Log Rotation**: Removes old log entries
- **Temporary File Cleanup**: Cleans up temporary files
- **Database Maintenance**: Optimizes database performance
- **Storage Management**: Manages disk space usage

---

## 🔧 Utility Functions

### 📁 `utils/logger.py` - Logging Configuration

#### `setup_logger(name: str, level: str)`
**Purpose**: Configure application logging
- **Logger Creation**: Creates named logger instances
- **Format Configuration**: Sets consistent log formatting
- **Handler Setup**: Configures file and console handlers
- **Level Setting**: Sets appropriate logging levels

### 📁 `utils/env_loader.py` - Environment Management

#### `load_environment()`
**Purpose**: Load and validate environment variables
- **File Loading**: Loads .env file if present
- **Validation**: Validates required environment variables
- **Defaults**: Sets default values for optional variables
- **Error Handling**: Reports missing required variables

#### `get_jwt_secret()`
**Purpose**: Retrieve JWT secret key
- **Environment Lookup**: Checks for JWT_SECRET environment variable
- **Fallback**: Uses development key if not found
- **Security Warning**: Warns about using development key

### 📁 `src/utils/cn.ts` - CSS Class Utilities

#### `cn(...classes: string[])`
**Purpose**: Utility for conditional CSS classes
- **Class Merging**: Combines multiple CSS classes
- **Conditional Logic**: Handles conditional class application
- **Tailwind Integration**: Works with Tailwind CSS utilities
- **Type Safety**: Provides TypeScript type safety

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Token Refresh**: Automatic token renewal
- **Session Management**: Secure session handling

### API Security
- **CORS Configuration**: Proper cross-origin request handling
- **Rate Limiting**: API rate limiting per user plan
- **Input Validation**: Comprehensive input validation
- **Error Handling**: Secure error message handling

### Data Protection
- **Session Encryption**: Encrypted storage of session data
- **Token Security**: Secure token storage and transmission
- **Database Security**: Parameterized queries prevent SQL injection
- **File Security**: Secure file handling and storage

---

## 📊 Monitoring & Analytics

### Health Monitoring
- **System Health**: Real-time system component monitoring
- **Session Health**: Continuous session connectivity checking
- **Queue Monitoring**: Task queue performance monitoring
- **Error Tracking**: Comprehensive error logging and tracking

### Performance Metrics
- **Message Volume**: Tracking of forwarding volume
- **Success Rates**: Monitoring of forwarding success rates
- **Response Times**: API response time monitoring
- **Resource Usage**: System resource utilization tracking

### User Analytics
- **Usage Statistics**: User activity and feature usage
- **Plan Analytics**: Plan-based feature usage analysis
- **Error Analysis**: User-specific error analysis
- **Performance Reports**: User-facing performance reports

---

This comprehensive documentation covers every major function and component in the AutoForwardX project. Each function is explained with its purpose, inputs, outputs, processing logic, error handling, and use cases. This should serve as a complete reference for understanding and maintaining the project.
