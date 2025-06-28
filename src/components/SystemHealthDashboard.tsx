/**
 * System Health Monitoring Dashboard
 * Real-time monitoring of queue status, session health, and system performance
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  HardDrive,
  RefreshCw,
  Zap,
  Users,
  MessageCircle
} from 'lucide-react';

interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      response_time: number;
      connection_pool: {
        active: number;
        idle: number;
        total: number;
      };
    };
    queue: {
      status: 'running' | 'stopped' | 'error';
      backlog: number;
      processing_rate: number;
      error_rate: number;
      workers: number;
    };
    sessions: {
      telegram: {
        total: number;
        connected: number;
        errors: number;
      };
      discord: {
        total: number;
        connected: number;
        errors: number;
      };
    };
    api: {
      status: 'operational' | 'slow' | 'down';
      response_time: number;
      requests_per_minute: number;
      error_rate: number;
    };
  };
  metrics: {
    uptime: number;
    memory_usage: number;
    cpu_usage: number;
    active_users: number;
    total_messages_today: number;
  };
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    component: string;
  }>;
}

interface SystemHealthDashboardProps {
  isAdmin?: boolean;
  onRestartService?: (service: string) => Promise<void>;
  onClearQueue?: () => Promise<void>;
}

export const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({
  isAdmin = false,
  onRestartService,
  onClearQueue
}) => {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      // In real implementation, fetch from /api/system/health
      const mockData: SystemHealth = {
        overall_status: Math.random() > 0.1 ? 'healthy' : 'degraded',
        components: {
          database: {
            status: 'connected',
            response_time: 5 + Math.random() * 10,
            connection_pool: {
              active: Math.floor(Math.random() * 8) + 2,
              idle: Math.floor(Math.random() * 5) + 3,
              total: 20
            }
          },
          queue: {
            status: 'running',
            backlog: Math.floor(Math.random() * 50),
            processing_rate: 85 + Math.random() * 10,
            error_rate: Math.random() * 3,
            workers: 4
          },
          sessions: {
            telegram: {
              total: 5,
              connected: 4 + Math.floor(Math.random() * 2),
              errors: Math.floor(Math.random() * 2)
            },
            discord: {
              total: 3,
              connected: 2 + Math.floor(Math.random() * 2),
              errors: Math.floor(Math.random() * 2)
            }
          },
          api: {
            status: 'operational',
            response_time: 100 + Math.random() * 50,
            requests_per_minute: 150 + Math.random() * 100,
            error_rate: Math.random() * 2
          }
        },
        metrics: {
          uptime: 7 * 24 * 3600 + Math.random() * 3600, // ~7 days
          memory_usage: 45 + Math.random() * 20,
          cpu_usage: 20 + Math.random() * 30,
          active_users: 120 + Math.floor(Math.random() * 50),
          total_messages_today: 15000 + Math.floor(Math.random() * 5000)
        },
        alerts: [
          {
            id: '1',
            level: 'warning',
            message: 'Queue backlog increasing',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            component: 'queue'
          },
          {
            id: '2',
            level: 'info',
            message: 'New user registered',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            component: 'api'
          }
        ]
      };

      setHealthData(mockData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'running':
      case 'operational':
        return 'text-neon-green';
      case 'degraded':
      case 'slow':
        return 'text-yellow-500';
      case 'critical':
      case 'error':
      case 'disconnected':
      case 'stopped':
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'running':
      case 'operational':
        return <CheckCircle className="text-neon-green" size={20} />;
      case 'degraded':
      case 'slow':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'critical':
      case 'error':
      case 'disconnected':
      case 'stopped':
      case 'down':
        return <AlertTriangle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const AlertLevel: React.FC<{ level: string }> = ({ level }) => {
    const colors = {
      info: 'bg-blue-900 text-blue-300',
      warning: 'bg-yellow-900 text-yellow-300',
      error: 'bg-red-900 text-red-300',
      critical: 'bg-red-900 text-red-300 animate-pulse'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[level as keyof typeof colors]}`}>
        {level}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-700 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
        <p className="text-gray-400">Failed to load system health data</p>
        <button
          onClick={fetchHealthData}
          className="mt-4 px-4 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-text">System Health</h2>
          <p className="text-gray-400 text-sm">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchHealthData}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-dark-card border-2 rounded-lg p-6 ${
          healthData.overall_status === 'healthy' ? 'border-neon-green' :
          healthData.overall_status === 'degraded' ? 'border-yellow-500' :
          'border-red-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(healthData.overall_status)}
            <div>
              <h3 className="text-xl font-semibold text-dark-text capitalize">
                System {healthData.overall_status}
              </h3>
              <p className="text-gray-400">
                All systems {healthData.overall_status === 'healthy' ? 'operational' : 'experiencing issues'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Uptime</div>
            <div className="text-lg font-bold text-dark-text">
              {formatUptime(healthData.metrics.uptime)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-dark-text">
                {healthData.metrics.active_users.toLocaleString()}
              </p>
            </div>
            <Users className="text-neon-blue" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Messages Today</p>
              <p className="text-2xl font-bold text-dark-text">
                {healthData.metrics.total_messages_today.toLocaleString()}
              </p>
            </div>
            <MessageCircle className="text-neon-green" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">CPU Usage</p>
              <p className="text-2xl font-bold text-dark-text">
                {healthData.metrics.cpu_usage.toFixed(1)}%
              </p>
            </div>
            <Cpu className="text-yellow-500" size={24} />
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${healthData.metrics.cpu_usage}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Memory Usage</p>
              <p className="text-2xl font-bold text-dark-text">
                {healthData.metrics.memory_usage.toFixed(1)}%
              </p>
            </div>
            <HardDrive className="text-neon-purple" size={24} />
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-neon-purple h-2 rounded-full transition-all duration-300"
              style={{ width: `${healthData.metrics.memory_usage}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* Component Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
              <Database size={20} />
              Database
            </h3>
            {getStatusIcon(healthData.components.database.status)}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={getStatusColor(healthData.components.database.status)}>
                {healthData.components.database.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Response Time:</span>
              <span className="text-dark-text">
                {healthData.components.database.response_time.toFixed(1)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Connections:</span>
              <span className="text-dark-text">
                {healthData.components.database.connection_pool.active}/
                {healthData.components.database.connection_pool.total}
              </span>
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
              <Activity size={20} />
              Queue System
            </h3>
            <div className="flex items-center gap-2">
              {getStatusIcon(healthData.components.queue.status)}
              {isAdmin && (
                <button
                  onClick={() => onClearQueue?.()}
                  className="text-xs px-2 py-1 bg-red-800 text-red-300 rounded hover:bg-red-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Backlog:</span>
              <span className="text-dark-text">{healthData.components.queue.backlog}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Processing Rate:</span>
              <span className="text-neon-green">
                {healthData.components.queue.processing_rate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Error Rate:</span>
              <span className="text-yellow-500">
                {healthData.components.queue.error_rate.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Workers:</span>
              <span className="text-dark-text">{healthData.components.queue.workers}</span>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
              <Wifi size={20} />
              Sessions
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Telegram:</span>
                <span className="text-dark-text">
                  {healthData.components.sessions.telegram.connected}/
                  {healthData.components.sessions.telegram.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-neon-blue h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(healthData.components.sessions.telegram.connected / 
                             healthData.components.sessions.telegram.total) * 100}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Discord:</span>
                <span className="text-dark-text">
                  {healthData.components.sessions.discord.connected}/
                  {healthData.components.sessions.discord.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-neon-purple h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(healthData.components.sessions.discord.connected / 
                             healthData.components.sessions.discord.total) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* API */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
              <Server size={20} />
              API Server
            </h3>
            {getStatusIcon(healthData.components.api.status)}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Response Time:</span>
              <span className="text-dark-text">
                {healthData.components.api.response_time.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Requests/min:</span>
              <span className="text-dark-text">
                {healthData.components.api.requests_per_minute.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Error Rate:</span>
              <span className="text-yellow-500">
                {healthData.components.api.error_rate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Zap size={20} />
          Recent Alerts
        </h3>
        {healthData.alerts.length > 0 ? (
          <div className="space-y-3">
            {healthData.alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertLevel level={alert.level} />
                  <div>
                    <div className="text-dark-text">{alert.message}</div>
                    <div className="text-xs text-gray-400">
                      {alert.component} • {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            No recent alerts
          </div>
        )}
      </div>
    </div>
  );
};