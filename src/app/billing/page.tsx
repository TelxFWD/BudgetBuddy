"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Clock, Check, AlertCircle, Download, DollarSign } from 'lucide-react';
import { BillingService } from '@/services/billingService';
import { PlanUpgrade } from '@/components/billing/PlanUpgrade';
import { PaymentHistory } from '@/components/billing/PaymentHistory';
import { CouponInput } from '@/components/billing/CouponInput';

export default function BillingPage() {
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [planExpiry, setPlanExpiry] = useState<string | null>(null);

  // Mock user data for demonstration
  const user = {
    plan: 'pro',
    email: 'user@example.com'
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the API
      // For now, we'll use mock data structure
      const mockData = {
        currentPlan: user.plan,
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        planLimits: BillingService.getPlanLimits(user.plan),
        currentUsage: {
          activePairs: 8,
          connectedAccounts: 3,
          messagesThisMonth: 1247
        }
      };
      setBillingData(mockData);
      setPlanExpiry(mockData.planExpiresAt);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'elite': return 'bg-purple-500';
      case 'pro': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeLeft = (expiryDate: string | null) => {
    if (!expiryDate) return 'Never expires';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days, ${hours} hours`;
    return `${hours} hours`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <Button variant="outline" onClick={fetchBillingData}>
          Refresh
        </Button>
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${getPlanColor(user?.plan)} text-white`}>
                {user?.plan?.toUpperCase()} PLAN
              </Badge>
              <div>
                <p className="font-semibold capitalize">{user?.plan} Plan</p>
                <p className="text-sm text-gray-600">
                  {billingData?.planLimits?.maxPairs} forwarding pairs, 
                  {billingData?.planLimits?.maxAccounts} accounts
                </p>
              </div>
            </div>
            
            {planExpiry && (
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Expires in</span>
                </div>
                <p className="font-semibold">{formatTimeLeft(planExpiry)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upgrade" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upgrade">Plan Upgrade</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="upgrade">
          <PlanUpgrade currentPlan={user?.plan} onUpgrade={fetchBillingData} />
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponInput onApplied={fetchBillingData} />
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">
                    {billingData?.currentUsage?.activePairs || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    of {billingData?.planLimits?.maxPairs} pairs
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (billingData?.currentUsage?.activePairs / billingData?.planLimits?.maxPairs) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {billingData?.currentUsage?.connectedAccounts || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    of {billingData?.planLimits?.maxAccounts} accounts
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (billingData?.currentUsage?.connectedAccounts / billingData?.planLimits?.maxAccounts) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">
                    {billingData?.currentUsage?.messagesThisMonth || 0}
                  </div>
                  <div className="text-sm text-gray-600">Messages this month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}