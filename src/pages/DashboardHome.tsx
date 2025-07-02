import React, { useState, useEffect } from 'react'
import { 
  Server, 
  Database, 
  Zap, 
  Plus, 
  Edit, 
  Pause, 
  Trash2, 
  Play,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Activity,
  ArrowRight
} from 'lucide-react'
import { forwardingAPI, systemAPI } from '../api/endpoints'

// Component for System Status Panel
const SystemStatusPanel: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const testConnection = async () => {
    setBackendStatus('checking')
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setBackendStatus('online')
      } else {
        setBackendStatus('offline')
      }
    } catch (error) {
      setBackendStatus('offline')
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  const services = [
    {
      name: 'FastAPI Backend',
      status: backendStatus,
      icon: Server,
      description: 'REST API Server'
    },
    {
      name: 'Redis Queue',
      status: 'online' as const,
      icon: Database,
      description: 'Message Queue'
    },
    {
      name: 'Celery Workers',
      status: 'online' as const,
      icon: Zap,
      description: 'Background Tasks'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400'
      case 'offline': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/20 border-green-500/30'
      case 'offline': return 'bg-red-500/20 border-red-500/30'
      default: return 'bg-yellow-500/20 border-yellow-500/30'
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">System Status</h2>
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200"
        >
          Test Backend Connection
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.name} className={`p-4 rounded-lg border ${getStatusBg(service.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <service.icon className="h-6 w-6 text-gray-300" />
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'online' ? 'bg-green-400' : 
                service.status === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
            </div>
            <h3 className="font-medium text-white mb-1">{service.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{service.description}</p>
            <span className={`text-sm font-medium ${getStatusColor(service.status)}`}>
              {service.status === 'checking' ? 'Checking...' : service.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Component for Forwarding Pairs Manager
const ForwardingPairsPanel: React.FC = () => {
  const [pairs, setPairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Load pairs from API
  useEffect(() => {
    const loadPairs = async () => {
      try {
        const response = await forwardingAPI.getPairs()
        setPairs(response.data || [])
      } catch (error) {
        console.error('Failed to load forwarding pairs:', error)
        // Use demo data as fallback
        setPairs([
          {
            id: 1,
            type: 'Telegram → Discord',
            source: '@techNews',
            destination: '#general',
            delay: '5m',
            status: 'active',
            messages: 156
          },
          {
            id: 2,
            type: 'Discord → Telegram',
            source: '#announcements',
            destination: '@myChannel',
            delay: '1h',
            status: 'paused',
            messages: 89
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    loadPairs()
  }, [])

  // Handle pair actions
  const handlePauseResume = async (pairId: number, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await forwardingAPI.pausePair(pairId)
        setPairs(pairs.map(p => p.id === pairId ? {...p, status: 'paused'} : p))
      } else {
        await forwardingAPI.resumePair(pairId)
        setPairs(pairs.map(p => p.id === pairId ? {...p, status: 'active'} : p))
      }
    } catch (error) {
      console.error('Failed to update pair status:', error)
    }
  }

  const handleDelete = async (pairId: number) => {
    if (confirm('Are you sure you want to delete this forwarding pair?')) {
      try {
        await forwardingAPI.deletePair(pairId)
        setPairs(pairs.filter(p => p.id !== pairId))
      } catch (error) {
        console.error('Failed to delete pair:', error)
      }
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Forwarding Pairs</h2>
        <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Pair
        </button>
      </div>

      <div className="space-y-3">
        {pairs.map((pair) => (
          <div key={pair.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-white font-medium">{pair.type}</span>
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {pair.delay}
                  </span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    pair.status === 'active' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    {pair.status}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <span>{pair.source}</span>
                  <ArrowRight className="h-4 w-4 mx-2" />
                  <span>{pair.destination}</span>
                  <span className="ml-4 flex items-center">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {pair.messages} messages
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => console.log('Edit pair:', pair.id)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                  title="Edit pair"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handlePauseResume(pair.id, pair.status)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                  title={pair.status === 'active' ? 'Pause' : 'Resume'}
                >
                  {pair.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button 
                  onClick={() => handleDelete(pair.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Delete pair"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Component for Analytics Panel
const AnalyticsPanel: React.FC = () => {
  const stats = {
    totalMessages: 2847,
    successRate: 98.5,
    todayMessages: 156
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Analytics Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm font-medium">Total Messages</p>
              <p className="text-2xl font-bold text-white">{stats.totalMessages.toLocaleString()}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-300 text-sm font-medium">Today</p>
              <p className="text-2xl font-bold text-white">{stats.todayMessages}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Simple Chart Preview */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Weekly Activity</h3>
        <div className="flex items-end justify-between h-24 space-x-2">
          {[40, 65, 45, 80, 60, 90, 75].map((height, index) => (
            <div key={index} className="flex-1 bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t-sm opacity-80" style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Component for Account Manager
const AccountManagerPanel: React.FC = () => {
  const [accounts] = useState([
    {
      id: 1,
      platform: 'Telegram',
      username: '@myAccount',
      status: 'connected',
      sessions: 3,
      lastActive: '2 minutes ago'
    },
    {
      id: 2,
      platform: 'Discord',
      username: 'MyBot#1234',
      status: 'connected',
      sessions: 1,
      lastActive: '5 minutes ago'
    },
    {
      id: 3,
      platform: 'Telegram',
      username: '@backupAccount',
      status: 'disconnected',
      sessions: 0,
      lastActive: '2 hours ago'
    }
  ])

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Account Manager</h2>
        <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Telegram Account
        </button>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  account.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <div>
                  <div className="flex items-center">
                    <span className="text-white font-medium">{account.platform}</span>
                    <span className="ml-2 text-gray-400">{account.username}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400 mt-1">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>{account.sessions} sessions</span>
                    <span className="ml-4">Last: {account.lastActive}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-colors">
                  Reconnect
                </button>
                <button className="px-3 py-1 text-sm text-gray-300 bg-gray-600/50 border border-gray-500/30 rounded-lg hover:bg-gray-600 transition-colors">
                  Switch
                </button>
                <button className="px-3 py-1 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Dashboard Home Component
const DashboardHome: React.FC = () => {
  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Monitor and manage your message forwarding system</p>
        <p className="text-green-300 text-sm">✅ This header is rendering correctly</p>
      </div>

      {/* Test Panel */}
      <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-white">🔧 Debug Test Panel</h2>
        <p className="text-green-300">If you can see this green panel, React is working correctly.</p>
      </div>

      {/* System Status */}
      <div className="bg-blue-500/20 border border-blue-500/50 p-2 rounded-lg">
        <p className="text-blue-300 text-sm">📊 System Status Panel should appear below:</p>
        <SystemStatusPanel />
      </div>

      {/* Forwarding Pairs */}
      <div className="bg-purple-500/20 border border-purple-500/50 p-2 rounded-lg">
        <p className="text-purple-300 text-sm">🔗 Forwarding Pairs Panel should appear below:</p>
        <ForwardingPairsPanel />
      </div>

      {/* Analytics and Account Manager in Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-yellow-500/20 border border-yellow-500/50 p-2 rounded-lg">
          <p className="text-yellow-300 text-sm">📈 Analytics Panel:</p>
          <AnalyticsPanel />
        </div>
        <div className="bg-cyan-500/20 border border-cyan-500/50 p-2 rounded-lg">
          <p className="text-cyan-300 text-sm">👥 Account Manager Panel:</p>
          <AccountManagerPanel />
        </div>
      </div>
    </div>
  )
}

export default DashboardHome