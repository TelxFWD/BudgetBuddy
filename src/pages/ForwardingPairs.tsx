import React, { useState, useEffect } from 'react'
import { Plus, Search, Play, Pause, Trash2, ArrowRight, MessageCircle, Crown, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { forwardingAPI } from '../api/endpoints'
import AddPairModalSimple from '../components/AddPairModalSimple'
import UpgradeModal from '../components/UpgradeModal'
import { MessageFormatModal } from '../components/MessageFormatModal'
import axiosInstance from '../api/axiosInstance'

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
  custom_header?: string
  custom_footer?: string
  remove_header?: boolean
  remove_footer?: boolean
}

const ForwardingPairs: React.FC = () => {
  const { user } = useAuth()
  const [pairs, setPairs] = useState<ForwardingPair[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPairs, setSelectedPairs] = useState<number[]>([])
  const [planInfo, setPlanInfo] = useState<any>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const [showMessageFormatModal, setShowMessageFormatModal] = useState(false)
  const [selectedPairForFormatting, setSelectedPairForFormatting] = useState<ForwardingPair | null>(null)

  useEffect(() => {
    loadPairs()
    loadPlanInfo()
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

  const loadPlanInfo = async () => {
    try {
      const response = await axiosInstance.get('/plan/limits')
      setPlanInfo(response.data)
    } catch (error) {
      console.error('Failed to load plan info:', error)
    }
  }

  const checkCanAddPair = () => {
    if (!planInfo) return false
    
    const currentPairs = pairs.length
    const maxPairs = planInfo.limits.forwarding_pairs
    
    if (typeof maxPairs === 'number' && currentPairs >= maxPairs) {
      setUpgradeMessage(`You've reached your ${planInfo.plan} plan limit of ${maxPairs} forwarding pairs. ${planInfo.upgrade_message}`)
      setShowUpgradeModal(true)
      return false
    }
    
    return true
  }

  const handleAddPair = () => {
    if (checkCanAddPair()) {
      setShowAddModal(true)
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
          await forwardingAPI.deletePair(pairId)
          break
      }
      loadPairs()
    } catch (error) {
      console.error(`Failed to ${action} pair:`, error)
    }
  }

  const handleOpenMessageFormat = (pair: ForwardingPair) => {
    setSelectedPairForFormatting(pair)
    setShowMessageFormatModal(true)
  }

  const handleMessageFormatClose = () => {
    setShowMessageFormatModal(false)
    setSelectedPairForFormatting(null)
  }

  const filteredPairs = pairs.filter(pair =>
    pair.source_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.target_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'telegram':
        return '📱'
      case 'discord':
        return '💬'
      default:
        return '📨'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400'
      case 'paused':
        return 'text-yellow-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const isPlanRestricted = (feature: string) => {
    if (!planInfo) return false
    return !planInfo.features[feature]
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Forwarding Pairs</h1>
          <div className="flex items-center space-x-3">
            {planInfo && (
              <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-lg">
                <Crown className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-300">
                  {planInfo.plan} Plan: {planInfo.usage.forwarding_pairs}
                  {typeof planInfo.limits.forwarding_pairs === 'number' 
                    ? `/${planInfo.limits.forwarding_pairs}` 
                    : ''} pairs
                </span>
              </div>
            )}
            <button
              onClick={handleAddPair}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pair
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search forwarding pairs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPairs.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No forwarding pairs</h3>
              <p className="text-gray-500 mb-4">Create your first forwarding pair to get started</p>
              <button
                onClick={handleAddPair}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
              >
                Add Your First Pair
              </button>
            </div>
          ) : (
            filteredPairs.map((pair) => (
              <div key={pair.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white">{pair.name || `Pair ${pair.id}`}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getPlatformIcon(pair.source_platform)}</span>
                      <div>
                        <p className="text-sm text-gray-400">{pair.source_platform}</p>
                        <p className="text-white font-medium">{pair.source_id}</p>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getPlatformIcon(pair.target_platform)}</span>
                      <div>
                        <p className="text-sm text-gray-400">{pair.target_platform}</p>
                        <p className="text-white font-medium">{pair.target_id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getStatusColor(pair.status)}`}>
                        {pair.status.charAt(0).toUpperCase() + pair.status.slice(1)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {pair.messages_forwarded} messages
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenMessageFormat(pair)}
                        className="p-2 text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Message Formatting"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      
                      {pair.status === 'active' ? (
                        <button
                          onClick={() => handlePairAction(pair.id, 'pause')}
                          className="p-2 text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePairAction(pair.id, 'resume')}
                          className="p-2 text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Resume"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handlePairAction(pair.id, 'delete')}
                        className="p-2 text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {pair.copy_mode && isPlanRestricted('copy_mode') && (
                  <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      Copy mode requires Elite plan
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <AddPairModalSimple
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadPairs}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Plan Limit Reached"
        message={upgradeMessage}
        currentPlan={planInfo?.plan || 'Free'}
      />

      <MessageFormatModal
        isOpen={showMessageFormatModal}
        onClose={handleMessageFormatClose}
        pairId={selectedPairForFormatting?.id || 0}
        currentData={selectedPairForFormatting ? {
          custom_header: selectedPairForFormatting.custom_header,
          custom_footer: selectedPairForFormatting.custom_footer,
          remove_header: selectedPairForFormatting.remove_header || false,
          remove_footer: selectedPairForFormatting.remove_footer || false
        } : undefined}
        onUpdate={loadPairs}
      />
    </div>
  )
}

export default ForwardingPairs