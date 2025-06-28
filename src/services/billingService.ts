import axios from 'axios';

const API_BASE = '/api';

export interface PlanLimits {
  maxPairs: number;
  maxAccounts: number;
  maxTelegramAccounts: number;
  maxDiscordAccounts: number;
  features: string[];
}

export interface PaymentMethod {
  id: string;
  type: 'paypal' | 'crypto';
  name: string;
  supported: boolean;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  billingCycle: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  expiresAt?: string;
}

export interface BillingInfo {
  currentPlan: string;
  planExpiresAt?: string;
  planLimits: PlanLimits;
  currentUsage: {
    activePairs: number;
    connectedAccounts: number;
    messagesThisMonth: number;
  };
  paymentMethods: PaymentMethod[];
  nextBilling?: {
    amount: number;
    date: string;
  };
}

export interface CouponValidation {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  message: string;
}

export class BillingService {
  static async getBillingInfo(): Promise<BillingInfo> {
    const response = await axios.get(`${API_BASE}/billing/info`);
    return response.data;
  }

  static async getPaymentHistory(): Promise<PaymentHistory[]> {
    const response = await axios.get(`${API_BASE}/billing/history`);
    return response.data;
  }

  static async createPayment(plan: string, billingCycle: string, paymentMethod: string, couponCode?: string) {
    const response = await axios.post(`${API_BASE}/payments/create`, {
      plan,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      coupon_code: couponCode
    });
    return response.data;
  }

  static async validateCoupon(code: string, plan: string): Promise<CouponValidation> {
    const response = await axios.post(`${API_BASE}/payments/validate-coupon`, {
      coupon_code: code,
      plan
    });
    return response.data;
  }

  static async cancelSubscription() {
    const response = await axios.post(`${API_BASE}/billing/cancel`);
    return response.data;
  }

  static async downloadInvoice(paymentId: string) {
    const response = await axios.get(`${API_BASE}/billing/invoice/${paymentId}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  static getPlanLimits(plan: string): PlanLimits {
    const planConfigs = {
      free: {
        maxPairs: 2,
        maxAccounts: 2,
        maxTelegramAccounts: 1,
        maxDiscordAccounts: 1,
        features: ['basic_forwarding']
      },
      pro: {
        maxPairs: 15,
        maxAccounts: 5,
        maxTelegramAccounts: 3,
        maxDiscordAccounts: 2,
        features: ['basic_forwarding', 'discord_forwarding', 'copy_mode', 'delay_settings']
      },
      elite: {
        maxPairs: 100,
        maxAccounts: 20,
        maxTelegramAccounts: 10,
        maxDiscordAccounts: 10,
        features: ['basic_forwarding', 'discord_forwarding', 'copy_mode', 'delay_settings', 'webhook_integration', 'api_access', 'chain_forwarding', 'advanced_analytics']
      }
    };
    
    return planConfigs[plan] || planConfigs.free;
  }

  static getPlanPrice(plan: string, billingCycle: string): number {
    const prices = {
      pro: {
        monthly: 9.99,
        yearly: 99.99
      },
      elite: {
        monthly: 19.99,
        yearly: 199.99
      }
    };
    
    return prices[plan]?.[billingCycle] || 0;
  }
}