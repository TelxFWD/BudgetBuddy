import React, { useState } from 'react'
import { X, Plus, ArrowRight, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import axiosInstance from '../api/axiosInstance'
import { API_ENDPOINTS } from '../api/endpoints'
import LoadingSpinner from './LoadingSpinner'

interface AddPairModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type PlatformType = 'telegram' | 'discord'
type PairMode = 'telegram-telegram' | 'telegram-discord' | 'discord-telegram'

const AddPairModal: React.FC<AddPairModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [pairMode, setPairMode] = useState<PairMode>('telegram-telegram')
  const [sourceId, setSourceId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [delay, setDelay] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'select' | 'configure'>('select')

  if (!isOpen) return null

  const resetForm = () => {
    setPairMode('telegram-telegram')
    setSourceId('')
    setDestinationId('')
    setDelay(0)
    setError('')
    setStep('select')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleModeSelect = (mode: PairMode) => {
    setPairMode(mode)
    setStep('configure')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Check plan limits first
      if (user?.plan === 'free' && pairMode !== 'telegram-telegram') {
        setError('Upgrade to Pro or Elite plan to use cross-platform forwarding')
        setIsLoading(false)
        return
      }

      const [sourceType, destinationType] = pairMode.split('-') as [PlatformType, PlatformType]
      
      const pairData = {
        source_type: sourceType,
        source_id: sourceId,
        destination_type: destinationType,
        destination_id: destinationId,
        delay_seconds: delay,
        is_active: true
      }

      await axiosInstance.post(API_ENDPOINTS.PAIRS.CREATE, pairData)
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create forwarding pair')
    } finally {
      setIsLoading(false)
    }
  }

  const pairModes = [
    {
      mode: 'telegram-telegram' as PairMode,
      title: 'Telegram → Telegram',
      description: 'Forward messages between Telegram chats',
      icon: '📱',
      available: true
    },
    {
      mode: 'telegram-discord' as PairMode,
      title: 'Telegram → Discord',
      description: 'Forward from Telegram to Discord channels',
      icon: '📱➡️🎮',
      available: user?.plan !== 'free'
    },
    {
      mode: 'discord-telegram' as PairMode,
      title: 'Discord → Telegram',
      description: 'Forward from Discord to Telegram chats',
      icon: '🎮➡️📱',
      available: user?.plan !== 'free'
    }
  ]

  const getSourcePlaceholder = () => {
    const sourceType = pairMode.split('-')[0]
    return sourceType === 'telegram' ? 'Telegram chat/channel ID or @username' : 'Discord channel ID'
  }

  const getDestinationPlaceholder = () => {
    const destinationType = pairMode.split('-')[1]
    return destinationType === 'telegram' ? 'Telegram chat/channel ID or @username' : 'Discord channel ID'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-dark-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-bold text-white">Add Forwarding Pair</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {step === 'select' ? (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Choose Forwarding Type</h3>
              <div className="space-y-3">
                {pairModes.map((mode) => (
                  <button
                    key={mode.mode}
                    onClick={() => mode.available ? handleModeSelect(mode.mode) : null}
                    disabled={!mode.available}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      mode.available
                        ? 'border-dark-border hover:border-indigo-600 hover:bg-dark-bg cursor-pointer'
                        : 'border-gray-700 bg-gray-900/50 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{mode.icon}</span>
                        <div>
                          <h4 className="font-semibold text-white">{mode.title}</h4>
                          <p className="text-gray-400 text-sm">{mode.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!mode.available && (
                          <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded">
                            Pro Plan
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected Mode */}
              <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">
                      {pairModes.find(m => m.mode === pairMode)?.icon}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white">
                        {pairModes.find(m => m.mode === pairMode)?.title}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {pairModes.find(m => m.mode === pairMode)?.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('select')}
                    className="text-indigo-400 hover:text-indigo-300 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Source Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source {pairMode.split('-')[0] === 'telegram' ? 'Telegram' : 'Discord'}
                </label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  placeholder={getSourcePlaceholder()}
                  className="input-field w-full"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {pairMode.split('-')[0] === 'telegram' 
                    ? 'Use @username, chat invite link, or numeric ID'
                    : 'Discord channel ID (right-click channel → Copy ID)'
                  }
                </p>
              </div>

              {/* Destination Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Destination {pairMode.split('-')[1] === 'telegram' ? 'Telegram' : 'Discord'}
                </label>
                <input
                  type="text"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  placeholder={getDestinationPlaceholder()}
                  className="input-field w-full"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {pairMode.split('-')[1] === 'telegram'
                    ? 'Use @username, chat invite link, or numeric ID'
                    : 'Discord channel ID (right-click channel → Copy ID)'
                  }
                </p>
              </div>

              {/* Delay Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Forwarding Delay: {delay} seconds
                </label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer slider"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Instant</span>
                  <span>5 minutes</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Delay before forwarding messages (0 = instant)
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 flex-1 flex items-center justify-center"
                  disabled={isLoading || !sourceId || !destinationId}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Pair
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddPairModal