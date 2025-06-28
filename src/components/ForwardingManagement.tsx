'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Plus, 
  Search, 
  Filter, 
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Zap,
  Copy,
  Volume2,
  VolumeX
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import {
  fetchForwardingPairs,
  fetchTelegramAccounts,
  fetchDiscordAccounts,
  fetchQueueStatus,
  fetchSessionHealth,
  fetchPlanLimits,
  pauseForwardingPair,
  resumeForwardingPair,
  deleteForwardingPair,
  bulkPairOperation,
  setSelectedAccount,
  updateSessionHealth,
  updateQueueStatus
} from '@/store/slices/forwardingSlice';
import { ForwardingPair, TelegramAccount, DiscordAccount } from '@/types';
import { forwardingService } from '@/services/forwardingService';

// Sub-components
import AccountManager from './forwarding/AccountManager';
import PairBuilder from './forwarding/PairBuilder';
import PairCard from './forwarding/PairCard';
import QueueStatus from './forwarding/QueueStatus';
import BulkActions from './forwarding/BulkActions';

interface ForwardingManagementProps {
  className?: string;
}

const ForwardingManagement: React.FC<ForwardingManagementProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    pairs,
    telegramAccounts,
    discordAccounts,
    selectedAccount,
    isLoading,
    error,
    queueStatus,
    sessionHealth,
    planLimits
  } = useSelector((state: RootState) => state.forwarding);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'error'>('all');
  const [selectedPairs, setSelectedPairs] = useState<number[]>([]);
  const [showPairBuilder, setShowPairBuilder] = useState(false);
  const [editingPair, setEditingPair] = useState<ForwardingPair | null>(null);
  const [realTimeCleanup, setRealTimeCleanup] = useState<(() => void) | null>(null);

  // Initialize data on component mount
  useEffect(() => {
    dispatch(fetchForwardingPairs());
    dispatch(fetchTelegramAccounts());
    dispatch(fetchDiscordAccounts());
    dispatch(fetchQueueStatus());
    dispatch(fetchSessionHealth());
    dispatch(fetchPlanLimits());
  }, [dispatch]);

  // Set up real-time sync
  useEffect(() => {
    const cleanup = forwardingService.startRealTimeSync({
      onSessionHealthUpdate: (health) => {
        dispatch(updateSessionHealth(health));
      },
      onQueueStatusUpdate: (status) => {
        dispatch(updateQueueStatus(status));
      },
    });

    setRealTimeCleanup(() => cleanup);

    return () => {
      cleanup();
    };
  }, [dispatch]);

  // Filter pairs based on search and status
  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = searchQuery === '' || 
      pair.source_chat_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.destination_chat_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && pair.is_active) ||
      (filterStatus === 'paused' && !pair.is_active) ||
      (filterStatus === 'error' && pair.queue_status === 'error');

    const matchesAccount = selectedAccount === null || 
      pair.source_account_id === selectedAccount ||
      pair.destination_account_id === selectedAccount;

    return matchesSearch && matchesStatus && matchesAccount;
  });

  // Get current account info
  const currentAccount = selectedAccount 
    ? telegramAccounts.find(acc => acc.id === selectedAccount) || 
      discordAccounts.find(acc => acc.id === selectedAccount)
    : null;

  const handlePairAction = async (pairId: number, action: 'pause' | 'resume' | 'delete' | 'edit') => {
    try {
      switch (action) {
        case 'pause':
          await dispatch(pauseForwardingPair(pairId));
          break;
        case 'resume':
          await dispatch(resumeForwardingPair(pairId));
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this forwarding pair?')) {
            await dispatch(deleteForwardingPair(pairId));
          }
          break;
        case 'edit':
          const pair = pairs.find(p => p.id === pairId);
          if (pair) {
            setEditingPair(pair);
            setShowPairBuilder(true);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} pair:`, error);
    }
  };

  const handleBulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    if (selectedPairs.length === 0) return;

    const confirmMessage = `Are you sure you want to ${action} ${selectedPairs.length} forwarding pair(s)?`;
    if (action === 'delete' && !confirm(confirmMessage)) return;

    try {
      await dispatch(bulkPairOperation({
        action,
        pair_ids: selectedPairs,
        account_id: selectedAccount || undefined
      }));
      setSelectedPairs([]);
    } catch (error) {
      console.error(`Failed to ${action} pairs:`, error);
    }
  };

  const togglePairSelection = (pairId: number) => {
    setSelectedPairs(prev => 
      prev.includes(pairId) 
        ? prev.filter(id => id !== pairId)
        : [...prev, pairId]
    );
  };

  const selectAllPairs = () => {
    setSelectedPairs(filteredPairs.map(pair => pair.id));
  };

  const clearSelection = () => {
    setSelectedPairs([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-neon-green" />;
      case 'disconnected':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'reconnecting':
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-neon-blue animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-dark-muted" />;
    }
  };

  const getAccountBadgeColor = (accountId: number) => {
    const colors = [
      'bg-neon-blue/20 text-neon-blue border-neon-blue/30',
      'bg-neon-purple/20 text-neon-purple border-neon-purple/30',
      'bg-neon-orange/20 text-neon-orange border-neon-orange/30',
      'bg-neon-green/20 text-neon-green border-neon-green/30',
      'bg-neon-pink/20 text-neon-pink border-neon-pink/30',
    ];
    return colors[accountId % colors.length];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Forwarding Management</h1>
          <p className="text-dark-muted mt-1">
            Manage your message forwarding pairs across Telegram and Discord
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {planLimits && (
            <div className="text-sm text-dark-muted">
              {planLimits.current_pairs}/{planLimits.max_forwarding_pairs} pairs used
            </div>
          )}
          
          <button
            onClick={() => setShowPairBuilder(true)}
            disabled={Boolean(planLimits && planLimits.current_pairs >= planLimits.max_forwarding_pairs)}
            className="flex items-center gap-2 px-4 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-lg hover:bg-neon-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Pair
          </button>
        </div>
      </div>

      {/* Account Manager */}
      <AccountManager 
        telegramAccounts={telegramAccounts}
        discordAccounts={discordAccounts}
        selectedAccount={selectedAccount}
        sessionHealth={sessionHealth}
        onAccountSelect={(accountId) => dispatch(setSelectedAccount(accountId))}
        onAccountAdd={() => {}}
        onAccountRemove={() => {}}
        getStatusIcon={getStatusIcon}
        getBadgeColor={getAccountBadgeColor}
      />

      {/* Queue Status */}
      {queueStatus && (
        <QueueStatus 
          status={queueStatus}
          sessionHealth={sessionHealth}
        />
      )}

      {/* Search and filters */}
      <div className="flex items-center gap-4 p-4 bg-dark-card rounded-lg border border-dark-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input
            type="text"
            placeholder="Search by channel name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:border-neon-blue"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-neon-blue"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
        </select>

        {selectedPairs.length > 0 && (
          <BulkActions
            selectedCount={selectedPairs.length}
            onPause={() => handleBulkAction('pause')}
            onResume={() => handleBulkAction('resume')}
            onDelete={() => handleBulkAction('delete')}
            onClear={clearSelection}
          />
        )}
      </div>

      {/* Pairs list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-neon-blue" />
            <p className="text-dark-muted">Loading forwarding pairs...</p>
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="text-center py-12 bg-dark-card rounded-lg border border-dark-border">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-dark-muted" />
            <h3 className="text-lg font-medium text-dark-text mb-2">No forwarding pairs found</h3>
            <p className="text-dark-muted mb-4">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first forwarding pair to get started'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => setShowPairBuilder(true)}
                className="px-4 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-lg hover:bg-neon-blue/30 transition-colors"
              >
                Create First Pair
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Select all option */}
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-dark-muted">
              <input
                type="checkbox"
                checked={selectedPairs.length === filteredPairs.length && filteredPairs.length > 0}
                onChange={selectedPairs.length === filteredPairs.length ? clearSelection : selectAllPairs}
                className="rounded border-dark-border"
              />
              <span>
                {selectedPairs.length === 0 
                  ? `Select all ${filteredPairs.length} pairs`
                  : `${selectedPairs.length} of ${filteredPairs.length} selected`
                }
              </span>
            </div>

            {/* Pairs grid */}
            <div className="grid gap-4">
              {filteredPairs.map(pair => (
                <PairCard
                  key={pair.id}
                  pair={pair}
                  isSelected={selectedPairs.includes(pair.id)}
                  onSelect={() => togglePairSelection(pair.id)}
                  onAction={(action) => handlePairAction(pair.id, action)}
                  getStatusIcon={getStatusIcon}
                  getBadgeColor={getAccountBadgeColor}
                  telegramAccounts={telegramAccounts}
                  discordAccounts={discordAccounts}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pair Builder Modal */}
      {showPairBuilder && (
        <PairBuilder
          editingPair={editingPair}
          telegramAccounts={telegramAccounts}
          discordAccounts={discordAccounts}
          planLimits={planLimits}
          onClose={() => {
            setShowPairBuilder(false);
            setEditingPair(null);
          }}
          onSave={() => {
            setShowPairBuilder(false);
            setEditingPair(null);
            dispatch(fetchForwardingPairs());
          }}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForwardingManagement;