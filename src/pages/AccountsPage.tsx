import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { accountsAPI } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

// Simple toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-in slide-in-from-right duration-300`}>
    <div className="flex items-center justify-between">
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">×</button>
    </div>
  </div>
)

const AccountsPage: React.FC = () => {
  const { user } = useAuth()
  const [telegramAccounts, setTelegramAccounts] = useState<any[]>([])
  const [discordAccounts, setDiscordAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const setActionLoading = (actionKey: string, isLoading: boolean) => {
    setLoadingActions(prev => ({ ...prev, [actionKey]: isLoading }))
  }

  const loadAccounts = async () => {
    try {
      const [telegramResponse, discordResponse] = await Promise.all([
        accountsAPI.getTelegramAccounts(),
        accountsAPI.getDiscordAccounts()
      ])
      
      setTelegramAccounts(telegramResponse.data || [])
      setDiscordAccounts(discordResponse.data || [])
    } catch (error) {
      console.error('Failed to load accounts:', error)
      // Use demo data as fallback
      setTelegramAccounts([
        {
          id: 1,
          phone: '+1234567890',
          username: '@demoUser',
          status: 'connected',
          sessions: 2,
          lastActive: '2 minutes ago'
        }
      ])
      setDiscordAccounts([
        {
          id: 1,
          username: 'DemoBot#1234',
          status: 'connected',
          guilds: 3,
          lastActive: '5 minutes ago'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleRefresh = async () => {
    setActionLoading('refresh', true)
    try {
      await loadAccounts()
      showToast('Accounts refreshed successfully', 'success')
    } catch (error) {
      showToast('Failed to refresh accounts', 'error')
    } finally {
      setActionLoading('refresh', false)
    }
  }

  const handleAddTelegramAccount = async () => {
    const phone = prompt('Enter your phone number (with country code, e.g., +1234567890):')
    if (!phone) return

    setActionLoading('add-telegram', true)
    try {
      const response = await accountsAPI.addTelegramAccount(phone)
      showToast(response.data.message || 'Telegram account added successfully', 'success')
      await loadAccounts()
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to add Telegram account', 'error')
    } finally {
      setActionLoading('add-telegram', false)
    }
  }

  const handleAddDiscordBot = async () => {
    if (user?.plan?.toLowerCase() === 'free') {
      showToast('Discord support requires Pro or Elite plan. Please upgrade.', 'error')
      return
    }

    setActionLoading('add-discord', true)
    try {
      const response = await accountsAPI.getDiscordAuthUrl()
      const authUrl = response.data.auth_url
      window.open(authUrl, '_blank', 'width=500,height=600')
      showToast('Discord authorization opened in new tab', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to get Discord authorization URL', 'error')
    } finally {
      setActionLoading('add-discord', false)
    }
  }

  const handleReconnect = async (platform: string, accountId: number) => {
    setActionLoading(`reconnect-${platform}-${accountId}`, true)
    try {
      let response
      if (platform === 'telegram') {
        response = await accountsAPI.reconnectTelegramSession(accountId)
      } else {
        response = await accountsAPI.reconnectDiscordSession(accountId)
      }
      
      showToast(response.data.message || 'Account reconnected successfully', 'success')
      await loadAccounts()
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to reconnect account', 'error')
    } finally {
      setActionLoading(`reconnect-${platform}-${accountId}`, false)
    }
  }

  const handleSwitch = async (platform: string, accountId: number) => {
    setActionLoading(`switch-${platform}-${accountId}`, true)
    try {
      let response
      if (platform === 'telegram') {
        response = await accountsAPI.switchTelegramSession(accountId)
      } else {
        response = await accountsAPI.switchDiscordSession(accountId)
      }
      
      showToast(response.data.message || 'Switched account successfully', 'success')
      await loadAccounts()
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to switch account', 'error')
    } finally {
      setActionLoading(`switch-${platform}-${accountId}`, false)
    }
  }

  const handleRemove = async (platform: string, accountId: number) => {
    if (!confirm('Are you sure you want to remove this account?')) return

    setActionLoading(`remove-${platform}-${accountId}`, true)
    try {
      if (platform === 'telegram') {
        await accountsAPI.deleteTelegramSession(accountId)
        setTelegramAccounts(telegramAccounts.filter(acc => acc.id !== accountId))
      } else {
        await accountsAPI.deleteDiscordSession(accountId)
        setDiscordAccounts(discordAccounts.filter(acc => acc.id !== accountId))
      }
      
      showToast('Account removed successfully', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to remove account', 'error')
    } finally {
      setActionLoading(`remove-${platform}-${accountId}`, false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'disconnected':
        return <AlertCircle className="h-5 w-5 text-red-400" />
      default:
        return <Activity className="h-5 w-5 text-yellow-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs rounded-full font-medium"
    switch (status) {
      case 'connected':
        return `${baseClasses} bg-green-500/20 text-green-300 border border-green-500/30`
      case 'disconnected':
        return `${baseClasses} bg-red-500/20 text-red-300 border border-red-500/30`
      default:
        return `${baseClasses} bg-yellow-500/20 text-yellow-300 border border-yellow-500/30`
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Account Manager</h1>
          <p className="text-gray-400">Connect and manage your Telegram and Discord accounts</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loadingActions['refresh']}
          className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50"
          title="Refresh all accounts"
        >
          {loadingActions['refresh'] ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Plan Restrictions Notice */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-4">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-indigo-400 mr-3" />
          <div>
            <p className="text-white font-medium">Current Plan: {user?.plan || 'Free'}</p>
            <p className="text-gray-400 text-sm">
              {user?.plan?.toLowerCase() === 'free' 
                ? 'Free plan: Limited to 1 Telegram account. Upgrade for Discord support and unlimited accounts.'
                : user?.plan?.toLowerCase() === 'pro'
                ? 'Pro plan: Up to 3 accounts per platform with Discord support.'
                : 'Elite plan: Unlimited accounts with priority support.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Telegram Accounts */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <div className="bg-blue-500 rounded-lg p-2 mr-3">
              <Users className="h-5 w-5 text-white" />
            </div>
            Telegram Accounts
          </h2>
          <button 
            onClick={handleAddTelegramAccount}
            disabled={user?.plan?.toLowerCase() === 'free' && telegramAccounts.length >= 1 || loadingActions['add-telegram']}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingActions['add-telegram'] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Telegram Account
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-8">Loading accounts...</div>
        ) : telegramAccounts.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No Telegram accounts connected. Add your first account to start forwarding messages.
          </div>
        ) : (
          <div className="space-y-3">
            {telegramAccounts.map((account) => (
              <div key={account.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(account.status)}
                    <div className="ml-3">
                      <div className="flex items-center">
                        <span className="text-white font-medium">{account.username || account.phone}</span>
                        <span className={`ml-2 ${getStatusBadge(account.status)}`}>
                          {account.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400 mt-1">
                        <Activity className="h-4 w-4 mr-1" />
                        <span>{account.sessions || 0} sessions</span>
                        <span className="ml-4">Last: {account.lastActive || 'Never'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleReconnect('telegram', account.id)}
                      disabled={loadingActions[`reconnect-telegram-${account.id}`]}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Reconnect"
                    >
                      {loadingActions[`reconnect-telegram-${account.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSwitch('telegram', account.id)}
                      disabled={loadingActions[`switch-telegram-${account.id}`]}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Set as active"
                    >
                      {loadingActions[`switch-telegram-${account.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove('telegram', account.id)}
                      disabled={loadingActions[`remove-telegram-${account.id}`]}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove account"
                    >
                      {loadingActions[`remove-telegram-${account.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discord Accounts */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <div className="bg-indigo-500 rounded-lg p-2 mr-3">
              <Users className="h-5 w-5 text-white" />
            </div>
            Discord Accounts
          </h2>
          <button 
            onClick={handleAddDiscordBot}
            disabled={user?.plan?.toLowerCase() === 'free' || loadingActions['add-discord']}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
              user?.plan?.toLowerCase() === 'free' 
                ? 'bg-gray-600 text-gray-400'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600'
            }`}
          >
            {loadingActions['add-discord'] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Discord Bot
          </button>
        </div>

        {user?.plan?.toLowerCase() === 'free' ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-lg font-medium">Discord Support Available in Pro Plan</p>
            <p className="text-sm mt-2">Upgrade to Pro or Elite to connect Discord bots and enable cross-platform forwarding.</p>
            <button className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200">
              Upgrade Now
            </button>
          </div>
        ) : discordAccounts.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No Discord bots connected. Add a bot to enable Discord message forwarding.
          </div>
        ) : (
          <div className="space-y-3">
            {discordAccounts.map((account) => (
              <div key={account.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(account.status)}
                    <div className="ml-3">
                      <div className="flex items-center">
                        <span className="text-white font-medium">{account.username}</span>
                        <span className={`ml-2 ${getStatusBadge(account.status)}`}>
                          {account.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400 mt-1">
                        <Activity className="h-4 w-4 mr-1" />
                        <span>{account.guilds || 0} servers</span>
                        <span className="ml-4">Last: {account.lastActive || 'Never'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleReconnect('discord', account.id)}
                      disabled={loadingActions[`reconnect-discord-${account.id}`]}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Reconnect"
                    >
                      {loadingActions[`reconnect-discord-${account.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSwitch('discord', account.id)}
                      disabled={loadingActions[`switch-discord-${account.id}`]}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Set as active"
                    >
                      {loadingActions[`switch-discord-${account.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove('discord', account.id)}
                      disabled={loadingActions[`remove-discord-${account.id}`]}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove account"
                    >
                      {loadingActions[`remove-discord-${account.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

export default AccountsPage