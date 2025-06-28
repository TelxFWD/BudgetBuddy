/**
 * Visual Drag-and-Drop Forwarding Pair Builder
 * Allows users to create forwarding pairs by dragging sources to destinations
 */

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Settings, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Copy,
  Clock,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Account {
  id: number;
  platform: 'telegram' | 'discord';
  name: string;
  status: 'active' | 'inactive' | 'error';
  channels: Channel[];
}

interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'group' | 'dm';
}

interface ForwardingPair {
  id: number;
  sourceAccount: Account;
  sourceChannel: Channel;
  destinationAccount: Account;
  destinationChannel: Channel;
  delay: number;
  silentMode: boolean;
  copyMode: boolean;
  status: 'active' | 'paused' | 'error';
}

interface ForwardingPairBuilderProps {
  accounts: Account[];
  existingPairs: ForwardingPair[];
  onCreatePair: (pair: Omit<ForwardingPair, 'id'>) => void;
  onUpdatePair: (pairId: number, updates: Partial<ForwardingPair>) => void;
  onDeletePair: (pairId: number) => void;
}

export const ForwardingPairBuilder: React.FC<ForwardingPairBuilderProps> = ({
  accounts,
  existingPairs,
  onCreatePair,
  onUpdatePair,
  onDeletePair
}) => {
  const [selectedSource, setSelectedSource] = useState<{account: Account, channel: Channel} | null>(null);
  const [showSettings, setShowSettings] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<{account: Account, channel: Channel} | null>(null);

  const handleDragStart = useCallback((start: any) => {
    const [accountId, channelId] = start.draggableId.split('-');
    const account = accounts.find(a => a.id.toString() === accountId);
    const channel = account?.channels.find(c => c.id === channelId);
    
    if (account && channel) {
      setDraggedItem({ account, channel });
    }
  }, [accounts]);

  const handleDragEnd = useCallback((result: DropResult) => {
    setDraggedItem(null);
    
    if (!result.destination) return;
    
    const [sourceAccountId, sourceChannelId] = result.draggableId.split('-');
    const [destAccountId, destChannelId] = result.destination.droppableId.split('-');
    
    const sourceAccount = accounts.find(a => a.id.toString() === sourceAccountId);
    const sourceChannel = sourceAccount?.channels.find(c => c.id === sourceChannelId);
    const destAccount = accounts.find(a => a.id.toString() === destAccountId);
    const destChannel = destAccount?.channels.find(c => c.id === destChannelId);
    
    if (sourceAccount && sourceChannel && destAccount && destChannel) {
      // Check if pair already exists
      const existingPair = existingPairs.find(p => 
        p.sourceAccount.id === sourceAccount.id && 
        p.sourceChannel.id === sourceChannel.id &&
        p.destinationAccount.id === destAccount.id &&
        p.destinationChannel.id === destChannel.id
      );
      
      if (!existingPair) {
        onCreatePair({
          sourceAccount,
          sourceChannel,
          destinationAccount: destAccount,
          destinationChannel: destChannel,
          delay: 0,
          silentMode: false,
          copyMode: false,
          status: 'active'
        });
      }
    }
  }, [accounts, existingPairs, onCreatePair]);

  const AccountCard: React.FC<{ account: Account; isDestination?: boolean }> = ({ account, isDestination = false }) => (
    <div className={`
      bg-dark-card border border-dark-border rounded-lg p-4 mb-4
      ${isDestination ? 'border-neon-blue border-dashed' : ''}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            account.status === 'active' ? 'bg-neon-green' : 
            account.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <h3 className="font-semibold text-dark-text">{account.name}</h3>
          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
            {account.platform}
          </span>
        </div>
      </div>
      
      {isDestination ? (
        <Droppable droppableId={`${account.id}-destination`} type="channel">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                min-h-[100px] p-3 rounded border-2 border-dashed transition-colors
                ${snapshot.isDraggingOver 
                  ? 'border-neon-blue bg-blue-900/20' 
                  : 'border-gray-600'
                }
              `}
            >
              <p className="text-center text-gray-400 text-sm">
                Drop channel here to create forwarding pair
              </p>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className="space-y-2">
          {account.channels.map((channel, index) => (
            <Draggable
              key={`${account.id}-${channel.id}`}
              draggableId={`${account.id}-${channel.id}`}
              index={index}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`
                    p-2 rounded bg-gray-800 border border-gray-700 cursor-move
                    transition-all duration-200 hover:border-neon-blue
                    ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-lg shadow-neon-blue/30' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-dark-text text-sm">{channel.name}</span>
                    <span className="text-xs text-gray-400">{channel.type}</span>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
        </div>
      )}
    </div>
  );

  const ForwardingPairCard: React.FC<{ pair: ForwardingPair }> = ({ pair }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-dark-card border border-dark-border rounded-lg p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            pair.status === 'active' ? 'bg-neon-green' : 
            pair.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-dark-text font-medium">Forwarding Pair #{pair.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(showSettings === pair.id ? null : pair.id)}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => onUpdatePair(pair.id, { 
              status: pair.status === 'active' ? 'paused' : 'active' 
            })}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            {pair.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => onDeletePair(pair.id)}
            className="p-1 rounded hover:bg-red-700 text-gray-400 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="text-xs text-gray-400">From</div>
          <div className="text-sm text-dark-text">
            {pair.sourceAccount.name} → {pair.sourceChannel.name}
          </div>
        </div>
        <ChevronRight className="text-neon-blue" size={20} />
        <div className="flex-1">
          <div className="text-xs text-gray-400">To</div>
          <div className="text-sm text-dark-text">
            {pair.destinationAccount.name} → {pair.destinationChannel.name}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{pair.delay}s delay</span>
        </div>
        <div className="flex items-center gap-1">
          {pair.silentMode ? <VolumeX size={12} /> : <Volume2 size={12} />}
          <span>{pair.silentMode ? 'Silent' : 'Normal'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Copy size={12} />
          <span>{pair.copyMode ? 'Copy' : 'Forward'}</span>
        </div>
      </div>

      <AnimatePresence>
        {showSettings === pair.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-gray-700"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Delay (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={pair.delay}
                  onChange={(e) => onUpdatePair(pair.id, { delay: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={pair.silentMode}
                    onChange={(e) => onUpdatePair(pair.id, { silentMode: e.target.checked })}
                    className="rounded"
                  />
                  Silent Mode
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={pair.copyMode}
                    onChange={(e) => onUpdatePair(pair.id, { copyMode: e.target.checked })}
                    className="rounded"
                  />
                  Copy Mode
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const sourceAccounts = accounts.filter(a => a.status === 'active');
  const destinationAccounts = accounts.filter(a => a.status === 'active');

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-dark-text">Forwarding Pair Builder</h2>
          <div className="text-sm text-gray-400">
            Drag channels from source to destination to create forwarding pairs
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Accounts */}
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-4">Source Accounts</h3>
            {sourceAccounts.map(account => (
              <AccountCard key={`source-${account.id}`} account={account} />
            ))}
          </div>

          {/* Destination Accounts */}
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-4">Destination Accounts</h3>
            {destinationAccounts.map(account => (
              <AccountCard key={`dest-${account.id}`} account={account} isDestination />
            ))}
          </div>
        </div>

        {/* Existing Forwarding Pairs */}
        {existingPairs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-4">Active Forwarding Pairs</h3>
            <AnimatePresence>
              {existingPairs.map(pair => (
                <ForwardingPairCard key={pair.id} pair={pair} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Drag Preview */}
        {draggedItem && (
          <div className="fixed top-4 right-4 z-50 bg-dark-card border border-neon-blue rounded-lg p-3 shadow-lg">
            <div className="text-sm text-dark-text">
              Dragging: {draggedItem.account.name} → {draggedItem.channel.name}
            </div>
            <div className="text-xs text-gray-400">
              Drop on destination channel to create pair
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};