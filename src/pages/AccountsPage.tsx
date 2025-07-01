import React, { useState, useEffect } from 'react'
import { Plus, MessageSquare, Hash, Zap, RefreshCw, Trash2, Users, Crown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { accountsAPI } from '../api/endpoints'

interface Account {
  id: number
  platform: 'telegram' | 'discord'
  username: string
  status: 'connected' | 'disconnected' | 'error'
  sessions: number
  last_active: string
  is_primary: boolean
}

const AccountsPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'telegram' | 'discord'>('telegram')
  const [telegramAccounts, setTelegramAccounts] = useState<Account[]>([])
  const [discordAccounts, setDiscordAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const planLimits = {
    Free: { telegram: 1, discord: 0 },
    Pro: { telegram: 2, discord: 1 },
    Elite: { telegram: 3, discord: 3 }
  }

  const currentLimits = planLimits[user?.plan || 'Free']
  const currentAccounts = activeTab === 'telegram' ? telegramAccounts : discordAccounts
  const currentLimit = currentLimits[activeTab]
  const canAddMore = currentAccounts.length < currentLimit

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const [telegramResponse, discordResponse] = await Promise.all([
        accountsAPI.getTelegramAccounts(),
        accountsAPI.getDiscordAccounts()
      ])
      setTelegramAccounts(telegramResponse.data)
      setDiscordAccounts(discordResponse.data)
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccountAction = async (accountId: number, action: 'reconnect' | 'switch' | 'remove') => {
    try {
      switch (action) {
        case 'reconnect':
          await accountsAPI.reconnectAccount(activeTab, accountId)
          break
        case 'switch':
          await accountsAPI.switchAccount(activeTab, accountId)
          break
        case 'remove':
          if (window.confirm('Are you sure you want to remove this account?')) {
            await accountsAPI.removeAccount(activeTab, accountId)
          } else {
            return
          }
          break
      }
      loadAccounts() // Refresh the list
    } catch (error) {
      console.error(`Failed to ${action} account:`, error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'status-online'
      case 'disconnected': return 'status-offline'
      case 'error': return 'status-warning'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected'
      case 'disconnected': return 'Disconnected'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  const getPlatformIcon = (platform: string) => {
    return platform === 'telegram' ? MessageSquare : Hash
  }

  const getPlatformColor = (platform: string) => {
    return platform === 'telegram' ? 'text-blue-400' : 'text-purple-400'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="h-12 bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Account Manager</h1>
          <p className="text-gray-400">
            Manage your Telegram and Discord account connections
          </p>
        </div>
        <button
          disabled={!canAddMore}
          className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            canAddMore
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {activeTab === 'telegram' ? 'Telegram' : 'Discord'} Account
          {!canAddMore && ' (Limit Reached)'}
        </button>
      </div>

      {/* Plan Information */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Crown className="h-5 w-5 text-yellow-400 mr-2" />
            <span className="text-white font-medium">{user?.plan} Plan</span>
          </div>
          <div className="text-sm text-gray-300">
            Telegram: {telegramAccounts.length}/{currentLimits.telegram} • 
            Discord: {discordAccounts.length}/{currentLimits.discord}
          </div>
        </div>
        {user?.plan === 'Free' && (
          <p className="text-sm text-gray-400 mt-2">
            Upgrade to Pro for Discord support and additional Telegram accounts
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'telegram'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Telegram Sessions ({telegramAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('discord')}
          disabled={user?.plan === 'Free'}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'discord'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
              : user?.plan === 'Free' 
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white'
          }`}
        >
          <Hash className="h-4 w-4 mr-2" />
          Discord Sessions ({discordAccounts.length})
          {user?.plan === 'Free' && (
            <span className="ml-1 text-xs bg-yellow-500/20 text-yellow-400 px-1 rounded">Pro+</span>
          )}
        </button>
      </div>

      {/* Accounts List */}
      {currentAccounts.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="mx-auto h-12 w-12 bg-gray-700 rounded-xl flex items-center justify-center mb-4">
            {React.createElement(getPlatformIcon(activeTab), { 
              className: `h-6 w-6 ${getPlatformColor(activeTab)}` 
            })}
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No {activeTab} accounts connected
          </h3>
          <p className="text-gray-400 mb-6">
            {activeTab === 'telegram' 
              ? "Connect your Telegram account to start forwarding messages"
              : user?.plan === 'Free'
                ? "Discord support requires Pro or Elite plan"
                : "Connect your Discord bot to enable cross-platform forwarding"
            }
          </p>
          {canAddMore && (
            <button
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-xl text-sm font-medium transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect {activeTab === 'telegram' ? 'Telegram' : 'Discord'} Account
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Status Indicator */}
                  <div className="relative">
                    {React.createElement(getPlatformIcon(account.platform), { 
                      className: `h-10 w-10 ${getPlatformColor(account.platform)} p-2 bg-gray-700 rounded-xl` 
                    })}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(account.status)}`}></div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-medium text-white">{account.username}</h3>
                      {account.is_primary && (
                        <span className="px-2 py-1 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                          Primary
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        account.status === 'connected' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : account.status === 'disconnected'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      }`}>
                        {getStatusText(account.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {account.sessions} active sessions
                      </span>
                      <span>
                        Last active: {new Date(account.last_active).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAccountAction(account.id, 'reconnect')}
                    className="px-3 py-2 text-sm text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reconnect
                  </button>
                  {!account.is_primary && (
                    <button
                      onClick={() => handleAccountAction(account.id, 'switch')}
                      className="px-3 py-2 text-sm text-gray-300 bg-gray-600/50 border border-gray-500/30 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Make Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleAccountAction(account.id, 'remove')}
                    className="px-3 py-2 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Prompt for Free Users */}
      {user?.plan === 'Free' && activeTab === 'discord' && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
          <Crown className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">Upgrade Required</h3>
          <p className="text-gray-400 mb-4">
            Discord integration is available with Pro and Elite plans. Unlock cross-platform forwarding and advanced features.
          </p>
          <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-200">
            Upgrade to Pro Plan
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountsPage