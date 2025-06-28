"use client";

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, Monitor, AlertTriangle, LogOut, Globe, Clock, UserCheck } from 'lucide-react';
import { SecurityService } from '@/services/securityService';
import { SessionManager } from '@/components/security/SessionManager';
import { RateLimitMonitor } from '@/components/security/RateLimitMonitor';
import { SecuritySettings } from '@/components/security/SecuritySettings';

export default function SecurityPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const data = await SecurityService.getSecurityOverview();
      setSecurityData(data);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceLogoutAllSessions = async () => {
    try {
      await SecurityService.logoutAllSessions();
      fetchSecurityData();
    } catch (error) {
      console.error('Failed to logout all sessions:', error);
    }
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
        <h1 className="text-2xl font-bold">Security & Session Controls</h1>
        <Button variant="outline" onClick={fetchSecurityData}>
          <Shield className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">{securityData?.activeSessions || 0}</p>
              </div>
              <Monitor className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Across {securityData?.deviceCount || 0} devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Calls Today</p>
                <p className="text-2xl font-bold">{securityData?.apiCallsToday || 0}</p>
              </div>
              <Key className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              of {securityData?.dailyLimit || 0} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-2xl font-bold">{securityData?.securityScore || 0}/100</p>
              </div>
              <Shield className={`h-8 w-8 ${securityData?.securityScore >= 80 ? 'text-green-500' : securityData?.securityScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {securityData?.securityLevel || 'Good'} security level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Login</p>
                <p className="text-lg font-bold">
                  {securityData?.lastLogin ? new Date(securityData.lastLogin).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {securityData?.lastLoginIP || 'Unknown IP'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="settings">Security Settings</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Session Management</h3>
              <Button 
                variant="destructive" 
                onClick={forceLogoutAllSessions}
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout All Sessions
              </Button>
            </div>
            <SessionManager sessions={securityData?.sessions} onRefresh={fetchSecurityData} />
          </div>
        </TabsContent>

        <TabsContent value="limits">
          <RateLimitMonitor 
            plan={user?.plan}
            usage={securityData?.rateLimitUsage}
            limits={securityData?.rateLimits}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SecuritySettings 
            settings={securityData?.securitySettings}
            onUpdate={fetchSecurityData}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {securityData?.securityAlerts?.length > 0 ? (
                <div className="space-y-3">
                  {securityData.securityAlerts.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-500' : alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-gray-600">{alert.description}</p>
                          <p className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No security alerts</p>
                  <p className="text-sm text-gray-500">Your account security is up to date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan-Based Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>Security Features by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free Plan */}
            <div className={`p-4 border rounded-lg ${user?.plan === 'free' ? 'border-blue-500 bg-blue-50' : ''}`}>
              <h4 className="font-semibold mb-2">Free Plan</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Basic session management
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Rate limiting: 10 API calls/hour
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-gray-400" />
                  IP whitelisting (Pro feature)
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-gray-400" />
                  Advanced alerts (Elite feature)
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className={`p-4 border rounded-lg ${user?.plan === 'pro' ? 'border-blue-500 bg-blue-50' : ''}`}>
              <h4 className="font-semibold mb-2">Pro Plan</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Advanced session control
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Rate limiting: 100 API calls/hour
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  IP whitelisting
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-gray-400" />
                  Advanced alerts (Elite feature)
                </li>
              </ul>
            </div>

            {/* Elite Plan */}
            <div className={`p-4 border rounded-lg ${user?.plan === 'elite' ? 'border-blue-500 bg-blue-50' : ''}`}>
              <h4 className="font-semibold mb-2">Elite Plan</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Enterprise session management
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Rate limiting: 1000 API calls/hour
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Advanced IP whitelisting
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  Real-time security alerts
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}