import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppSelector } from '@/store';

interface RealTimeStats {
  messagesForwarded: number;
  activeConnections: number;
  queueBacklog: number;
  successRate: number;
  dailyVolume: Array<{ date: string; count: number }>;
  platformStats: {
    telegram: { sessions: number; messages: number };
    discord: { sessions: number; messages: number };
  };
}

export const useRealTimeAnalytics = () => {
  const { isConnected, sendMessage } = useWebSocket();
  const [analytics, setAnalytics] = useState<RealTimeStats>({
    messagesForwarded: 0,
    activeConnections: 0,
    queueBacklog: 0,
    successRate: 0,
    dailyVolume: [],
    platformStats: {
      telegram: { sessions: 0, messages: 0 },
      discord: { sessions: 0, messages: 0 }
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      // Subscribe to real-time analytics updates
      sendMessage({
        type: 'subscribe',
        channels: ['analytics', 'queue_stats', 'session_health']
      });

      // Request initial data
      sendMessage({
        type: 'request_analytics'
      });
    }
  }, [isConnected, sendMessage]);

  const updateAnalytics = (newData: Partial<RealTimeStats>) => {
    setAnalytics(prev => ({ ...prev, ...newData }));
    setIsLoading(false);
  };

  const refreshAnalytics = () => {
    if (isConnected) {
      sendMessage({
        type: 'request_analytics'
      });
    }
  };

  return {
    analytics,
    isLoading,
    isConnected,
    updateAnalytics,
    refreshAnalytics
  };
};