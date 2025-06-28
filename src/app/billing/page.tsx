'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Crown, 
  Star, 
  Check, 
  X,
  Calendar,
  DollarSign,
  Zap,
  Shield,
  Users,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/apiService';

export default function BillingPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      const response = await apiService.get('/payments/history');
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: 0,
      period: 'forever',
      color: 'border-gray-400',
      icon: Users,
      current: user?.plan === 'free',
      features: [
        { text: '2 Forwarding Pairs', included: true },
        { text: '1 Telegram Account', included: true },
        { text: '1 Discord Server', included: true },
        { text: 'Basic Analytics', included: true },
        { text: 'Community Support', included: true },
        { text: 'API Access', included: false },
        { text: 'Priority Support', included: false },
        { text: 'Custom Webhooks', included: false }
      ]
    },
    {
      name: 'Pro',
      price: 9.99,
      period: 'month',
      color: 'border-neon-blue',
      icon: Zap,
      current: user?.plan === 'pro',
      popular: true,
      features: [
        { text: '10 Forwarding Pairs', included: true },
        { text: '3 Telegram Accounts', included: true },
        { text: '3 Discord Servers', included: true },
        { text: 'Advanced Analytics', included: true },
        { text: 'Email Support', included: true },
        { text: 'Custom Delays', included: true },
        { text: 'Silent Mode', included: true },
        { text: 'API Access', included: false }
      ]
    },
    {
      name: 'Elite',
      price: 29.99,
      period: 'month',
      color: 'border-neon-purple',
      icon: Crown,
      current: user?.plan === 'elite',
      features: [
        { text: '50 Forwarding Pairs', included: true },
        { text: '10 Telegram Accounts', included: true },
        { text: '10 Discord Servers', included: true },
        { text: 'Real-time Analytics', included: true },
        { text: 'Priority Support', included: true },
        { text: 'Full API Access', included: true },
        { text: 'Custom Webhooks', included: true },
        { text: 'Advanced Features', included: true }
      ]
    }
  ];

  const handleUpgrade = async (planName: string) => {
    if (planName === 'free') {
      toast.error('You are already on the free plan');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.post('/payments/create', {
        plan: planName.toLowerCase(),
        payment_method: 'paypal',
        billing_cycle: 'monthly'
      });
      
      if (response.data.payment_url) {
        window.open(response.data.payment_url, '_blank');
        toast.success('Redirecting to payment gateway...');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to initiate payment');
    }
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-neon-green border-neon-green/30 bg-neon-green/10';
      case 'pending': return 'text-neon-orange border-neon-orange/30 bg-neon-orange/10';
      case 'failed': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-dark-muted border-dark-border bg-dark-border/10';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-neon-green" />
              Billing & Plans
            </h1>
            <p className="text-dark-muted mt-1">
              Manage your subscription and billing information
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${user?.plan === 'elite' ? 'text-neon-purple border-neon-purple' : user?.plan === 'pro' ? 'text-neon-blue border-neon-blue' : 'text-gray-400 border-gray-400'}`}>
              Current: {user?.plan?.charAt(0).toUpperCase() + user?.plan?.slice(1) || 'Free'} Plan
            </Badge>
          </div>
        </div>

        {/* Current Plan Status */}
        <Card className="glass-effect border-dark-border">
          <CardHeader>
            <CardTitle className="text-dark-text flex items-center gap-2">
              <Shield className="h-5 w-5 text-neon-green" />
              Current Plan Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full ${user?.plan === 'elite' ? 'bg-neon-purple/20' : user?.plan === 'pro' ? 'bg-neon-blue/20' : 'bg-gray-400/20'} flex items-center justify-center mb-3`}>
                  {user?.plan === 'elite' ? <Crown className="h-8 w-8 text-neon-purple" /> : 
                   user?.plan === 'pro' ? <Zap className="h-8 w-8 text-neon-blue" /> :
                   <Users className="h-8 w-8 text-gray-400" />}
                </div>
                <h3 className="text-lg font-semibold text-dark-text capitalize">
                  {user?.plan || 'Free'} Plan
                </h3>
                <p className="text-dark-muted text-sm">Active subscription</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-dark-text">
                  ${user?.plan === 'elite' ? '29.99' : user?.plan === 'pro' ? '9.99' : '0.00'}
                </p>
                <p className="text-dark-muted text-sm">per month</p>
              </div>
              
              <div className="text-center">
                <p className="text-dark-text">
                  {user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : 'Never expires'}
                </p>
                <p className="text-dark-muted text-sm">
                  {user?.plan_expires_at ? 'Next billing date' : 'Free forever'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`glass-effect ${plan.current ? 'border-neon-green' : plan.color} relative overflow-hidden`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-neon-blue text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto rounded-lg ${plan.name === 'Elite' ? 'bg-neon-purple/20' : plan.name === 'Pro' ? 'bg-neon-blue/20' : 'bg-gray-400/20'} flex items-center justify-center mb-3`}>
                    <plan.icon className={`h-6 w-6 ${plan.name === 'Elite' ? 'text-neon-purple' : plan.name === 'Pro' ? 'text-neon-blue' : 'text-gray-400'}`} />
                  </div>
                  
                  <CardTitle className="text-dark-text text-xl">{plan.name}</CardTitle>
                  
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-dark-text">${plan.price}</span>
                    <span className="text-dark-muted">/{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${feature.included ? 'bg-neon-green/20' : 'bg-red-400/20'}`}>
                          {feature.included ? (
                            <Check className="h-3 w-3 text-neon-green" />
                          ) : (
                            <X className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                        <span className={`text-sm ${feature.included ? 'text-dark-text' : 'text-dark-muted'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      onClick={() => handleUpgrade(plan.name)}
                      disabled={plan.current || isLoading}
                      className={`w-full ${plan.current 
                        ? 'bg-dark-border text-dark-muted cursor-not-allowed' 
                        : plan.name === 'Elite' 
                          ? 'bg-neon-purple hover:bg-neon-purple/90 text-black' 
                          : plan.name === 'Pro'
                            ? 'bg-neon-blue hover:bg-neon-blue/90 text-black'
                            : 'bg-gray-400 hover:bg-gray-400/90 text-black'
                      } font-semibold`}
                    >
                      {plan.current ? 'Current Plan' : plan.name === 'Free' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Payment History */}
        <Card className="glass-effect border-dark-border">
          <CardHeader>
            <CardTitle className="text-dark-text flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-neon-green" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment: any, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-dark-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neon-blue/20 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-neon-blue" />
                      </div>
                      <div>
                        <p className="text-dark-text font-medium">
                          {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan
                        </p>
                        <p className="text-dark-muted text-sm">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-dark-text font-medium">${payment.amount}</p>
                        <p className="text-dark-muted text-sm">{payment.currency.toUpperCase()}</p>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-dark-muted mx-auto mb-4" />
                <p className="text-dark-text font-medium">No payment history</p>
                <p className="text-dark-muted text-sm">Your payment transactions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card className="glass-effect border-dark-border">
          <CardHeader>
            <CardTitle className="text-dark-text flex items-center gap-2">
              <Calendar className="h-5 w-5 text-neon-orange" />
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-dark-text font-medium mb-3">Payment Methods</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-dark-border rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">PP</span>
                    </div>
                    <div>
                      <p className="text-dark-text">PayPal</p>
                      <p className="text-dark-muted text-sm">Secure payment processing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-border rounded-lg">
                    <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">₿</span>
                    </div>
                    <div>
                      <p className="text-dark-text">Cryptocurrency</p>
                      <p className="text-dark-muted text-sm">Bitcoin, Ethereum, and more</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-dark-text font-medium mb-3">Billing Details</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-dark-muted text-sm">Email</p>
                    <p className="text-dark-text">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-dark-muted text-sm">User ID</p>
                    <p className="text-dark-text">{user?.id}</p>
                  </div>
                  <div>
                    <p className="text-dark-muted text-sm">Account Created</p>
                    <p className="text-dark-text">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}