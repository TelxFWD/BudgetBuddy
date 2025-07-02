import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { accountsAPI } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

const AccountsPage: React.FC = () => {
  const { user } = useAuth()
  const [telegramAccounts, setTelegramAccounts] = useState<any[]>([])
  const [discordAccounts, setDiscordAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    
    loadAccounts()
  }, [])

  const handleReconnect = async (platform: string, accountId: number) => {
    try {
      await accountsAPI.reconnectAccount(platform, accountId)
      // Reload accounts
      window.location.reload()
    } catch (error) {
      console.error('Failed to reconnect account:', error)
    }
  }

  const handleRemove = async (platform: string, accountId: number) => {
    if (confirm('Are you sure you want to remove this account?')) {
      try {
        await accountsAPI.removeAccount(platform, accountId)
        if (platform === 'telegram') {
          setTelegramAccounts(telegramAccounts.filter(acc => acc.id !== accountId))
        } else {
          setDiscordAccounts(discordAccounts.filter(acc => acc.id !== accountId))
        }
      } catch (error) {
        console.error('Failed to remove account:', error)
      }
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Account Manager</h1>
        <p className="text-gray-400">Connect and manage your Telegram and Discord accounts</p>
      </div>

      {/* Plan Restrictions Notice */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-4">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-indigo-400 mr-3" />
          <div>
            <p className="text-white font-medium">Current Plan: {user?.plan || 'Free'}</p>
            <p className="text-gray-400 text-sm">
              {user?.plan === 'free' 
                ? 'Free plan: Limited to 1 Telegram account. Upgrade for Discord support and unlimited accounts.'
                : user?.plan === 'pro'
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
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center"
            disabled={user?.plan === 'free' && telegramAccounts.length >= 1}
          >
            <Plus className="h-4 w-4 mr-2" />
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
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Reconnect"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove('telegram', account.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Remove account"
                    >
                      <Trash2 className="h-4 w-4" />
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
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center ${
              user?.plan === 'free' 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600'
            }`}
            disabled={user?.plan === 'free'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Discord Bot
          </button>
        </div>

        {user?.plan === 'free' ? (
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
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Reconnect"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove('discord', account.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Remove account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountsPage