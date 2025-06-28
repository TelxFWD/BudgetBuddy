"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { BillingService } from '@/services/billingService';

interface PlanUpgradeProps {
  currentPlan: string;
  onUpgrade: () => void;
}

export function PlanUpgrade({ currentPlan, onUpgrade }: PlanUpgradeProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Star,
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for getting started',
      features: [
        '2 forwarding pairs',
        '2 total accounts',
        'Basic forwarding',
        'Community support'
      ],
      limitations: [
        'No Discord forwarding',
        'No advanced features',
        'Limited support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: Zap,
      price: { monthly: 9.99, yearly: 99.99 },
      description: 'For power users and small teams',
      features: [
        '15 forwarding pairs',
        '5 total accounts',
        'Discord + Telegram forwarding',
        'Copy mode & delay settings',
        'Priority support',
        'Advanced filtering'
      ],
      popular: true
    },
    {
      id: 'elite',
      name: 'Elite',
      icon: Crown,
      price: { monthly: 19.99, yearly: 199.99 },
      description: 'For professionals and enterprises',
      features: [
        '100 forwarding pairs',
        '20 total accounts',
        'All Pro features',
        'API access & webhooks',
        'Chain forwarding',
        'Advanced analytics',
        'Custom integrations',
        'Priority support'
      ]
    }
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return;
    
    try {
      setLoading(planId);
      const paymentData = await BillingService.createPayment(planId, billingCycle, 'paypal');
      
      if (paymentData.payment_url) {
        window.open(paymentData.payment_url, '_blank');
      }
      
      onUpgrade();
    } catch (error) {
      console.error('Failed to create payment:', error);
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (planId: string) => {
    if (planId === currentPlan) return 'Current Plan';
    if (planId === 'free') return 'Downgrade';
    return loading === planId ? 'Processing...' : 'Upgrade';
  };

  const getButtonVariant = (planId: string) => {
    if (planId === currentPlan) return 'secondary';
    if (planId === 'free') return 'outline';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('monthly')}
          size="sm"
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('yearly')}
          size="sm"
        >
          Yearly
          <Badge className="ml-2 bg-green-500 text-white">Save 17%</Badge>
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.id === currentPlan;
          const price = plan.price[billingCycle];
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-blue-500 border-2' : ''} ${isCurrentPlan ? 'bg-blue-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Icon className={`h-8 w-8 ${plan.id === 'elite' ? 'text-purple-500' : plan.id === 'pro' ? 'text-blue-500' : 'text-gray-500'}`} />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {price === 0 ? 'Free' : `$${price}`}
                  {price > 0 && (
                    <span className="text-sm font-normal text-gray-600">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  
                  {plan.limitations?.map((limitation, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border border-gray-300" />
                      <span className="text-sm text-gray-500">{limitation}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  className="w-full"
                  variant={getButtonVariant(plan.id)}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id || (plan.id === currentPlan)}
                >
                  {getButtonText(plan.id)}
                </Button>
                
                {isCurrentPlan && (
                  <div className="text-center mt-2">
                    <Badge variant="secondary">Active</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">Free</th>
                  <th className="text-center py-2">Pro</th>
                  <th className="text-center py-2">Elite</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Forwarding Pairs</td>
                  <td className="text-center">2</td>
                  <td className="text-center">15</td>
                  <td className="text-center">100</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Total Accounts</td>
                  <td className="text-center">2</td>
                  <td className="text-center">5</td>
                  <td className="text-center">20</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Discord Support</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">API Access</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Webhooks</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Chain Forwarding</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}