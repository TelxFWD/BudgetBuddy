# Multi-Platform Message Forwarding Backend

A comprehensive FastAPI backend for multi-platform message forwarding between Telegram and Discord with queue processing and subscription management.

## Features

- **Multi-Platform Support**: Forward messages between Telegram and Discord
- **Queue Processing**: Redis-based queue system with Celery for background processing
- **Subscription Management**: Feature gating based on user subscription plans
- **Session Management**: Multi-account session handling for both platforms
- **Error Handling**: Comprehensive error logging and automatic retry mechanisms
- **Health Monitoring**: Session health checks and auto-reconnect logic
- **Rate Limiting**: Plan-based rate limiting and delay management

## Architecture

### Core Components

- **FastAPI**: RESTful API framework for backend services
- **PostgreSQL**: Primary database for data persistence
- **Redis + Celery**: Background task processing and queue management
- **Pyrogram**: Telegram client library for session management
- **Discord.py**: Discord bot integration for multi-server support

### Database Schema

- **Users**: User accounts with subscription plans and limits
- **Telegram Accounts**: Multi-account Telegram session management
- **Discord Accounts**: Discord bot tokens and server configurations
- **Forwarding Pairs**: Message forwarding configurations
- **Payment History**: Subscription and payment tracking
- **API Keys**: User API key management
- **Error Logs**: System error tracking and monitoring

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
