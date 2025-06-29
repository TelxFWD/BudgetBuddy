'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  ArrowRight, 
  Clock, 
  Volume2, 
  VolumeX, 
  Copy, 
  Save,
  MessageCircle,
  Bot,
  Hash,
  Users,
  RefreshCw
} from 'lucide-react';
import { 
  ForwardingPair, 
  ForwardingPairCreate,
  TelegramAccount, 
  DiscordAccount, 
  TelegramChannel, 
  DiscordServer,
  PlanLimits 
} from '@/types';
import { forwardingService } from '@/services/forwardingService';

interface PairBuilderProps {
  editingPair: ForwardingPair | null;
  telegramAccounts: TelegramAccount[];
  discordAccounts: DiscordAccount[];
  planLimits: PlanLimits | null;
  onClose: () => void;
  onSave: () => void;
}

const PairBuilder: React.FC<PairBuilderProps> = ({
  editingPair,
  telegramAccounts,
  discordAccounts,
  planLimits,
  onClose,
  onSave
}) => {
  // Form state
  const [sourcePlatform, setSourcePlatform] = useState<'telegram' | 'discord'>('telegram');
  const [sourceAccountId, setSourceAccountId] = useState<number | null>(null);
  const [sourceChannels, setSourceChannels] = useState<(TelegramChannel | DiscordServer)[]>([]);
  const [sourceChatId, setSourceChatId] = useState('');
  const [sourceChannelSearch, setSourceChannelSearch] = useState('');
  
  const [destinationPlatform, setDestinationPlatform] = useState<'telegram' | 'discord'>('discord');
  const [destinationAccountId, setDestinationAccountId] = useState<number | null>(null);
  const [destinationChannels, setDestinationChannels] = useState<(TelegramChannel | DiscordServer)[]>([]);
  const [destinationChatId, setDestinationChatId] = useState('');
  const [destinationChannelSearch, setDestinationChannelSearch] = useState('');
  
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [customDelay, setCustomDelay] = useState('');
  const [silentMode, setSilentMode] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with editing data
  useEffect(() => {
    if (editingPair) {
      setSourcePlatform(editingPair.source_platform);
      setSourceAccountId(editingPair.source_account_id);
      setSourceChatId(editingPair.source_chat_id);
      setDestinationPlatform(editingPair.destination_platform);
      setDestinationAccountId(editingPair.destination_account_id);
      setDestinationChatId(editingPair.destination_chat_id);
      setDelaySeconds(editingPair.delay_seconds);
      setSilentMode(editingPair.silent_mode);
      setCopyMode(editingPair.copy_mode);
      
      if (editingPair.delay_seconds > 0 && ![0, 5, 10, 30, 60].includes(editingPair.delay_seconds)) {
        setCustomDelay(editingPair.delay_seconds.toString());
      }
    }
  }, [editingPair]);

  // Load channels when account changes
  useEffect(() => {
    if (sourceAccountId && sourcePlatform) {
      loadChannels('source', sourcePlatform, sourceAccountId);
    }
  }, [sourceAccountId, sourcePlatform]);

  useEffect(() => {
    if (destinationAccountId && destinationPlatform) {
      loadChannels('destination', destinationPlatform, destinationAccountId);
    }
  }, [destinationAccountId, destinationPlatform]);

  const loadChannels = async (type: 'source' | 'destination', platform: 'telegram' | 'discord', accountId: number) => {
    setLoadingChannels(true);
    try {
      let channels: (TelegramChannel | DiscordServer)[] = [];
      
      if (platform === 'telegram') {
        channels = await forwardingService.getTelegramChannels(accountId);
      } else {
        channels = await forwardingService.getDiscordServers(accountId);
      }
      
      if (type === 'source') {
        setSourceChannels(channels);
      } else {
        setDestinationChannels(channels);
      }
    } catch (error) {
      console.error(`Failed to load ${platform} channels:`, error);
      setError(`Failed to load ${platform} channels`);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleDelayChange = (value: string) => {
    if (value === 'custom') {
      setDelaySeconds(parseInt(customDelay) || 0);
    } else {
      setDelaySeconds(parseInt(value));
      setCustomDelay('');
    }
  };

  const handleCustomDelayChange = (value: string) => {
    setCustomDelay(value);
    const seconds = parseInt(value);
    if (!isNaN(seconds) && seconds >= 0) {
      setDelaySeconds(seconds);
    }
  };

  const getFilteredChannels = (channels: (TelegramChannel | DiscordServer)[], search: string, platform: 'telegram' | 'discord') => {
    if (!search) return channels;
    
    return channels.filter(channel => {
      if (platform === 'telegram') {
        const tgChannel = channel as TelegramChannel;
        return tgChannel.title.toLowerCase().includes(search.toLowerCase()) ||
               tgChannel.username?.toLowerCase().includes(search.toLowerCase());
      } else {
        const dcServer = channel as DiscordServer;
        return dcServer.name.toLowerCase().includes(search.toLowerCase()) ||
               dcServer.channels.some(ch => ch.name.toLowerCase().includes(search.toLowerCase()));
      }
    });
  };

  const renderChannelSelector = (
    type: 'source' | 'destination',
    platform: 'telegram' | 'discord',
    accountId: number | null,
    channels: (TelegramChannel | DiscordServer)[],
    search: string,
    selectedChatId: string,
    onSearchChange: (value: string) => void,
    onChannelSelect: (chatId: string) => void
  ) => {
    const accounts = platform === 'telegram' ? telegramAccounts : discordAccounts;
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      return (
        <div className="p-4 text-center text-dark-muted">
          Select an account first
        </div>
      );
    }

    const filteredChannels = getFilteredChannels(channels, search, platform);

    return (
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input
            type="text"
            placeholder={`Search ${platform} channels...`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:border-neon-blue"
          />
        </div>

        {/* Loading */}
        {loadingChannels && (
          <div className="text-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-neon-blue" />
            <p className="text-sm text-dark-muted">Loading channels...</p>
          </div>
        )}

        {/* Channels list */}
        {!loadingChannels && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredChannels.length === 0 ? (
              <div className="text-center py-4 text-dark-muted">
                <p className="text-sm">No channels found</p>
              </div>
            ) : (
              filteredChannels.map((channel) => {
                if (platform === 'telegram') {
                  const tgChannel = channel as TelegramChannel;
                  return (
                    <button
                      key={tgChannel.id}
                      onClick={() => onChannelSelect(tgChannel.id)}
                      className={`w-full p-3 text-left rounded-lg border transition-all ${
                        selectedChatId === tgChannel.id
                          ? 'border-neon-blue bg-neon-blue/10'
                          : 'border-dark-border hover:border-dark-border/80 hover:bg-dark-bg/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-neon-blue" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-dark-text truncate">
                            {tgChannel.title}
                          </div>
                          {tgChannel.username && (
                            <div className="text-xs text-dark-muted">
                              @{tgChannel.username}
                            </div>
                          )}
                          {tgChannel.member_count && (
                            <div className="text-xs text-dark-muted">
                              {tgChannel.member_count} members
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                } else {
                  const dcServer = channel as DiscordServer;
                  return (
                    <div key={dcServer.id} className="space-y-1">
                      <div className="px-3 py-2 bg-dark-bg/50 rounded text-sm font-medium text-dark-text">
                        {dcServer.name}
                      </div>
                      {dcServer.channels.map((dcChannel) => (
                        <button
                          key={dcChannel.id}
                          onClick={() => onChannelSelect(dcChannel.id)}
                          className={`w-full p-2 text-left rounded border transition-all ml-4 ${
                            selectedChatId === dcChannel.id
                              ? 'border-neon-purple bg-neon-purple/10'
                              : 'border-dark-border hover:border-dark-border/80 hover:bg-dark-bg/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3 text-neon-purple" />
                            <span className="text-sm text-dark-text">{dcChannel.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                }
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSave = async () => {
    if (!sourceAccountId || !sourceChatId || !destinationAccountId || !destinationChatId) {
      setError('Please select source and destination channels');
      return;
    }

    if (planLimits && !editingPair && planLimits.current_pairs >= planLimits.max_forwarding_pairs) {
      setError(`You've reached your plan limit of ${planLimits.max_forwarding_pairs} forwarding pairs`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pairData: ForwardingPairCreate = {
        source_platform: sourcePlatform,
        source_account_id: sourceAccountId,
        source_chat_id: sourceChatId,
        destination_platform: destinationPlatform,
        destination_account_id: destinationAccountId,
        destination_chat_id: destinationChatId,
        delay_seconds: delaySeconds,
        silent_mode: silentMode,
        copy_mode: copyMode
      };

      if (editingPair) {
        await forwardingService.updateForwardingPair(editingPair.id, pairData);
      } else {
        await forwardingService.createForwardingPair(pairData);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save forwarding pair:', error);
      setError('Failed to save forwarding pair. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1b] rounded-lg border border-dark-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold text-dark-text">
            {editingPair ? 'Edit Forwarding Pair' : 'Create Forwarding Pair'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-dark-muted hover:bg-dark-bg rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Source Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-dark-text flex items-center gap-2">
              <div className="w-6 h-6 bg-neon-blue/20 text-neon-blue rounded-full flex items-center justify-center text-sm font-bold">1</div>
              Source (Where messages come from)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Platform and Account Selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">Platform</label>
                  <select
                    value={sourcePlatform}
                    onChange={(e) => {
                      setSourcePlatform(e.target.value as 'telegram' | 'discord');
                      setSourceAccountId(null);
                      setSourceChatId('');
                    }}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-neon-blue"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">Account</label>
                  <select
                    value={sourceAccountId || ''}
                    onChange={(e) => {
                      setSourceAccountId(e.target.value ? parseInt(e.target.value) : null);
                      setSourceChatId('');
                    }}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-neon-blue"
                  >
                    <option value="">Select account</option>
                    {(sourcePlatform === 'telegram' ? telegramAccounts : discordAccounts).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.display_name || `Account ${account.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">Channel</label>
                <div className="border border-dark-border rounded-lg">
                  {renderChannelSelector(
                    'source',
                    sourcePlatform,
                    sourceAccountId,
                    sourceChannels,
                    sourceChannelSearch,
                    sourceChatId,
                    setSourceChannelSearch,
                    setSourceChatId
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="p-3 bg-dark-bg rounded-full border border-dark-border">
              <ArrowRight className="w-6 h-6 text-neon-blue" />
            </div>
          </div>

          {/* Destination Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-dark-text flex items-center gap-2">
              <div className="w-6 h-6 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center text-sm font-bold">2</div>
              Destination (Where messages go to)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Platform and Account Selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">Platform</label>
                  <select
                    value={destinationPlatform}
                    onChange={(e) => {
                      setDestinationPlatform(e.target.value as 'telegram' | 'discord');
                      setDestinationAccountId(null);
                      setDestinationChatId('');
                    }}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-neon-blue"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">Account</label>
                  <select
                    value={destinationAccountId || ''}
                    onChange={(e) => {
                      setDestinationAccountId(e.target.value ? parseInt(e.target.value) : null);
                      setDestinationChatId('');
                    }}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-neon-blue"
                  >
                    <option value="">Select account</option>
                    {(destinationPlatform === 'telegram' ? telegramAccounts : discordAccounts).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.display_name || `Account ${account.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">Channel</label>
                <div className="border border-dark-border rounded-lg">
                  {renderChannelSelector(
                    'destination',
                    destinationPlatform,
                    destinationAccountId,
                    destinationChannels,
                    destinationChannelSearch,
                    destinationChatId,
                    setDestinationChannelSearch,
                    setDestinationChatId
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-dark-text flex items-center gap-2">
              <div className="w-6 h-6 bg-neon-orange/20 text-neon-orange rounded-full flex items-center justify-center text-sm font-bold">3</div>
              Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delay Settings */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-dark-text">Forwarding Delay</label>
                <select
                  value={[0, 5, 10, 30, 60].includes(delaySeconds) ? delaySeconds.toString() : 'custom'}
                  onChange={(e) => handleDelayChange(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-neon-blue"
                >
                  <option value="0">Instant</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="custom">Custom</option>
                </select>

                {(![0, 5, 10, 30, 60].includes(delaySeconds) || customDelay) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Seconds"
                      value={customDelay}
                      onChange={(e) => handleCustomDelayChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:border-neon-blue"
                    />
                    <Clock className="w-4 h-4 text-dark-muted" />
                  </div>
                )}
              </div>

              {/* Mode Settings */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-dark-text">Forwarding Mode</label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg border border-dark-border cursor-pointer hover:bg-dark-bg/80">
                    <input
                      type="checkbox"
                      checked={silentMode}
                      onChange={(e) => setSilentMode(e.target.checked)}
                      className="rounded border-dark-border focus:ring-neon-blue"
                    />
                    <div className="flex items-center gap-2">
                      {silentMode ? <VolumeX className="w-4 h-4 text-neon-orange" /> : <Volume2 className="w-4 h-4 text-dark-muted" />}
                      <span className="text-sm text-dark-text">Silent Mode</span>
                    </div>
                    <span className="text-xs text-dark-muted ml-auto">No notification sounds</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg border border-dark-border cursor-pointer hover:bg-dark-bg/80">
                    <input
                      type="checkbox"
                      checked={copyMode}
                      onChange={(e) => setCopyMode(e.target.checked)}
                      className="rounded border-dark-border focus:ring-neon-blue"
                    />
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-neon-blue" />
                      <span className="text-sm text-dark-text">Copy Mode</span>
                    </div>
                    <span className="text-xs text-dark-muted ml-auto">Copy instead of forward</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Plan Limits Info */}
          {planLimits && !editingPair && (
            <div className="p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
              <div className="text-sm text-neon-blue">
                Plan Usage: {planLimits.current_pairs}/{planLimits.max_forwarding_pairs} forwarding pairs
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-dark-border rounded-lg text-dark-text hover:bg-dark-bg transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading || !sourceAccountId || !sourceChatId || !destinationAccountId || !destinationChatId}
            className="flex items-center gap-2 px-6 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-lg hover:bg-neon-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isLoading ? 'Saving...' : editingPair ? 'Update Pair' : 'Create Pair'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PairBuilder;