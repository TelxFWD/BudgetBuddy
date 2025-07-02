import React, { useState, useEffect } from 'react'
import { Plus, Search, Play, Pause, Edit, Trash2, ArrowRight, MessageCircle, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { forwardingAPI } from '../api/endpoints'
import AddPairModalSimple from '../components/AddPairModalSimple'

interface ForwardingPair {
  id: number
  source_platform: string
  target_platform: string
  source_id: string
  target_id: string
  status: 'active' | 'paused' | 'error'
  delay_minutes: number
  messages_forwarded: number
  created_at: string
  last_forwarded: string | null
  copy_mode?: boolean
}

const ForwardingPairs: React.FC = () => {
  const { user } = useAuth()
  const [pairs, setPairs] = useState<ForwardingPair[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPairs, setSelectedPairs] = useState<number[]>([])

  useEffect(() => {
    loadPairs()
  }, [])

  const loadPairs = async () => {
    try {
      setLoading(true)
      const response = await forwardingAPI.getPairs()
      setPairs(response.data)
    } catch (error) {
      console.error('Failed to load pairs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePairAction = async (pairId: number, action: 'pause' | 'resume' | 'delete') => {
    try {
      switch (action) {
        case 'pause':
          await forwardingAPI.pausePair(pairId)
          break
        case 'resume':
          await forwardingAPI.resumePair(pairId)
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this pair?')) {
            await forwardingAPI.deletePair(pairId)
          } else {
            return
          }
          break
      }
      loadPairs() // Refresh the list
    } catch (error) {
      console.error(`Failed to ${action} pair:`, error)
    }
  }

  const handleBulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    if (selectedPairs.length === 0) return

    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedPairs.length} pairs?`)) {
      return
    }

    try {
      await forwardingAPI.bulkAction(action, selectedPairs)
      setSelectedPairs([])
      loadPairs()
    } catch (error) {
      console.error(`Failed to ${action} pairs:`, error)
    }
  }

  const togglePairSelection = (pairId: number) => {
    setSelectedPairs(prev => 
      prev.includes(pairId) 
        ? prev.filter(id => id !== pairId)
        : [...prev, pairId]
    )
  }

  const toggleCopyMode = async (pairId: number) => {
    const pair = pairs.find(p => p.id === pairId)
    if (!pair) return

    try {
      const newCopyMode = !pair.copy_mode
      await forwardingAPI.updatePairSettings(pairId, { copy_mode: newCopyMode })
      
      // Update local state
      setPairs(prevPairs => 
        prevPairs.map(p => 
          p.id === pairId 
            ? { ...p, copy_mode: newCopyMode }
            : p
        )
      )
    } catch (error) {
      console.error('Failed to toggle copy mode:', error)
    }
  }

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return 'Real-time'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours}h`
    return `${hours}h ${remainingMinutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'error': return 'bg-red-500/20 text-red-300 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getPlatformIcon = (platform: string) => {
    return platform === 'telegram' ? '📱' : '💬'
  }

  const filteredPairs = pairs.filter(pair =>
    pair.source_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.target_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const planLimits = {
    Free: 1,
    Pro: 10,
    Elite: 50
  }

  // Fix potential case sensitivity issue
  const userPlan = user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1).toLowerCase() : 'Free'
  const currentLimit = planLimits[userPlan as keyof typeof planLimits] || planLimits.Free
  const canAddMore = pairs.length < currentLimit

  // Debug: Let's log the values to see what's happening
  console.log('Debug - Raw user plan:', user?.plan, 'Normalized plan:', userPlan, 'Current limit:', currentLimit, 'Pairs count:', pairs.length, 'Can add more:', canAddMore)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="h-16 bg-gray-700 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
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
          <h1 className="text-3xl font-bold text-white">Forwarding Pairs</h1>
          <p className="text-gray-400">
            Manage your message forwarding configurations ({pairs.length}/{currentLimit} used)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!canAddMore}
          className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            canAddMore
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pair
          {!canAddMore && ' (Limit Reached)'}
        </button>
      </div>

      {/* Search and Bulk Actions */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search pairs by source or target..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        {selectedPairs.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {selectedPairs.length} selected
            </span>
            <button
              onClick={() => handleBulkAction('pause')}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Pause All
            </button>
            <button
              onClick={() => handleBulkAction('resume')}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Resume All
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Delete All
            </button>
          </div>
        )}
      </div>

      {/* Pairs List */}
      {filteredPairs.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="mx-auto h-12 w-12 bg-gray-700 rounded-xl flex items-center justify-center mb-4">
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No forwarding pairs</h3>
          <p className="text-gray-400 mb-6">
            {pairs.length === 0 
              ? "Get started by creating your first forwarding pair"
              : "No pairs match your search criteria"
            }
          </p>
          {pairs.length === 0 && canAddMore && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-xl text-sm font-medium transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Pair
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPairs.map((pair) => (
            <div
              key={pair.id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedPairs.includes(pair.id)}
                    onChange={() => togglePairSelection(pair.id)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg font-medium text-white">
                        {getPlatformIcon(pair.source_platform)} {pair.source_id}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-medium text-white">
                        {getPlatformIcon(pair.target_platform)} {pair.target_id}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(pair.status)}`}>
                        {pair.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Delay: {formatDelay(pair.delay_minutes)}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {pair.messages_forwarded} messages
                      </span>
                      <span>
                        Created: {new Date(pair.created_at).toLocaleDateString()}
                      </span>
                      {pair.last_forwarded && (
                        <span>
                          Last: {new Date(pair.last_forwarded).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Copy Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Copy Mode</label>
                    <button
                      onClick={() => toggleCopyMode(pair.id)}
                      className="p-1 transition-colors"
                      title={pair.copy_mode ? 'Disable Copy Mode' : 'Enable Copy Mode'}
                    >
                      {pair.copy_mode ? (
                        <ToggleRight className="h-5 w-5 text-indigo-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePairAction(pair.id, pair.status === 'active' ? 'pause' : 'resume')}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title={pair.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {pair.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePairAction(pair.id, 'delete')}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pair Modal */}
      <AddPairModalSimple
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadPairs}
      />
    </div>
  )
}

export default ForwardingPairs