"""
Payment System API endpoints for processing payments, webhooks, and subscription management.
Handles PayPal and NowPayments integration with real-time plan updates.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import hashlib
import hmac
import json

from database.db import get_db
from database.models import User, Payment, Coupon
from api.auth import get_current_user
from utils.logger import logger

router = APIRouter(prefix="/payments", tags=["payments"])

# Payment configuration - move to environment variables in production
PAYPAL_WEBHOOK_ID = "your-paypal-webhook-id"
NOWPAYMENTS_API_KEY = "your-nowpayments-api-key"
NOWPAYMENTS_IPN_SECRET = "your-nowpayments-ipn-secret"

# Pydantic models
class PaymentCreateRequest(BaseModel):
    plan: str  # "pro" or "elite"
    payment_method: str  # "paypal" or "crypto"
    billing_cycle: str = "monthly"  # "monthly" or "yearly"
    coupon_code: Optional[str] = None

class PaymentResponse(BaseModel):
    payment_id: str
    payment_url: str
    amount: float
    currency: str
    expires_at: datetime

class CouponRequest(BaseModel):
    code: str
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    valid_until: datetime
    usage_limit: int = 1
    plan_restriction: Optional[str] = None

class PayPalWebhookData(BaseModel):
    id: str
    event_type: str
    resource: Dict[Any, Any]

class NowPaymentsWebhookData(BaseModel):
    payment_id: str
    payment_status: str
    pay_address: str
    price_amount: float
    price_currency: str
    pay_amount: float
    pay_currency: str
    order_id: str
    order_description: str

# Pricing configuration
PRICING = {
    "pro": {
        "monthly": {"usd": 9.99, "eur": 8.99},
        "yearly": {"usd": 99.99, "eur": 89.99}
    },
    "elite": {
        "monthly": {"usd": 19.99, "eur": 17.99},
        "yearly": {"usd": 199.99, "eur": 179.99}
    }
}

def get_payment_amount(plan: str, billing_cycle: str, currency: str = "usd") -> float:
    """Get payment amount for plan and billing cycle."""
    if plan not in PRICING or billing_cycle not in PRICING[plan]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan or billing cycle"
        )
    
    return PRICING[plan][billing_cycle].get(currency, PRICING[plan][billing_cycle]["usd"])

def apply_coupon(amount: float, coupon_code: str, db: Session) -> tuple[float, Optional[Coupon]]:
    """Apply coupon discount to payment amount."""
    if not coupon_code:
        return amount, None
    
    coupon = db.query(Coupon).filter(
        Coupon.code == coupon_code,
        Coupon.is_active == True,
        Coupon.valid_until >= datetime.utcnow(),
        Coupon.usage_count < Coupon.usage_limit
    ).first()
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired coupon code"
        )
    
    if coupon.discount_percent:
        discounted_amount = amount * (1 - coupon.discount_percent / 100)
    elif coupon.discount_amount:
        discounted_amount = max(0, amount - coupon.discount_amount)
    else:
        discounted_amount = amount
    
    return discounted_amount, coupon

@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    payment_request: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new payment session."""
    # Validate plan
    if payment_request.plan not in ["pro", "elite"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan. Must be 'pro' or 'elite'"
        )
    
    # Get base amount
    amount = get_payment_amount(payment_request.plan, payment_request.billing_cycle)
    
    # Apply coupon if provided
    discounted_amount, coupon = apply_coupon(amount, payment_request.coupon_code, db)
    
    # Create payment record
    payment = Payment(
        user_id=current_user.id,
        plan=payment_request.plan,
        billing_cycle=payment_request.billing_cycle,
        payment_method=payment_request.payment_method,
        amount=discounted_amount,
        original_amount=amount,
        currency="usd",
        status="pending",
        coupon_id=coupon.id if coupon else None
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    # Generate payment URL based on method
    if payment_request.payment_method == "paypal":
        payment_url = f"https://paypal.com/checkout?payment_id={payment.id}"
    elif payment_request.payment_method == "crypto":
        payment_url = f"https://nowpayments.io/payment/{payment.id}"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment method"
        )
    
    # Update payment with external ID (in real implementation, this would come from payment provider)
    payment.external_payment_id = f"ext_{payment.id}_{payment_request.payment_method}"
    db.commit()
    
    logger.info(f"Payment created: {payment.id} for user {current_user.username}, plan {payment_request.plan}")
    
    return PaymentResponse(
        payment_id=payment.external_payment_id,
        payment_url=payment_url,
        amount=discounted_amount,
        currency="usd",
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )

