'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  MessageSquare,
  Users,
  Zap,
  BarChart3,
  Shield,
  AlertCircle,
  TrendingUp,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'react-hot-toast';

interface HealthMetrics {
  database: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    connections: { active: number; total: number; };
    lastBackup: string;
  };
  queue: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    backlog: number;
    processing: number;
    failed: number;
    throughput: number;
  };
  sessions: {
    telegram: { connected: number; total: number; health: 'good' | 'poor' | 'critical'; };
    discord: { connected: number; total: number; health: 'good' | 'poor' | 'critical'; };
  };
  system: {
    uptime: number;
    memory: { used: number; total: number; };
    cpu: number;
    errors: { count: number; rate: number; };
  };
}

export const SystemHealthDashboard: React.FC = () => {
  const { isConnected, sendMessage } = useWebSocket();
  
  const [healthData, setHealthData] = useState<HealthMetrics>({
    database: {
      status: 'healthy',
      responseTime: 45,
      connections: { active: 8, total: 20 },
      lastBackup: '2025-06-28T18:00:00Z'
    },
    queue: {
      status: 'healthy',
      backlog: 12,
      processing: 5,
      failed: 0,
      throughput: 150
    },
    sessions: {
      telegram: { connected: 4, total: 5, health: 'good' },
      discord: { connected: 3, total: 3, health: 'good' }
    },
    system: {
      uptime: 86400,
      memory: { used: 2.1, total: 8.0 },
      cpu: 15,
      errors: { count: 2, rate: 0.1 }
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        channels: ['system_health', 'queue_stats', 'session_health']
      });
    }
  }, [isConnected, sendMessage]);

  const refreshHealthData = async () => {
    setIsRefreshing(true);
    try {
      if (isConnected) {
        sendMessage({ type: 'request_health_update' });
      }
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
      toast.success('Health data refreshed');
    } catch (error) {
      toast.error('Failed to refresh health data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const restartSessions = async () => {
    try {
      if (isConnected) {
        sendMessage({ type: 'restart_sessions' });
        toast.success('Session restart initiated');
      }
    } catch (error) {
      toast.error('Failed to restart sessions');
    }
  };

  const clearQueue = async () => {
    try {
      if (isConnected) {
        sendMessage({ type: 'clear_queue' });
        toast.success('Queue cleared successfully');
      }
    } catch (error) {
      toast.error('Failed to clear queue');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return 'text-neon-green';
      case 'degraded':
      case 'poor':
        return 'text-neon-orange';
      case 'unhealthy':
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-dark-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return <CheckCircle className="h-5 w-5 text-neon-green" />;
      case 'degraded':
      case 'poor':
        return <AlertTriangle className="h-5 w-5 text-neon-orange" />;
      case 'unhealthy':
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-dark-muted" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getOverallHealth = () => {
    const statuses = [
      healthData.database.status,
      healthData.queue.status,
      healthData.sessions.telegram.health,
      healthData.sessions.discord.health
    ];
    
    if (statuses.some(s => s === 'unhealthy' || s === 'critical')) return 'critical';
    if (statuses.some(s => s === 'degraded' || s === 'poor')) return 'degraded';
    return 'healthy';
  };

  const overallHealth = getOverallHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <Activity className="h-6 w-6" />
            System Health Monitor
          </h1>
          <p className="text-dark-muted flex items-center gap-2 mt-1">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-neon-green' : 'bg-red-500'}`}></div>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshHealthData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={restartSessions}
            disabled={!isConnected}
          >
            <Settings className="h-4 w-4 mr-2" />
            Restart Sessions
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {getStatusIcon(overallHealth)}
              {isConnected && (
                <motion.div
                  className="absolute -top-1 -right-1 h-3 w-3 bg-neon-green rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-dark-text">System Status</h2>
              <p className={`text-lg font-medium ${getStatusColor(overallHealth)}`}>
                {overallHealth.charAt(0).toUpperCase() + overallHealth.slice(1)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-dark-muted">Uptime</p>
              <p className="font-medium text-dark-text">{formatUptime(healthData.system.uptime)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-dark-muted">Connected Sessions</p>
              <p className="font-medium text-dark-text">
                {healthData.sessions.telegram.connected + healthData.sessions.discord.connected}/
                {healthData.sessions.telegram.total + healthData.sessions.discord.total}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                Database
                {getStatusIcon(healthData.database.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Response Time</span>
                <span className="text-dark-text">{healthData.database.responseTime}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Connections</span>
                <span className="text-dark-text">
                  {healthData.database.connections.active}/{healthData.database.connections.total}
                </span>
              </div>
              <Progress 
                value={(healthData.database.connections.active / healthData.database.connections.total) * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Queue Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                Queue
                {getStatusIcon(healthData.queue.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Backlog</span>
                <span className="text-dark-text">{healthData.queue.backlog}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Processing</span>
                <span className="text-dark-text">{healthData.queue.processing}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Throughput</span>
                <span className="text-dark-text">{healthData.queue.throughput}/min</span>
              </div>
              {healthData.queue.failed > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {healthData.queue.failed} failed
                </Badge>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Telegram Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-blue-400" />
                Telegram
                {getStatusIcon(healthData.sessions.telegram.health)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Connected</span>
                <span className="text-dark-text">
                  {healthData.sessions.telegram.connected}/{healthData.sessions.telegram.total}
                </span>
              </div>
              <Progress 
                value={(healthData.sessions.telegram.connected / healthData.sessions.telegram.total) * 100} 
                className="h-2"
              />
              <div className="flex items-center gap-2">
                {healthData.sessions.telegram.connected === healthData.sessions.telegram.total ? (
                  <Wifi className="h-3 w-3 text-neon-green" />
                ) : (
                  <WifiOff className="h-3 w-3 text-neon-orange" />
                )}
                <span className="text-xs text-dark-muted">
                  {healthData.sessions.telegram.health} health
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Discord Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                Discord
                {getStatusIcon(healthData.sessions.discord.health)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Connected</span>
                <span className="text-dark-text">
                  {healthData.sessions.discord.connected}/{healthData.sessions.discord.total}
                </span>
              </div>
              <Progress 
                value={(healthData.sessions.discord.connected / healthData.sessions.discord.total) * 100} 
                className="h-2"
              />
              <div className="flex items-center gap-2">
                {healthData.sessions.discord.connected === healthData.sessions.discord.total ? (
                  <Wifi className="h-3 w-3 text-neon-green" />
                ) : (
                  <WifiOff className="h-3 w-3 text-neon-orange" />
                )}
                <span className="text-xs text-dark-muted">
                  {healthData.sessions.discord.health} health
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="queue">Queue Details</TabsTrigger>
          <TabsTrigger value="sessions">Session Management</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-dark-muted">Memory Usage</span>
                    <span className="text-sm text-dark-text">
                      {healthData.system.memory.used.toFixed(1)}GB / {healthData.system.memory.total}GB
                    </span>
                  </div>
                  <Progress 
                    value={(healthData.system.memory.used / healthData.system.memory.total) * 100} 
                    className="h-3"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-dark-muted">CPU Usage</span>
                    <span className="text-sm text-dark-text">{healthData.system.cpu}%</span>
                  </div>
                  <Progress value={healthData.system.cpu} className="h-3" />
                </div>

                <div className="pt-4 border-t border-dark-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-muted">Error Rate</span>
                    <span className="text-dark-text">{healthData.system.errors.rate}%</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-dark-muted">Total Errors</span>
                    <span className="text-dark-text">{healthData.system.errors.count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border border-dark-border rounded-lg">
                    <TrendingUp className="h-6 w-6 text-neon-green mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-text">{healthData.queue.throughput}</p>
                    <p className="text-sm text-dark-muted">Messages/min</p>
                  </div>
                  
                  <div className="text-center p-3 border border-dark-border rounded-lg">
                    <Zap className="h-6 w-6 text-neon-orange mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-text">{healthData.database.responseTime}</p>
                    <p className="text-sm text-dark-muted">Avg Response</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-border">
                  <h4 className="font-medium text-dark-text mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={clearQueue}
                      disabled={!isConnected}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Clear Queue
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={restartSessions}
                      disabled={!isConnected}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restart All Sessions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-dark-border rounded-lg">
                  <Clock className="h-8 w-8 text-neon-orange mx-auto mb-2" />
                  <p className="text-2xl font-bold text-dark-text">{healthData.queue.backlog}</p>
                  <p className="text-sm text-dark-muted">Pending Tasks</p>
                </div>
                
                <div className="text-center p-4 border border-dark-border rounded-lg">
                  <Activity className="h-8 w-8 text-neon-green mx-auto mb-2" />
                  <p className="text-2xl font-bold text-dark-text">{healthData.queue.processing}</p>
                  <p className="text-sm text-dark-muted">Processing</p>
                </div>
                
                <div className="text-center p-4 border border-dark-border rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-dark-text">{healthData.queue.failed}</p>
                  <p className="text-sm text-dark-muted">Failed Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-400" />
                  Telegram Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: healthData.sessions.telegram.total }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-dark-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${
                          i < healthData.sessions.telegram.connected ? 'bg-neon-green' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">Session {i + 1}</span>
                      </div>
                      <Badge variant={i < healthData.sessions.telegram.connected ? 'default' : 'destructive'}>
                        {i < healthData.sessions.telegram.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                  Discord Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: healthData.sessions.discord.total }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-dark-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${
                          i < healthData.sessions.discord.connected ? 'bg-neon-green' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">Bot {i + 1}</span>
                      </div>
                      <Badge variant={i < healthData.sessions.discord.connected ? 'default' : 'destructive'}>
                        {i < healthData.sessions.discord.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Alerts & Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border border-dark-border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-neon-green mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-text">All systems operational</p>
                    <p className="text-xs text-dark-muted">2 minutes ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 border border-dark-border rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-neon-orange mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-text">Queue backlog increased</p>
                    <p className="text-xs text-dark-muted">15 minutes ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 border border-dark-border rounded-lg">
                  <RefreshCw className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-text">Session reconnection successful</p>
                    <p className="text-xs text-dark-muted">1 hour ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};