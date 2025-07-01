import React, { useState } from 'react'
import { Plus, ArrowRight, Activity, CheckCircle, AlertTriangle, Pause, Edit, Trash2, Zap } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'

interface ForwardingPair {
  id: string
  source: string
  destination: string
  delay: string
  status: 'active' | 'paused'
  type: 'telegram-telegram' | 'telegram-discord' | 'discord-telegram'
}

interface SystemStatus {
  fastapi_backend: 'healthy' | 'warning' | 'error'
  redis_queue: 'healthy' | 'warning' | 'error'
  celery_workers: 'healthy' | 'warning' | 'error'
}

const DashboardHome: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    fastapi_backend: 'warning',
    redis_queue: 'healthy',
    celery_workers: 'healthy'
  })
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [forwardingPairs] = useState<ForwardingPair[]>([
    { id: '1', source: '@channel1', destination: '@channel2', delay: '24h', status: 'active', type: 'telegram-telegram' },
    { id: '2', source: '@source_group', destination: 'Discord Server', delay: '5m', status: 'active', type: 'telegram-discord' },
    { id: '3', source: 'Discord #general', destination: '@telegram_chat', delay: '1h', status: 'paused', type: 'discord-telegram' }
  ])

  const testBackendConnection = async () => {
    setIsTestingConnection(true)
    try {
      const response = await axiosInstance.get('/health')
      if (response.status === 200) {
        setSystemStatus(prev => ({ ...prev, fastapi_backend: 'healthy' }))
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, fastapi_backend: 'error' }))
    } finally {
      setIsTestingConnection(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Healthy'
      case 'warning': return 'Warning'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  const getPlatformIcon = (type: string) => {
    if (type.includes('telegram')) return '📱'
    if (type.includes('discord')) return '💬'
    return '🔗'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">AutoForwardX Dashboard</h1>
        <p className="text-gray-400 text-lg">Seamlessly automate message forwarding across Telegram and Discord</p>
      </div>

      {/* System Status Panel */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-6">System Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* FastAPI Backend */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.fastapi_backend)} mr-2`} />
              <span className="text-white font-medium">FastAPI Backend</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              systemStatus.fastapi_backend === 'healthy' ? 'bg-green-900/50 text-green-400' :
              systemStatus.fastapi_backend === 'warning' ? 'bg-yellow-900/50 text-yellow-400' : 
              'bg-red-900/50 text-red-400'
            }`}>
              {getStatusText(systemStatus.fastapi_backend)}
            </span>
          </div>

          {/* Redis Queue */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.redis_queue)} mr-2`} />
              <span className="text-white font-medium">Redis Queue</span>
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-900/50 text-green-400">
              Active
            </span>
          </div>

          {/* Celery Workers */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.celery_workers)} mr-2`} />
              <span className="text-white font-medium">Celery Workers</span>
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-900/50 text-green-400">
              Running
            </span>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={testBackendConnection}
            disabled={isTestingConnection}
            className="bg-indigo-600 text-white rounded-xl px-6 py-3 hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
          >
            {isTestingConnection ? 'Testing...' : 'Test Backend Connection'}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Forwarding Pairs */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Forwarding Pairs</h3>
            <button className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 font-medium flex items-center transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Add Pair
            </button>
          </div>
          
          <div className="space-y-4">
            {forwardingPairs.map((pair) => (
              <div key={pair.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getPlatformIcon(pair.type)}</span>
                    <div>
                      <div className="flex items-center text-white font-medium">
                        <span>{pair.source}</span>
                        <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                        <span>{pair.destination}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-400">Delay: {pair.delay}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          pair.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {pair.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-yellow-400 transition-colors">
                      <Pause className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Panel */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Analytics Overview</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">345</div>
              <div className="text-sm text-gray-400">Total Messages Forwarded</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">99.9%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Activity className="h-8 w-8 mr-2" />
              <span>Graph Preview (Bar + Pie Charts)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Manager */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Telegram & Discord Sessions</h3>
          <button className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 font-medium flex items-center transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Add New Telegram Account
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Telegram Account */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📱</span>
                <span className="text-white font-medium">@username1</span>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex space-x-2">
              <button className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 transition-colors">
                Reconnect
              </button>
              <button className="flex-1 text-xs bg-gray-600 text-white rounded px-2 py-1 hover:bg-gray-700 transition-colors">
                Switch
              </button>
              <button className="flex-1 text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 transition-colors">
                Remove
              </button>
            </div>
          </div>

          {/* Discord Account */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💬</span>
                <span className="text-white font-medium">Discord Bot</span>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex space-x-2">
              <button className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 transition-colors">
                Reconnect
              </button>
              <button className="flex-1 text-xs bg-gray-600 text-white rounded px-2 py-1 hover:bg-gray-700 transition-colors">
                Switch
              </button>
              <button className="flex-1 text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 transition-colors">
                Remove
              </button>
            </div>
          </div>

          {/* Add Account Placeholder */}
          <div className="bg-gray-900/50 border border-gray-700 border-dashed rounded-lg p-4 flex items-center justify-center">
            <div className="text-center">
              <Plus className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <span className="text-gray-500 text-sm">Add Account</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
          <span className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
            Fully Responsive
          </span>
          <span className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
            Modern UI
          </span>
          <span className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
            Production Ready
          </span>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome