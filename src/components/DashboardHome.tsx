'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DragDropPairBuilder } from '@/components/forwarding/DragDropPairBuilder';
import { RealTimeAnalyticsDashboard } from '@/components/analytics/RealTimeAnalyticsDashboard';
import { SystemHealthDashboard } from '@/components/monitoring/SystemHealthDashboard';
import { APIKeyManager } from '@/components/apikeys/APIKeyManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Users, 
  Zap, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Shield,
  MessageSquare,
  BarChart3,
  Monitor,
  Key,
  Settings,
  Wifi,
  WifiOff,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardHome() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { stats, health } = useSelector((state: RootState) => state.dashboard);
  const { isConnected } = useWebSocket();
  const [activeSection, setActiveSection] = useState('overview');

  const planFeatures = {
    free: { pairs: 2, telegrams: 1, discords: 1 },
    pro: { pairs: 10, telegrams: 3, discords: 3 },
    elite: { pairs: 50, telegrams: 10, discords: 10 }
  };

  const currentPlan = planFeatures[user?.plan as keyof typeof planFeatures] || planFeatures.free;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-neon-green border-neon-green/30 bg-neon-green/10';
      case 'degraded': return 'text-neon-orange border-neon-orange/30 bg-neon-orange/10';
      case 'unhealthy': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-dark-muted border-dark-border bg-dark-border/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header with Real-time Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text mb-2 flex items-center gap-3">
            <Activity className="h-8 w-8 text-neon-green" />
            Welcome back, {user?.username || 'User'}!
          </h1>
          <p className="text-dark-muted flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-neon-green' : 'bg-red-500'}`}></div>
            {isConnected ? 'Live updates active' : 'Connection lost'} • Real-time dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-neon-green border-neon-green">
            {user?.plan === 'elite' ? 'Elite Plan' : user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
          </Badge>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Pairs */}
        <div className="glass-effect rounded-xl p-6 border border-dark-border neon-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-sm">Active Pairs</p>
              <p className="text-2xl font-bold text-dark-text">
                {stats?.active_pairs || 0}
                <span className="text-sm text-dark-muted ml-1">
                  / {currentPlan.pairs}
                </span>
              </p>
            </div>
            <div className="p-3 bg-neon-blue/20 rounded-lg">
              <Zap className="h-6 w-6 text-neon-blue" />
            </div>
          </div>
          <div className="mt-4 bg-dark-bg rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-neon-blue to-neon-purple h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(((stats?.active_pairs || 0) / currentPlan.pairs) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Messages Today */}
        <div className="glass-effect rounded-xl p-6 border border-dark-border neon-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-sm">Messages Today</p>
              <p className="text-2xl font-bold text-dark-text">
                {stats?.messages_today || 0}
              </p>
            </div>
            <div className="p-3 bg-neon-green/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-neon-green" />
            </div>
          </div>
          <p className="text-xs text-dark-muted mt-2">
            +{stats?.messages_this_week || 0} this week
          </p>
        </div>

        {/* Success Rate */}
        <div className="glass-effect rounded-xl p-6 border border-dark-border neon-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-dark-text">
                {stats?.success_rate ? `${(stats.success_rate * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <div className="p-3 bg-neon-purple/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-neon-purple" />
            </div>
          </div>
          <p className="text-xs text-dark-muted mt-2">
            Avg delay: {stats?.avg_delay || 0}s
          </p>
        </div>

        {/* Total Messages */}
        <div className="glass-effect rounded-xl p-6 border border-dark-border neon-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-sm">Total Forwarded</p>
              <p className="text-2xl font-bold text-dark-text">
                {stats?.total_messages_forwarded || 0}
              </p>
            </div>
            <div className="p-3 bg-neon-orange/20 rounded-lg">
              <Activity className="h-6 w-6 text-neon-orange" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Status & Plan Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Status */}
        <div className="glass-effect rounded-xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-neon-blue" />
            Account Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-dark-muted">Plan</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-neon-blue to-neon-purple text-white capitalize">
                {user?.plan || 'Free'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-dark-muted">Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user?.status || 'inactive')}`}>
                {user?.status || 'Inactive'}
              </span>
            </div>
            
            {user?.plan_expires_at && (
              <div className="flex items-center justify-between">
                <span className="text-dark-muted">Plan Expires</span>
                <span className="text-dark-text text-sm">
                  {new Date(user.plan_expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="glass-effect rounded-xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-neon-green" />
            System Health
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-dark-muted">Database</span>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(health?.components?.database || 'unknown')}`}>
                {health?.components?.database || 'Unknown'}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-dark-muted">Queue System</span>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(health?.components?.redis || 'unknown')}`}>
                {health?.components?.redis === 'not_configured' ? 'Disabled' : health?.components?.redis || 'Unknown'}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-dark-muted">Workers</span>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(health?.components?.celery || 'unknown')}`}>
                {health?.components?.celery === 'not_configured' ? 'Disabled' : health?.components?.celery || 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="glass-effect rounded-xl p-6 border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-neon-purple" />
          Usage Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-dark-muted text-sm mb-2">Telegram Accounts</p>
            <p className="text-2xl font-bold text-dark-text">
              0 <span className="text-sm text-dark-muted">/ {currentPlan.telegrams}</span>
            </p>
            <div className="mt-2 bg-dark-bg rounded-full h-2">
              <div className="bg-neon-blue h-2 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-dark-muted text-sm mb-2">Discord Servers</p>
            <p className="text-2xl font-bold text-dark-text">
              0 <span className="text-sm text-dark-muted">/ {currentPlan.discords}</span>
            </p>
            <div className="mt-2 bg-dark-bg rounded-full h-2">
              <div className="bg-neon-purple h-2 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-dark-muted text-sm mb-2">Forwarding Pairs</p>
            <p className="text-2xl font-bold text-dark-text">
              {stats?.active_pairs || 0} <span className="text-sm text-dark-muted">/ {currentPlan.pairs}</span>
            </p>
            <div className="mt-2 bg-dark-bg rounded-full h-2">
              <div 
                className="bg-neon-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(((stats?.active_pairs || 0) / currentPlan.pairs) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-effect rounded-xl p-6 border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/forwarding" className="ghost-button px-4 py-3 rounded-lg text-center block">
            Manage Forwarding Pairs
          </a>
          <button className="ghost-button px-4 py-3 rounded-lg text-center">
            Add Telegram Account
          </button>
          <button className="ghost-button px-4 py-3 rounded-lg text-center">
            Connect Discord Server
          </button>
        </div>
      </div>
    </div>
  );
}