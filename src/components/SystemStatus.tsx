import React, { useState, useEffect } from 'react'
import { Zap, AlertTriangle } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'

interface SystemHealth {
  fastapi_backend: 'healthy' | 'warning' | 'error'
  redis_queue: 'healthy' | 'warning' | 'error' 
  celery_workers: 'healthy' | 'warning' | 'error'
}

const SystemStatus: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    fastapi_backend: 'warning',
    redis_queue: 'healthy',
    celery_workers: 'healthy'
  })
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('Backend responded but may have issues')

  const testBackendConnection = async () => {
    setIsTestingConnection(true)
    try {
      const response = await axiosInstance.get('/health')
      if (response.status === 200) {
        setSystemHealth(prev => ({
          ...prev,
          fastapi_backend: 'healthy'
        }))
        setConnectionMessage('Backend connection successful')
      }
    } catch (error) {
      setSystemHealth(prev => ({
        ...prev,
        fastapi_backend: 'error'
      }))
      setConnectionMessage('Backend connection failed')
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
      case 'healthy': return 'Active'
      case 'warning': return 'Warning'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
      <div className="text-center mb-8">
        <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">AutoForwardX Dashboard</h1>
        <p className="text-gray-400 text-lg">Advanced message forwarding platform for Telegram and Discord</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white text-center mb-6">System Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* FastAPI Backend */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth.fastapi_backend)} mr-2`} />
              <span className="text-white font-medium">FastAPI Backend</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth.fastapi_backend === 'healthy' 
                ? 'bg-green-900/50 text-green-400'
                : systemHealth.fastapi_backend === 'warning'
                ? 'bg-yellow-900/50 text-yellow-400' 
                : 'bg-red-900/50 text-red-400'
            }`}>
              {getStatusText(systemHealth.fastapi_backend)}
            </span>
          </div>

          {/* Redis Queue */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth.redis_queue)} mr-2`} />
              <span className="text-white font-medium">Redis Queue</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth.redis_queue === 'healthy' 
                ? 'bg-green-900/50 text-green-400'
                : systemHealth.redis_queue === 'warning'
                ? 'bg-yellow-900/50 text-yellow-400' 
                : 'bg-red-900/50 text-red-400'
            }`}>
              {getStatusText(systemHealth.redis_queue)}
            </span>
          </div>

          {/* Celery Workers */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth.celery_workers)} mr-2`} />
              <span className="text-white font-medium">Celery Workers</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth.celery_workers === 'healthy' 
                ? 'bg-green-900/50 text-green-400'
                : systemHealth.celery_workers === 'warning'
                ? 'bg-yellow-900/50 text-yellow-400' 
                : 'bg-red-900/50 text-red-400'
            }`}>
              {getStatusText(systemHealth.celery_workers)}
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={testBackendConnection}
            disabled={isTestingConnection}
            className="bg-indigo-600 text-white rounded-xl px-6 py-3 hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {isTestingConnection ? 'Testing...' : 'Test Backend Connection'}
          </button>
        </div>

        {connectionMessage && (
          <div className="flex items-center justify-center text-yellow-400">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">{connectionMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dashboard Features */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Dashboard Features</h3>
          <div className="space-y-3">
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
              Phone/OTP Authentication
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
              Real-time Message Forwarding
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
              Multi-platform Support
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
              Analytics & Monitoring
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
              Plan-based Feature Control
            </div>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Technical Stack</h3>
          <div className="space-y-3">
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
              React + TypeScript
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
              FastAPI Backend
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
              PostgreSQL Database
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
              Redis + Celery
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
              Tailwind CSS + Lucide Icons
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus