'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  ArrowRight,
  Clock,
  Volume2,
  VolumeX,
  Copy,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { ForwardingPair, TelegramAccount, DiscordAccount } from '@/types';

interface PairCardProps {
  pair: ForwardingPair;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: 'pause' | 'resume' | 'delete' | 'edit') => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getBadgeColor: (accountId: number) => string;
  telegramAccounts: TelegramAccount[];
  discordAccounts: DiscordAccount[];
}

const PairCard: React.FC<PairCardProps> = ({
  pair,
  isSelected,
  onSelect,
  onAction,
  getStatusIcon,
  getBadgeColor,
  telegramAccounts,
  discordAccounts
}) => {
  const getAccountName = (platform: 'telegram' | 'discord', accountId: number) => {
    if (platform === 'telegram') {
      const account = telegramAccounts.find(acc => acc.id === accountId);
      return account?.display_name || account?.username || `telegram ${accountId}`;
    } else {
      const account = discordAccounts.find(acc => acc.id === accountId);
      return account?.display_name || `discord ${accountId}`;
    }
  };

  const formatDelay = (seconds: number) => {
    if (seconds === 0) return 'Instant';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className={`bg-dark-card rounded-lg border transition-all ${
      isSelected ? 'border-neon-blue bg-neon-blue/5' : 'border-dark-border hover:border-dark-border/80'
    }`}>
      <div className="p-4">
        {/* Header with selection and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="rounded border-dark-border focus:ring-neon-blue"
            />
            <div className="flex items-center gap-2">
              {getStatusIcon(pair.queue_status || 'idle')}
              <span className="text-sm font-medium text-dark-text">
                Pair #{pair.id}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {pair.silent_mode && (
              <div className="p-1 bg-dark-muted/20 rounded" title="Silent mode enabled">
                <VolumeX className="w-3 h-3 text-dark-muted" />
              </div>
            )}
            {pair.copy_mode && (
              <div className="p-1 bg-neon-orange/20 rounded" title="Copy mode enabled">
                <Copy className="w-3 h-3 text-neon-orange" />
              </div>
            )}
          </div>
        </div>

        {/* Source to Destination Flow */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {/* Source */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={`px-2 py-1 rounded text-xs border ${getBadgeColor(pair.source_account_id)}`}>
                  {pair.source_platform.toUpperCase()}
                </div>
                <span className="text-xs text-dark-muted">
                  {getAccountName(pair.source_platform, pair.source_account_id)}
                </span>
              </div>
              <div className="text-sm font-medium text-dark-text truncate">
                {pair.source_chat_name || pair.source_chat_id}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="w-4 h-4 text-neon-blue" />
              {pair.delay_seconds > 0 && (
                <div className="flex items-center gap-1 text-xs text-dark-muted">
                  <Clock className="w-3 h-3" />
                  {formatDelay(pair.delay_seconds)}
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={`px-2 py-1 rounded text-xs border ${getBadgeColor(pair.destination_account_id)}`}>
                  {pair.destination_platform.toUpperCase()}
                </div>
                <span className="text-xs text-dark-muted">
                  {getAccountName(pair.destination_platform, pair.destination_account_id)}
                </span>
              </div>
              <div className="text-sm font-medium text-dark-text truncate">
                {pair.destination_chat_name || pair.destination_chat_id}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-border">
            <div className="flex items-center gap-4 text-xs text-dark-muted">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {pair.messages_count || 0} messages
              </div>
              {pair.success_rate !== undefined && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    pair.success_rate >= 95 ? 'bg-neon-green' :
                    pair.success_rate >= 80 ? 'bg-neon-orange' : 'bg-red-500'
                  }`} />
                  {pair.success_rate.toFixed(1)}% success
                </div>
              )}
              <div>
                Last: {formatDate(pair.last_forwarded)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAction('edit')}
                className="p-1.5 text-dark-muted hover:text-neon-blue hover:bg-neon-blue/20 rounded transition-colors"
                title="Edit pair"
              >
                <Edit className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => onAction(pair.is_active ? 'pause' : 'resume')}
                className={`p-1.5 rounded transition-colors ${
                  pair.is_active 
                    ? 'text-neon-orange hover:bg-neon-orange/20' 
                    : 'text-neon-green hover:bg-neon-green/20'
                }`}
                title={pair.is_active ? 'Pause forwarding' : 'Resume forwarding'}
              >
                {pair.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              
              <button
                onClick={() => onAction('delete')}
                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                title="Delete pair"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
          !pair.is_active 
            ? 'bg-dark-muted/20 text-dark-muted'
            : pair.queue_status === 'error'
            ? 'bg-red-500/20 text-red-400'
            : pair.queue_status === 'processing'
            ? 'bg-neon-blue/20 text-neon-blue'
            : 'bg-neon-green/20 text-neon-green'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            !pair.is_active 
              ? 'bg-dark-muted'
              : pair.queue_status === 'error'
              ? 'bg-red-500'
              : pair.queue_status === 'processing'
              ? 'bg-neon-blue animate-pulse'
              : 'bg-neon-green'
          }`} />
          {!pair.is_active 
            ? 'Paused'
            : pair.queue_status === 'error'
            ? 'Error'
            : pair.queue_status === 'processing'
            ? 'Processing'
            : 'Active'
          }
        </div>
      </div>
    </div>
  );
};

export default PairCard;