@router.post("/webhooks/paypal")
async def paypal_webhook(
    request: Request,
    webhook_data: PayPalWebhookData,
    db: Session = Depends(get_db)
):
    """Handle PayPal webhook notifications."""
    # In production, verify PayPal webhook signature
    # headers = request.headers
    # body = await request.body()
    # if not verify_paypal_webhook(headers, body):
    #     raise HTTPException(status_code=400, detail="Invalid webhook signature")
    
    if webhook_data.event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Extract payment info
        resource = webhook_data.resource
        external_payment_id = resource.get("custom_id") or resource.get("id")
        
        # Find payment in database
        payment = db.query(Payment).filter(
            Payment.external_payment_id == external_payment_id
        ).first()
        
        if not payment:
            logger.warning(f"PayPal webhook: Payment not found for ID {external_payment_id}")
            return {"status": "payment_not_found"}
        
        # Update payment status
        payment.status = "completed"
        payment.completed_at = datetime.utcnow()
        payment.provider_transaction_id = resource.get("id")
        
        # Update user plan
        user = db.query(User).filter(User.id == payment.user_id).first()
        if user:
            user.plan = payment.plan
            user.plan_expires_at = datetime.utcnow() + timedelta(
                days=365 if payment.billing_cycle == "yearly" else 30
            )
            user.updated_at = datetime.utcnow()
        
        # Update coupon usage if applicable
        if payment.coupon_id:
            coupon = db.query(Coupon).filter(Coupon.id == payment.coupon_id).first()
            if coupon:
                coupon.usage_count += 1
        
        db.commit()
        
        logger.info(f"PayPal payment completed: {payment.id}, user {user.username} upgraded to {payment.plan}")
        
        return {"status": "success"}
    
    elif webhook_data.event_type == "PAYMENT.CAPTURE.DENIED":
        external_payment_id = webhook_data.resource.get("custom_id") or webhook_data.resource.get("id")
        payment = db.query(Payment).filter(
            Payment.external_payment_id == external_payment_id
        ).first()
        
        if payment:
            payment.status = "failed"
            payment.completed_at = datetime.utcnow()
            db.commit()
            
        logger.info(f"PayPal payment failed: {external_payment_id}")
        return {"status": "payment_failed"}
    
    return {"status": "event_not_handled"}

@router.post("/webhooks/nowpayments")
async def nowpayments_webhook(
    request: Request,
    webhook_data: NowPaymentsWebhookData,
    db: Session = Depends(get_db)
):
    """Handle NowPayments IPN webhook notifications."""
    # Verify IPN signature in production
    # headers = request.headers
    # body = await request.body()
    # if not verify_nowpayments_ipn(headers, body):
    #     raise HTTPException(status_code=400, detail="Invalid IPN signature")
    
    # Find payment by order_id (which should be our payment.id)
    try:
        payment_id = int(webhook_data.order_id)
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
    except (ValueError, TypeError):
        logger.warning(f"NowPayments webhook: Invalid order_id {webhook_data.order_id}")
        return {"status": "invalid_order_id"}
    
    if not payment:
        logger.warning(f"NowPayments webhook: Payment not found for order_id {webhook_data.order_id}")
        return {"status": "payment_not_found"}
    
    # Update payment with crypto details
    payment.provider_transaction_id = webhook_data.payment_id
    payment.crypto_address = webhook_data.pay_address
    payment.crypto_amount = webhook_data.pay_amount
    payment.crypto_currency = webhook_data.pay_currency
    
    if webhook_data.payment_status in ["finished", "confirmed"]:
        payment.status = "completed"
        payment.completed_at = datetime.utcnow()
        
        # Update user plan
        user = db.query(User).filter(User.id == payment.user_id).first()
        if user:
            user.plan = payment.plan
            user.plan_expires_at = datetime.utcnow() + timedelta(
                days=365 if payment.billing_cycle == "yearly" else 30
            )
            user.updated_at = datetime.utcnow()
        
        # Update coupon usage if applicable
        if payment.coupon_id:
            coupon = db.query(Coupon).filter(Coupon.id == payment.coupon_id).first()
            if coupon:
                coupon.usage_count += 1
        
        logger.info(f"Crypto payment completed: {payment.id}, user {user.username} upgraded to {payment.plan}")
        
    elif webhook_data.payment_status in ["failed", "refunded", "expired"]:
        payment.status = "failed"
        payment.completed_at = datetime.utcnow()
        
        logger.info(f"Crypto payment failed: {payment.id}, status: {webhook_data.payment_status}")
    
    db.commit()
    return {"status": "success"}

@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payment history."""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()
    
    payment_history = []
    for payment in payments:
        payment_history.append({
            "id": payment.id,
            "plan": payment.plan,
            "billing_cycle": payment.billing_cycle,
            "amount": payment.amount,
            "currency": payment.currency,
            "payment_method": payment.payment_method,
            "status": payment.status,
            "created_at": payment.created_at,
            "completed_at": payment.completed_at,
            "provider_transaction_id": payment.provider_transaction_id
        })
    
    return {"payments": payment_history}

@router.get("/status/{payment_id}")
async def get_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of a specific payment."""
    payment = db.query(Payment).filter(
        Payment.external_payment_id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return {
        "payment_id": payment.external_payment_id,
        "status": payment.status,
        "plan": payment.plan,
        "amount": payment.amount,
        "currency": payment.currency,
        "created_at": payment.created_at,
        "completed_at": payment.completed_at
    }

@router.post("/coupons", dependencies=[Depends(get_current_user)])
async def create_coupon(
    coupon_request: CouponRequest,
    db: Session = Depends(get_db)
):
    """Create a new coupon (admin only in production)."""
    # Check if coupon code already exists
    existing_coupon = db.query(Coupon).filter(Coupon.code == coupon_request.code).first()
    if existing_coupon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon code already exists"
        )
    
    coupon = Coupon(
        code=coupon_request.code,
        discount_percent=coupon_request.discount_percent,
        discount_amount=coupon_request.discount_amount,
        valid_until=coupon_request.valid_until,
        usage_limit=coupon_request.usage_limit,
        plan_restriction=coupon_request.plan_restriction,
        is_active=True,
        usage_count=0
    )
    
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    
    logger.info(f"Coupon created: {coupon.code}")
    
    return {"message": "Coupon created successfully", "coupon_id": coupon.id}

@router.post("/validate-coupon")
async def validate_coupon(
    coupon_code: str,
    plan: str,
    db: Session = Depends(get_db)
):
    """Validate a coupon code."""
    coupon = db.query(Coupon).filter(
        Coupon.code == coupon_code,
        Coupon.is_active == True,
        Coupon.valid_until >= datetime.utcnow(),
        Coupon.usage_count < Coupon.usage_limit
    ).first()
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired coupon code"
        )
    
    if coupon.plan_restriction and coupon.plan_restriction != plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coupon is only valid for {coupon.plan_restriction} plan"
        )
    
    return {
        "valid": True,
        "discount_percent": coupon.discount_percent,
        "discount_amount": coupon.discount_amount,
        "description": f"Save {coupon.discount_percent}%" if coupon.discount_percent else f"Save ${coupon.discount_amount}"
    }