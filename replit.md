# Message Forwarding Backend System

## Overview

This is a comprehensive FastAPI backend for multi-platform message forwarding between Telegram and Discord. The system features queue-based processing, subscription management, and multi-account session handling. It's designed as a scalable, error-resistant backend with proper separation of concerns.

## System Architecture

### Core Framework
- **FastAPI**: RESTful API framework for backend services
- **PostgreSQL**: Primary database for data persistence with SQLAlchemy ORM
- **Redis + Celery**: Background task processing and queue management
- **Alembic**: Database migration management

### Client Libraries
- **Pyrogram**: Telegram client library for session management
- **Discord.py**: Discord bot integration for multi-server support

### Key Design Principles
- Asynchronous processing for message forwarding
- Multi-account session management
- Feature gating based on subscription plans
- Comprehensive error handling and logging
- Health monitoring with auto-reconnect logic

## Key Components

### 1. Database Layer (`database/`)
- **Models**: Complete SQLAlchemy models for users, accounts, forwarding pairs, payments, and error tracking
- **Schemas**: Pydantic models for API validation and serialization
- **Migrations**: Alembic configuration for database schema management

### 2. Bot Clients (`bots/`)
- **TelegramClient**: Multi-account Telegram session manager using Pyrogram
- **DiscordClient**: Multi-server Discord bot manager using discord.py
- Both clients support session persistence, health checking, and automatic reconnection

### 3. Services Layer (`services/`)
- **SessionManager**: Coordinates between Telegram and Discord clients
- **QueueManager**: Handles Redis/Celery queue operations and task distribution
- **FeatureGating**: Implements subscription plan validation and access control

### 4. Task Processing (`tasks/`)
- **Celery Configuration**: Queue setup with priority-based routing
- **Forwarding Tasks**: Background tasks for message processing, session management, and cleanup

### 5. Utilities (`utils/`)
- **Environment Loader**: Validates and loads configuration from environment variables
- **Logger**: Centralized logging with configurable levels and formatting

## Data Flow

### Message Forwarding Process
1. API receives forwarding request
2. Feature gating validates user permissions
3. Task queued in Redis based on user's plan priority
4. Celery worker processes task asynchronously
5. Session manager coordinates with appropriate bot client
6. Message forwarded between platforms
7. Results logged and stored

### Session Management
1. Sessions loaded from database on startup
2. Health checker monitors connection status
3. Automatic reconnection on failures
4. Session data encrypted and persisted

### Queue Processing
- **High Priority**: Elite plan users, system health checks
- **Medium Priority**: Pro plan users, regular forwarding
- **Low Priority**: Free plan users, bulk operations, cleanup

## External Dependencies

### Required Services
- **PostgreSQL Database**: Primary data storage
- **Redis Server**: Queue backend and caching
- **Telegram API**: API credentials (API_ID, API_HASH)

### Optional Integrations
- **Payment Gateways**: PayPal, NowPayments (prepared but not implemented)
- **Monitoring**: Log file output supported
- **Webhooks**: Infrastructure prepared for webhook support

## Deployment Strategy

### Environment Configuration
- All sensitive data in environment variables
- Separate configuration for development/production
- Database and Redis URLs configurable
- Logging levels and formats configurable

### Scaling Considerations
- Celery workers can be scaled horizontally
- Database connection pooling configured
- Redis cluster support ready
- Session data stored persistently for worker restarts

### Health Monitoring
- Session health checks every 5 minutes (configurable)
- Database connection health monitoring
- Error logging with severity levels
- Queue status monitoring capabilities

## Changelog
- June 28, 2025: Initial setup and foundation architecture
- June 28, 2025: Complete backend implementation with all Core API endpoints
- June 28, 2025: Admin Panel APIs with IP whitelisting and user management
- June 28, 2025: Payment processing system with PayPal and crypto support
- June 28, 2025: Analytics APIs with real-time statistics and reporting
- June 28, 2025: Full authentication system with JWT tokens and bcrypt

## User Preferences

Preferred communication style: Simple, everyday language.