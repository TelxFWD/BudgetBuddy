import React, { useState, useEffect } from 'react'
import { Edit3, Search, Crown, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MessageFormatModal } from '../components/MessageFormatModal'
import { forwardingAPI } from '../api/endpoints'
import LoadingSpinner from '../components/LoadingSpinner'
import UpgradeModal from '../components/UpgradeModal'

interface ForwardingPair {
  id: number
  source_platform: string
  source_chat_id: string
  destination_platform: string
  destination_chat_id: string
  is_active: boolean
  created_at: string
  custom_header?: string
  custom_footer?: string
  remove_header?: boolean
  remove_footer?: boolean
  delay_seconds?: number
}

const MessageFormattingPage: React.FC = () => {
  const { user } = useAuth()
  const [pairs, setPairs] = useState<ForwardingPair[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPair, setSelectedPair] = useState<ForwardingPair | null>(null)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    fetchPairs()
  }, [])

  const fetchPairs = async () => {
    try {
      const response = await forwardingAPI.getPairs()
      setPairs(response.data)
    } catch (error) {
      console.error('Error fetching pairs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormatPair = (pair: ForwardingPair) => {
    if (user?.plan?.toLowerCase() === 'free') {
      setShowUpgradeModal(true)
      return
    }
    setSelectedPair(pair)
    setShowFormatModal(true)
  }

  const filteredPairs = pairs.filter(pair =>
    pair.source_chat_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.destination_chat_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.source_platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.destination_platform.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPlatformName = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1)
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'telegram':
        return '📱'
      case 'discord':
        return '🎮'
      default:
        return '💬'
    }
  }

  const getFormattingStatus = (pair: ForwardingPair) => {
    const hasCustomHeader = pair.custom_header && pair.custom_header.trim() !== ''
    const hasCustomFooter = pair.custom_footer && pair.custom_footer.trim() !== ''
    const removesHeader = pair.remove_header === true
    const removesFooter = pair.remove_footer === true
    
    if (hasCustomHeader || hasCustomFooter || removesHeader || removesFooter) {
      return 'Formatted'
    }
    return 'Default'
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Edit3 className="h-7 w-7 text-indigo-400" />
            Message Formatting
          </h1>
          <p className="text-gray-400 mt-1">
            Customize how messages appear when forwarded between platforms
          </p>
        </div>
        
        {user?.plan?.toLowerCase() === 'free' && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Crown className="h-4 w-4" />
              <span className="font-medium">Pro Feature</span>
            </div>
            <p className="text-gray-300 text-sm mt-1">
              Upgrade to Pro or Elite to customize message formatting
            </p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search forwarding pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Pairs List */}
      {filteredPairs.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Forwarding Pairs Found</h3>
          <p className="text-gray-400">
            {searchTerm ? 'No pairs match your search criteria.' : 'Create your first forwarding pair to start customizing message formatting.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPairs.map((pair) => (
            <div
              key={pair.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getPlatformIcon(pair.source_platform)}</span>
                      <span className="font-medium text-white">
                        {formatPlatformName(pair.source_platform)}
                      </span>
                      <span className="text-gray-400 text-sm">{pair.source_chat_id}</span>
                    </div>
                    
                    <div className="text-gray-400 text-lg">→</div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getPlatformIcon(pair.destination_platform)}</span>
                      <span className="font-medium text-white">
                        {formatPlatformName(pair.destination_platform)}
                      </span>
                      <span className="text-gray-400 text-sm">{pair.destination_chat_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      pair.is_active 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {pair.is_active ? 'Active' : 'Paused'}
                    </span>
                    
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      getFormattingStatus(pair) === 'Formatted'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {getFormattingStatus(pair)}
                    </span>

                    {pair.delay_seconds && pair.delay_seconds > 0 && (
                      <span className="text-gray-400">
                        Delay: {pair.delay_seconds}s
                      </span>
                    )}
                  </div>

                  {/* Format Preview */}
                  {getFormattingStatus(pair) === 'Formatted' && (
                    <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-600">
                      <div className="text-xs text-gray-400 mb-2">Format Preview:</div>
                      <div className="space-y-1 text-sm">
                        {pair.custom_header && (
                          <div className="text-indigo-400">Header: {pair.custom_header}</div>
                        )}
                        {pair.remove_header && (
                          <div className="text-yellow-400">Remove original header: Yes</div>
                        )}
                        {pair.remove_footer && (
                          <div className="text-yellow-400">Remove original footer: Yes</div>
                        )}
                        {pair.custom_footer && (
                          <div className="text-indigo-400">Footer: {pair.custom_footer}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <button
                    onClick={() => handleFormatPair(pair)}
                    disabled={user?.plan?.toLowerCase() === 'free'}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      user?.plan?.toLowerCase() === 'free'
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Edit3 className="h-4 w-4 mr-2 inline" />
                    Edit Format
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Format Modal */}
      {showFormatModal && selectedPair && (
        <MessageFormatModal
          isOpen={showFormatModal}
          onClose={() => {
            setShowFormatModal(false)
            setSelectedPair(null)
          }}
          pairId={selectedPair?.id || 0}
          currentData={selectedPair ? {
            custom_header: selectedPair.custom_header || '',
            custom_footer: selectedPair.custom_footer || '',
            remove_header: selectedPair.remove_header || false,
            remove_footer: selectedPair.remove_footer || false
          } : undefined}
          onUpdate={() => {
            fetchPairs()
            setShowFormatModal(false)
            setSelectedPair(null)
          }}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Message Formatting"
          message="Customize how your forwarded messages appear with custom headers, footers, and formatting controls."
          currentPlan={user?.plan || 'Free'}
        />
      )}
    </div>
  )
}

export default MessageFormattingPage