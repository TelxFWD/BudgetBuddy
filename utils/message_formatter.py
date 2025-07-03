"""
Message formatting utilities for Pro/Elite plan features.
Handles header/footer removal and custom header/footer injection.
"""

from typing import Optional
from database.models import ForwardingPair


def remove_existing_header(message: str) -> str:
    """Remove the first line of a message (assumed to be header)."""
    lines = message.split("\n")
    if len(lines) > 1:
        return "\n".join(lines[1:])
    return message


def remove_existing_footer(message: str) -> str:
    """Remove the last line of a message (assumed to be footer)."""
    lines = message.split("\n")
    if len(lines) > 1:
        return "\n".join(lines[:-1])
    return message


def apply_message_formatting(message: str, pair: ForwardingPair) -> str:
    """
    Apply message formatting controls based on forwarding pair settings.
    
    Args:
        message: Original message text
        pair: ForwardingPair object with formatting settings
        
    Returns:
        Formatted message with applied header/footer modifications
    """
    formatted_message = message
    
    # Step 1: Remove existing header if requested
    if pair.remove_header:
        formatted_message = remove_existing_header(formatted_message)
    
    # Step 2: Remove existing footer if requested
    if pair.remove_footer:
        formatted_message = remove_existing_footer(formatted_message)
    
    # Step 3: Add custom header if provided
    if pair.custom_header:
        formatted_message = f"{pair.custom_header}\n{formatted_message}"
    
    # Step 4: Add custom footer if provided
    if pair.custom_footer:
        formatted_message = f"{formatted_message}\n{pair.custom_footer}"
    
    return formatted_message


def validate_formatting_permissions(user_plan: str) -> bool:
    """
    Check if user has permission to use message formatting controls.
    
    Args:
        user_plan: User's subscription plan
        
    Returns:
        True if user can use formatting controls, False otherwise
    """
    return user_plan in ["pro", "elite"]