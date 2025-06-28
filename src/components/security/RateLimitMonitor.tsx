import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Shield } from 'lucide-react';
import { RateLimitUsage, RateLimits } from '@/services/securityService';

interface RateLimitMonitorProps {
  plan?: string;
  usage?: RateLimitUsage;
  limits?: RateLimits;
}

export function RateLimitMonitor({ plan = 'free', usage, limits }: RateLimitMonitorProps) {
  const getPlanLimits = (userPlan: string) => {
    switch (userPlan) {
      case 'elite':
        return { api: 1000, messages: 50000, accounts: 25 };
      case 'pro':
        return { api: 100, messages: 10000, accounts: 10 };
      default:
        return { api: 10, messages: 1000, accounts: 2 };
    }
  };

  const planLimits = limits || getPlanLimits(plan);
  const currentUsage = usage || { current: 0, limit: planLimits.api, resetTime: new Date().toISOString() };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const usagePercentage = (currentUsage.current / currentUsage.limit) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rate Limits
            </span>
            <Badge variant={plan === 'elite' ? 'default' : 'secondary'}>
              {plan.toUpperCase()} PLAN
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* API Calls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">API Calls</span>
                <span className={`text-sm ${getUsageColor(usagePercentage)}`}>
                  {currentUsage.current} / {currentUsage.limit}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                Resets: {new Date(currentUsage.resetTime).toLocaleString()}
              </p>
            </div>

            {/* Messages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Messages/Hour</span>
                <span className="text-sm text-gray-600">
                  0 / {planLimits.messages}
                </span>
              </div>
              <Progress value={0} className="h-2" />
            </div>

            {/* Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Connected Accounts</span>
                <span className="text-sm text-gray-600">
                  0 / {planLimits.accounts}
                </span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limit Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Rate Limit Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-500">
                {Math.max(0, currentUsage.limit - currentUsage.current)}
              </div>
              <div className="text-sm text-gray-600">Remaining Calls</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-500">
                {new Date(currentUsage.resetTime).getHours()}h
              </div>
              <div className="text-sm text-gray-600">Until Reset</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-500">
                {Math.round(usagePercentage)}%
              </div>
              <div className="text-sm text-gray-600">Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      {plan !== 'elite' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-yellow-800">Upgrade for Higher Limits</h4>
                <p className="text-yellow-700 text-sm">
                  {plan === 'free' 
                    ? 'Pro plan: 100 API calls/hour, Elite plan: 1000 API calls/hour'
                    : 'Elite plan: 1000 API calls/hour + priority processing'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}