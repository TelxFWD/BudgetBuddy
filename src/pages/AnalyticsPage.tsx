import React, { useState, useEffect } from 'react'
import { 
  Download, 
  Calendar,
  TrendingUp,
  MessageCircle,
  AlertTriangle,
  Filter
} from 'lucide-react'
import axiosInstance from '../api/axiosInstance'
import { API_ENDPOINTS } from '../api/endpoints'
import { MessageVolumeData, UserStats } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'

const AnalyticsPage: React.FC = () => {
  const [messageVolumeData, setMessageVolumeData] = useState<MessageVolumeData[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      
      const [volumeRes, statsRes] = await Promise.all([
        axiosInstance.get(`${API_ENDPOINTS.ANALYTICS.MESSAGE_VOLUME}?days=${days}`),
        axiosInstance.get(API_ENDPOINTS.ANALYTICS.USER_STATS)
      ])

      setMessageVolumeData(volumeRes.data)
      setUserStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = (format: 'csv' | 'pdf') => {
    // Implementation for data export
    console.log(`Exporting data as ${format}`)
  }

  const successRateData = userStats ? [
    { name: 'Success', value: userStats.total_messages_forwarded * (userStats.success_rate / 100), color: '#10b981' },
    { name: 'Failed', value: userStats.total_messages_forwarded * (1 - userStats.success_rate / 100), color: '#ef4444' }
  ] : []

  const periodData = messageVolumeData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    messages: item.message_count,
    success: item.success_count,
    errors: item.error_count
  }))

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
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Detailed insights into your message forwarding performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="input-field"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={() => exportData('csv')}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => exportData('pdf')}
            className="btn-primary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Messages"
          value={userStats?.total_messages_forwarded || 0}
          change="+12%"
          trend="up"
          icon={MessageCircle}
          color="blue"
        />
        <SummaryCard
          title="Success Rate"
          value={`${userStats?.success_rate || 0}%`}
          change="+2.1%"
          trend="up"
          icon={TrendingUp}
          color="green"
        />
        <SummaryCard
          title="Today's Messages"
          value={userStats?.messages_today || 0}
          change="-5%"
          trend="down"
          icon={Calendar}
          color="purple"
        />
        <SummaryCard
          title="Avg Delay"
          value={`${userStats?.avg_delay || 0}s`}
          change="+0.2s"
          trend="up"
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume Over Time */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Message Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="messages" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Success vs Error Rate */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Success vs Error Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={successRateData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {successRateData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
              <span className="text-gray-300 text-sm">Success</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              <span className="text-gray-300 text-sm">Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Breakdown</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={periodData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af"
              fontSize={12}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9'
              }}
            />
            <Bar dataKey="success" fill="#10b981" name="Successful" />
            <Bar dataKey="errors" fill="#ef4444" name="Failed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="text-md font-semibold text-white mb-3">Peak Hours</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Morning (6-12)</span>
              <span className="text-white font-medium">24%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Afternoon (12-18)</span>
              <span className="text-white font-medium">42%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Evening (18-24)</span>
              <span className="text-white font-medium">28%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Night (0-6)</span>
              <span className="text-white font-medium">6%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="text-md font-semibold text-white mb-3">Top Platforms</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Telegram → Discord</span>
              <span className="text-white font-medium">68%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Discord → Telegram</span>
              <span className="text-white font-medium">24%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Telegram → Telegram</span>
              <span className="text-white font-medium">8%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="text-md font-semibold text-white mb-3">Error Categories</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Rate Limited</span>
              <span className="text-white font-medium">45%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Network Error</span>
              <span className="text-white font-medium">32%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Permission Denied</span>
              <span className="text-white font-medium">15%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Other</span>
              <span className="text-white font-medium">8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600'
  }

  const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400'

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <p className={`text-xs mt-1 ${trendColor}`}>{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage