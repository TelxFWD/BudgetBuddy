/**
 * Bulk Operations Component for Forwarding Pair Management
 * Handles bulk actions like pause all, resume all, delete all with confirmation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';

interface ForwardingPair {
  id: number;
  sourceAccount: string;
  sourceChannel: string;
  destinationAccount: string;
  destinationChannel: string;
  status: 'active' | 'paused' | 'error';
  delay: number;
  silentMode: boolean;
  copyMode: boolean;
  messagesForwarded: number;
  lastActivity?: string;
}

interface BulkOperationsProps {
  pairs: ForwardingPair[];
  onBulkAction: (action: 'pause' | 'resume' | 'delete', pairIds: number[]) => Promise<void>;
  onPairUpdate: (pairId: number, updates: Partial<ForwardingPair>) => Promise<void>;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  pairs,
  onBulkAction,
  onPairUpdate
}) => {
  const [selectedPairs, setSelectedPairs] = useState<Set<number>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState<{
    action: 'pause' | 'resume' | 'delete';
    pairIds: number[];
  } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'error'>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredPairs = pairs.filter(pair => {
    if (filter === 'all') return true;
    return pair.status === filter;
  });

  const allSelected = filteredPairs.length > 0 && filteredPairs.every(pair => selectedPairs.has(pair.id));
  const someSelected = filteredPairs.some(pair => selectedPairs.has(pair.id));

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all
      setSelectedPairs(new Set());
    } else {
      // Select all visible pairs
      setSelectedPairs(new Set(filteredPairs.map(pair => pair.id)));
    }
  };

  const handleSelectPair = (pairId: number) => {
    setSelectedPairs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pairId)) {
        newSet.delete(pairId);
      } else {
        newSet.add(pairId);
      }
      return newSet;
    });
  };

  const handleBulkAction = (action: 'pause' | 'resume' | 'delete') => {
    const selectedArray = Array.from(selectedPairs);
    if (selectedArray.length === 0) return;

    setShowConfirmation({ action, pairIds: selectedArray });
  };

  const confirmBulkAction = async () => {
    if (!showConfirmation || isProcessing) return;

    setIsProcessing(true);
    try {
      await onBulkAction(showConfirmation.action, showConfirmation.pairIds);
      setSelectedPairs(new Set());
      setShowConfirmation(null);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'pause': return 'pause';
      case 'resume': return 'resume';
      case 'delete': return 'delete';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'pause': return 'text-yellow-500';
      case 'resume': return 'text-neon-green';
      case 'delete': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      status === 'active' ? 'bg-green-900 text-green-300' :
      status === 'paused' ? 'bg-yellow-900 text-yellow-300' :
      'bg-red-900 text-red-300'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        status === 'active' ? 'bg-neon-green' :
        status === 'paused' ? 'bg-yellow-500' :
        'bg-red-500'
      }`} />
      {status}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">Bulk Operations</h2>
        <div className="flex items-center gap-4">
          {/* Filter */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['all', 'active', 'paused', 'error'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                  filter === filterOption
                    ? 'bg-neon-blue text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filterOption} ({pairs.filter(p => filterOption === 'all' || p.status === filterOption).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Action Controls */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="text-neon-blue" size={20} />
              ) : someSelected ? (
                <div className="w-5 h-5 border-2 border-neon-blue rounded bg-neon-blue/30 flex items-center justify-center">
                  <div className="w-2 h-2 bg-neon-blue rounded" />
                </div>
              ) : (
                <Square size={20} />
              )}
              {allSelected ? 'Deselect All' : 'Select All'}
              {selectedPairs.size > 0 && ` (${selectedPairs.size} selected)`}
            </button>
          </div>

          {selectedPairs.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => handleBulkAction('resume')}
                className="flex items-center gap-1 px-3 py-1 bg-green-800 text-green-300 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play size={14} />
                Resume
              </button>
              <button
                onClick={() => handleBulkAction('pause')}
                className="flex items-center gap-1 px-3 py-1 bg-yellow-800 text-yellow-300 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Pause size={14} />
                Pause
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="flex items-center gap-1 px-3 py-1 bg-red-800 text-red-300 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Forwarding Pairs List */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold text-dark-text">
            Forwarding Pairs ({filteredPairs.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredPairs.map(pair => (
            <motion.div
              key={pair.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 hover:bg-gray-800/50 transition-colors ${
                selectedPairs.has(pair.id) ? 'bg-blue-900/20 border-l-4 border-neon-blue' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleSelectPair(pair.id)}
                  className="flex-shrink-0"
                >
                  {selectedPairs.has(pair.id) ? (
                    <CheckSquare className="text-neon-blue" size={20} />
                  ) : (
                    <Square className="text-gray-400 hover:text-white" size={20} />
                  )}
                </button>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium text-dark-text">
                      {pair.sourceAccount} → {pair.destinationAccount}
                    </div>
                    <div className="text-xs text-gray-400">
                      {pair.sourceChannel} → {pair.destinationChannel}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={pair.status} />
                  </div>

                  <div className="text-sm">
                    <div className="text-dark-text">{pair.messagesForwarded.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">messages</div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{pair.delay}s delay</span>
                    {pair.silentMode && <span>• Silent</span>}
                    {pair.copyMode && <span>• Copy</span>}
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400">
                      {pair.lastActivity ? new Date(pair.lastActivity).toLocaleDateString() : 'No activity'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPairUpdate(pair.id, { 
                      status: pair.status === 'active' ? 'paused' : 'active' 
                    })}
                    className={`p-1 rounded hover:bg-gray-700 transition-colors ${
                      pair.status === 'active' ? 'text-yellow-500' : 'text-neon-green'
                    }`}
                  >
                    {pair.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredPairs.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No forwarding pairs found for the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Pairs</p>
              <p className="text-2xl font-bold text-dark-text">{pairs.length}</p>
            </div>
            <Settings className="text-gray-500" size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-neon-green">
                {pairs.filter(p => p.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="text-neon-green" size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Paused</p>
              <p className="text-2xl font-bold text-yellow-500">
                {pairs.filter(p => p.status === 'paused').length}
              </p>
            </div>
            <Pause className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Errors</p>
              <p className="text-2xl font-bold text-red-500">
                {pairs.filter(p => p.status === 'error').length}
              </p>
            </div>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => !isProcessing && setShowConfirmation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card border border-dark-border rounded-lg p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-yellow-500" size={24} />
                <h3 className="text-lg font-semibold text-dark-text">Confirm Bulk Action</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to{' '}
                <span className={`font-medium ${getActionColor(showConfirmation.action)}`}>
                  {getActionText(showConfirmation.action)}
                </span>{' '}
                {showConfirmation.pairIds.length} forwarding pair{showConfirmation.pairIds.length !== 1 ? 's' : ''}?
                {showConfirmation.action === 'delete' && (
                  <span className="block mt-2 text-red-400 text-sm">
                    This action cannot be undone.
                  </span>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(null)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkAction}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    showConfirmation.action === 'delete'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : showConfirmation.action === 'pause'
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : `${getActionText(showConfirmation.action).charAt(0).toUpperCase() + getActionText(showConfirmation.action).slice(1)}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};