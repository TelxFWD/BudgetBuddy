'use client';

import React from 'react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  BarChart3,
  Activity
} from 'lucide-react';
import { QueueStatus as QueueStatusType, SessionHealth } from '@/types';

interface QueueStatusProps {
  status: QueueStatusType;
  sessionHealth: SessionHealth | null;
}

const QueueStatus: React.FC<QueueStatusProps> = ({ status, sessionHealth }) => {
  const totalTasks = status.total_tasks;
  const healthyTasks = status.total_tasks - status.failed_tasks;
  const healthPercentage = totalTasks > 0 ? (healthyTasks / totalTasks) * 100 : 100;

  const getHealthColor = (percentage: number) => {
    if (percentage >= 95) return 'text-neon-green';
    if (percentage >= 80) return 'text-neon-orange';
    return 'text-red-400';
  };

  const getHealthBgColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-neon-green/20 border-neon-green/30';
    if (percentage >= 80) return 'bg-neon-orange/20 border-neon-orange/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="bg-[#1a1a1b] rounded-lg border border-dark-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-neon-blue" />
          <h3 className="font-medium text-dark-text">Queue Status</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getHealthBgColor(healthPercentage)}`}>
          <span className={getHealthColor(healthPercentage)}>
            {healthPercentage.toFixed(1)}% Healthy
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <BarChart3 className="w-4 h-4 text-dark-muted" />
          </div>
          <div className="text-lg font-semibold text-dark-text">{status.total_tasks}</div>
          <div className="text-xs text-dark-muted">Total</div>
        </div>

        {/* Pending Tasks */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-neon-blue" />
          </div>
          <div className="text-lg font-semibold text-neon-blue">{status.pending_tasks}</div>
          <div className="text-xs text-dark-muted">Pending</div>
        </div>

        {/* Processing Tasks */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <RefreshCw className="w-4 h-4 text-neon-green animate-spin" />
          </div>
          <div className="text-lg font-semibold text-neon-green">{status.processing_tasks}</div>
          <div className="text-xs text-dark-muted">Processing</div>
        </div>

        {/* Failed Tasks */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-lg font-semibold text-red-400">{status.failed_tasks}</div>
          <div className="text-xs text-dark-muted">Failed</div>
        </div>

        {/* Retry Tasks */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <RefreshCw className="w-4 h-4 text-neon-orange" />
          </div>
          <div className="text-lg font-semibold text-neon-orange">{status.retry_tasks}</div>
          <div className="text-xs text-dark-muted">Retrying</div>
        </div>
      </div>

      {/* Session Health Summary */}
      {sessionHealth && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-dark-muted mb-1">Telegram Sessions</div>
              <div className="flex items-center gap-2">
                {Object.keys(sessionHealth.telegram_sessions).length === 0 ? (
                  <span className="text-dark-muted">No sessions</span>
                ) : (
                  Object.values(sessionHealth.telegram_sessions).map((session, index) => (
                    <div key={index} className="flex items-center gap-1">
                      {session.status === 'connected' ? (
                        <CheckCircle className="w-3 h-3 text-neon-green" />
                      ) : session.status === 'reconnecting' ? (
                        <RefreshCw className="w-3 h-3 text-neon-orange animate-spin" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div>
              <div className="text-dark-muted mb-1">Discord Sessions</div>
              <div className="flex items-center gap-2">
                {Object.keys(sessionHealth.discord_sessions).length === 0 ? (
                  <span className="text-dark-muted">No sessions</span>
                ) : (
                  Object.values(sessionHealth.discord_sessions).map((session, index) => (
                    <div key={index} className="flex items-center gap-1">
                      {session.status === 'connected' ? (
                        <CheckCircle className="w-3 h-3 text-neon-green" />
                      ) : session.status === 'reconnecting' ? (
                        <RefreshCw className="w-3 h-3 text-neon-purple animate-spin" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueStatus;