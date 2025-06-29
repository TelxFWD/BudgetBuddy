'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Users, 
  MessageCircle, 
  Phone,
  Bot
} from 'lucide-react';
import { TelegramAccount, DiscordAccount, SessionHealth } from '@/types';

interface AccountManagerProps {
  telegramAccounts: TelegramAccount[];
  discordAccounts: DiscordAccount[];
  selectedAccount: number | null;
  sessionHealth: SessionHealth | null;
  onAccountSelect: (accountId: number | null) => void;
  onAccountAdd: (platform: 'telegram' | 'discord') => void;
  onAccountRemove: (platform: 'telegram' | 'discord', accountId: number) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getBadgeColor: (accountId: number) => string;
}

const AccountManager: React.FC<AccountManagerProps> = ({
  telegramAccounts,
  discordAccounts,
  selectedAccount,
  sessionHealth,
  onAccountSelect,
  onAccountAdd,
  onAccountRemove,
  getStatusIcon,
  getBadgeColor
}) => {
  const [showAddTelegram, setShowAddTelegram] = useState(false);
  const [showAddDiscord, setShowAddDiscord] = useState(false);

  const getSessionStatus = (platform: 'telegram' | 'discord', accountId: number) => {
    if (!sessionHealth) return 'unknown';
    
    const sessions = platform === 'telegram' 
      ? sessionHealth.telegram_sessions 
      : sessionHealth.discord_sessions;
    
    return sessions[accountId]?.status || 'unknown';
  };

  return (
    <div className="space-y-4">
      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telegram Accounts */}
        <div className="bg-[#1a1a1b] rounded-lg border border-dark-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-neon-blue" />
              <h3 className="font-medium text-dark-text">Telegram Accounts</h3>
              <span className="text-sm text-dark-muted">({telegramAccounts.length})</span>
            </div>
            <button
              onClick={() => setShowAddTelegram(true)}
              className="p-2 text-neon-blue hover:bg-neon-blue/20 rounded-lg transition-colors"
              title="Add Telegram account"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {telegramAccounts.length === 0 ? (
              <div className="text-center py-6 text-dark-muted">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No Telegram accounts connected</p>
              </div>
            ) : (
              telegramAccounts.map(account => (
                <div 
                  key={account.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAccount === account.id
                      ? 'border-neon-blue bg-neon-blue/10'
                      : 'border-dark-border hover:border-dark-border hover:bg-dark-bg/50'
                  }`}
                  onClick={() => onAccountSelect(selectedAccount === account.id ? null : account.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs border ${getBadgeColor(account.id)}`}>
                        TG-{account.id}
                      </div>
                      <div>
                        <div className="font-medium text-dark-text">
                          {account.display_name || account.username || account.phone_number}
                        </div>
                        <div className="text-xs text-dark-muted">
                          {account.phone_number}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(getSessionStatus('telegram', account.id))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAccountRemove('telegram', account.id);
                        }}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Discord Accounts */}
        <div className="bg-[#1a1a1b] rounded-lg border border-dark-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-neon-purple" />
              <h3 className="font-medium text-dark-text">Discord Accounts</h3>
              <span className="text-sm text-dark-muted">({discordAccounts.length})</span>
            </div>
            <button
              onClick={() => setShowAddDiscord(true)}
              className="p-2 text-neon-purple hover:bg-neon-purple/20 rounded-lg transition-colors"
              title="Add Discord account"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {discordAccounts.length === 0 ? (
              <div className="text-center py-6 text-dark-muted">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No Discord accounts connected</p>
              </div>
            ) : (
              discordAccounts.map(account => (
                <div 
                  key={account.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAccount === account.id
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-dark-border hover:border-dark-border hover:bg-dark-bg/50'
                  }`}
                  onClick={() => onAccountSelect(selectedAccount === account.id ? null : account.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs border ${getBadgeColor(account.id)}`}>
                        DC-{account.id}
                      </div>
                      <div>
                        <div className="font-medium text-dark-text">
                          {account.display_name || `Discord Bot ${account.id}`}
                        </div>
                        <div className="text-xs text-dark-muted">
                          {account.discord_servers?.length || 0} servers
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(getSessionStatus('discord', account.id))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAccountRemove('discord', account.id);
                        }}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Account Filter Info */}
      {selectedAccount && (
        <div className="p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
          <div className="flex items-center gap-2 text-neon-blue text-sm">
            <Users className="w-4 h-4" />
            <span>
              Showing pairs for {
                telegramAccounts.find(acc => acc.id === selectedAccount)?.display_name ||
                discordAccounts.find(acc => acc.id === selectedAccount)?.display_name ||
                `Account ${selectedAccount}`
              }
            </span>
            <button
              onClick={() => onAccountSelect(null)}
              className="ml-auto p-1 hover:bg-neon-blue/20 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;