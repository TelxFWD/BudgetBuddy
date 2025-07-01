import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Smartphone, 
  Bot,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreHorizontal,
  Trash2,
  RefreshCw
} from 'lucide-react'
import axiosInstance from '../api/axiosInstance'
import { API_ENDPOINTS } from '../api/endpoints'
import { TelegramAccount, DiscordAccount } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const AccountsPage: React.FC = () => {
  const [telegramAccounts, setTelegramAccounts] = useState<TelegramAccount[]>([])
  const [discordAccounts, setDiscordAccounts] = useState<DiscordAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get(API_ENDPOINTS.AUTH.LINKED_ACCOUNTS)
      setTelegramAccounts(response.data.telegram_accounts || [])
      setDiscordAccounts(response.data.discord_accounts || [])
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (isActive: boolean, lastSeen?: string) => {
    if (!isActive) {
      return <XCircle className="h-5 w-5 text-red-400" />
    }
    
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
      
      if (diffMinutes < 5) {
        return <CheckCircle className="h-5 w-5 text-green-400" />
      } else if (diffMinutes < 30) {
        return <AlertCircle className="h-5 w-5 text-yellow-400" />
      }
    }
    
    return <XCircle className="h-5 w-5 text-red-400" />
  }

  const getStatusText = (isActive: boolean, lastSeen?: string) => {
    if (!isActive) return 'Inactive'
    
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
      
      if (diffMinutes < 5) return 'Online'
      if (diffMinutes < 30) return 'Recently Active'
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    }
    
    return 'Offline'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Connected Accounts</h1>
        <p className="text-gray-400 mt-1">Manage your Telegram and Discord accounts for message forwarding</p>
      </div>

      {/* Telegram Accounts */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Telegram Accounts</h3>
              <p className="text-gray-400 text-sm">Connect your Telegram accounts for message forwarding</p>
            </div>
          </div>
          <button className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Telegram
          </button>
        </div>

        {telegramAccounts.length > 0 ? (
          <div className="space-y-3">
            {telegramAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(account.is_active, account.last_seen)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">
                        {account.first_name} {account.last_name}
                      </p>
                      {account.username && (
                        <span className="text-gray-400">@{account.username}</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{account.phone_number}</p>
                    <p className="text-gray-500 text-xs">
                      Status: {getStatusText(account.is_active, account.last_seen)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="text-gray-400 hover:text-white"
                    title="Refresh Session"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    className="text-red-400 hover:text-red-300"
                    title="Remove Account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Smartphone className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No Telegram accounts connected</p>
            <button className="btn-primary">Connect Your First Account</button>
          </div>
        )}
      </div>

      {/* Discord Accounts */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Discord Bots</h3>
              <p className="text-gray-400 text-sm">Connect Discord bots for cross-platform forwarding</p>
            </div>
          </div>
          <button className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Discord Bot
          </button>
        </div>

        {discordAccounts.length > 0 ? (
          <div className="space-y-3">
            {discordAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(account.is_active, account.last_seen)}
                  <div>
                    <p className="text-white font-medium">
                      {account.bot_username || 'Discord Bot'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {account.guilds_count} servers • Token ends with ...{account.bot_token.slice(-4)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Status: {getStatusText(account.is_active, account.last_seen)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="text-gray-400 hover:text-white"
                    title="Refresh Connection"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    className="text-red-400 hover:text-red-300"
                    title="Remove Bot"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No Discord bots connected</p>
            <button className="btn-primary">Add Your First Bot</button>
          </div>
        )}
      </div>

      {/* Account Limits */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Account Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Telegram Accounts</span>
              <span className="text-white font-medium">{telegramAccounts.length}/5</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(telegramAccounts.length / 5) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Discord Bots</span>
              <span className="text-white font-medium">{discordAccounts.length}/3</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full" 
                style={{ width: `${(discordAccounts.length / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-4">
          Upgrade to Pro plan for unlimited accounts and advanced features
        </p>
      </div>
    </div>
  )
}

export default AccountsPage