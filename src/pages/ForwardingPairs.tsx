import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Edit,
  CheckSquare,
  Square
} from 'lucide-react'
import axiosInstance from '../api/axiosInstance'
import { API_ENDPOINTS } from '../api/endpoints'
import { ForwardingPair } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const ForwardingPairs: React.FC = () => {
  const [pairs, setPairs] = useState<ForwardingPair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all')
  const [selectedPairs, setSelectedPairs] = useState<number[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    loadForwardingPairs()
  }, [])

  useEffect(() => {
    setShowBulkActions(selectedPairs.length > 0)
  }, [selectedPairs])

  const loadForwardingPairs = async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get(API_ENDPOINTS.PAIRS.LIST)
      setPairs(response.data.items || [])
    } catch (error) {
      console.error('Failed to load forwarding pairs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = pair.source_chat_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pair.destination_chat_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && pair.is_active) ||
                         (filterStatus === 'paused' && !pair.is_active)
    return matchesSearch && matchesFilter
  })

  const togglePairSelection = (pairId: number) => {
    setSelectedPairs(prev => 
      prev.includes(pairId) 
        ? prev.filter(id => id !== pairId)
        : [...prev, pairId]
    )
  }

  const toggleAllPairs = () => {
    setSelectedPairs(
      selectedPairs.length === filteredPairs.length 
        ? [] 
        : filteredPairs.map(pair => pair.id)
    )
  }

  const handleBulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    try {
      await axiosInstance.post(API_ENDPOINTS.PAIRS.BULK_ACTION, {
        pair_ids: selectedPairs,
        action
      })
      await loadForwardingPairs()
      setSelectedPairs([])
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  const togglePairStatus = async (pairId: number) => {
    try {
      await axiosInstance.post(API_ENDPOINTS.PAIRS.TOGGLE(pairId))
      await loadForwardingPairs()
    } catch (error) {
      console.error('Failed to toggle pair status:', error)
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Forwarding Pairs</h1>
          <p className="text-gray-400 mt-1">Manage your message forwarding configurations</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add New Pair
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-64"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {showBulkActions && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                {selectedPairs.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('resume')}
                className="btn-secondary text-sm"
              >
                Resume All
              </button>
              <button
                onClick={() => handleBulkAction('pause')}
                className="btn-secondary text-sm"
              >
                Pause All
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="btn-danger text-sm"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pairs Table */}
      <div className="card overflow-hidden">
        {filteredPairs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={toggleAllPairs}
                      className="text-gray-400 hover:text-white"
                    >
                      {selectedPairs.length === filteredPairs.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Source</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Destination</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Messages</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Delay</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPairs.map((pair) => (
                  <tr key={pair.id} className="border-b border-dark-border hover:bg-dark-bg">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => togglePairSelection(pair.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        {selectedPairs.includes(pair.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">
                          {pair.source_chat_name || 'Unknown Chat'}
                        </p>
                        <p className="text-gray-400 text-sm capitalize">
                          {pair.source_type}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">
                          {pair.destination_chat_name || 'Unknown Chat'}
                        </p>
                        <p className="text-gray-400 text-sm capitalize">
                          {pair.destination_type}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`status-badge ${pair.is_active ? 'status-active' : 'status-paused'}`}>
                        {pair.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white">{pair.messages_forwarded}</p>
                      <p className="text-gray-400 text-sm">
                        {pair.last_forwarded ? new Date(pair.last_forwarded).toLocaleDateString() : 'Never'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white">{pair.delay_seconds}s</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => togglePairStatus(pair.id)}
                          className={pair.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}
                          title={pair.is_active ? 'Pause' : 'Resume'}
                        >
                          {pair.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          className="text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-dark-bg w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No forwarding pairs found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first forwarding pair'
              }
            </p>
            <button className="btn-primary">
              Create Forwarding Pair
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForwardingPairs