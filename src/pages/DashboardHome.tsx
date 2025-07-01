import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  ArrowRightLeft, 
  Activity, 
  Users, 
  Zap,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import axiosInstance from '../api/axiosInstance'
import { API_ENDPOINTS } from '../api/endpoints'
import { UserStats, SystemStats, ForwardingPair } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const DashboardHome: React.FC = () => {
  const { user } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [recentPairs, setRecentPairs] = useState<ForwardingPair[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [userStatsRes, systemStatsRes, pairsRes] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.ANALYTICS.USER_STATS),
        axiosInstance.get(API_ENDPOINTS.ANALYTICS.SYSTEM_STATS),
        axiosInstance.get(`${API_ENDPOINTS.PAIRS.LIST}?limit=5`)
      ])

      setUserStats(userStatsRes.data)
      setSystemStats(systemStatsRes.data)
      setRecentPairs(pairsRes.data.items || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const pieData = userStats ? [
    { name: 'Success', value: userStats.total_messages_forwarded * (userStats.success_rate / 100), color: '#10b981' },
    { name: 'Failed', value: userStats.total_messages_forwarded * (1 - userStats.success_rate / 100), color: '#ef4444' }
  ] : []

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {user?.username}!</h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your message forwarding</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Forwarding Pair
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Pairs"
          value={userStats?.active_pairs || 0}
          icon={ArrowRightLeft}
          color="indigo"
          trend="+2 this week"
        />
        <StatsCard
          title="Messages Today"
          value={userStats?.messages_today || 0}
          icon={Zap}
          color="green"
          trend={`${userStats?.success_rate || 0}% success rate`}
        />
        <StatsCard
          title="Total Forwarded"
          value={userStats?.total_messages_forwarded || 0}
          icon={Activity}
          color="blue"
          trend="All time"
        />
        <StatsCard
          title="Avg Delay"
          value={`${userStats?.avg_delay || 0}s`}
          icon={Clock}
          color="purple"
          trend="Response time"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Success Rate</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
          <div className="space-y-3">
            <HealthItem 
              label="Database" 
              status="healthy" 
              description="All connections active"
            />
            <HealthItem 
              label="Redis Queue" 
              status="healthy" 
              description={`${systemStats?.queue_health?.high_priority || 0} high priority tasks`}
            />
            <HealthItem 
              label="Celery Workers" 
              status="healthy" 
              description="8 workers active"
            />
            <HealthItem 
              label="API Response" 
              status="healthy" 
              description="< 100ms avg"
            />
          </div>
        </div>
      </div>

      {/* Recent Forwarding Pairs */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Forwarding Pairs</h3>
          <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
            View All →
          </button>
        </div>
        
        {recentPairs.length > 0 ? (
          <div className="space-y-3">
            {recentPairs.map((pair) => (
              <div key={pair.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${pair.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <div>
                    <p className="text-white font-medium">
                      {pair.source_chat_name || `${pair.source_type} Chat`} → {pair.destination_chat_name || `${pair.destination_type} Chat`}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {pair.messages_forwarded} messages • {pair.delay_seconds}s delay
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`status-badge ${pair.is_active ? 'status-active' : 'status-paused'}`}>
                    {pair.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ArrowRightLeft className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No forwarding pairs yet</p>
            <button className="btn-primary mt-3">Create Your First Pair</button>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: 'indigo' | 'green' | 'blue' | 'purple'
  trend?: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    indigo: 'bg-indigo-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p className="text-gray-500 text-xs mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

interface HealthItemProps {
  label: string
  status: 'healthy' | 'warning' | 'error'
  description: string
}

const HealthItem: React.FC<HealthItemProps> = ({ label, status, description }) => {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-400' },
    warning: { icon: AlertCircle, color: 'text-yellow-400' },
    error: { icon: AlertCircle, color: 'text-red-400' }
  }

  const { icon: StatusIcon, color } = statusConfig[status]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <StatusIcon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome