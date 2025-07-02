import React, { useState } from 'react'
import { X, MessageSquare, Hash, Clock, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { forwardingAPI } from '../api/endpoints'

interface AddPairModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  sourcePlatform: 'telegram' | 'discord'
  targetPlatform: 'telegram' | 'discord'
  sourceId: string
  targetIds: string[]  // Support multiple destinations
  delayMinutes: number
  copyMode: boolean
  blockImages: boolean
  blockText: boolean
  textFilters: {
    searchText: string
    replaceWith: string
  }[]
}

const AddPairModal: React.FC<AddPairModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    sourcePlatform: 'telegram',
    targetPlatform: 'telegram',
    sourceId: '',
    targetIds: [''],
    delayMinutes: 5,
    copyMode: false,
    blockImages: false,
    blockText: false,
    textFilters: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const planLimits = {
    Free: { maxPairs: 1, crossPlatform: false },
    Pro: { maxPairs: 10, crossPlatform: true },
    Elite: { maxPairs: 50, crossPlatform: true }
  }

  const currentPlanLimits = planLimits[user?.plan || 'Free']

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateForm = () => {
    // Check cross-platform restriction for Free plan
    if (user?.plan === 'Free' && formData.sourcePlatform !== formData.targetPlatform) {
      setError('Cross-platform forwarding requires Pro or Elite plan')
      return false
    }

    // Validate source and target IDs
    if (!formData.sourceId.trim() || !formData.targetId.trim()) {
      setError('Please fill in both source and target IDs')
      return false
    }

    // Validate Telegram format (should start with @)
    if (formData.sourcePlatform === 'telegram' && !formData.sourceId.startsWith('@')) {
      setError('Telegram channels/groups should start with @')
      return false
    }

    if (formData.targetPlatform === 'telegram' && !formData.targetId.startsWith('@')) {
      setError('Telegram channels/groups should start with @')
      return false
    }

    // Validate Discord format (should be numeric for channel IDs)
    if (formData.sourcePlatform === 'discord' && !/^\d+$/.test(formData.sourceId)) {
      setError('Discord channel ID should be numeric')
      return false
    }

    if (formData.targetPlatform === 'discord' && !/^\d+$/.test(formData.targetId)) {
      setError('Discord channel ID should be numeric')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      const delayInMinutes = formData.delayUnit === 'hours' 
        ? formData.delay * 60 
        : formData.delay

      await forwardingAPI.createPair({
        source_platform: formData.sourcePlatform,
        target_platform: formData.targetPlatform,
        source_id: formData.sourceId.trim(),
        target_id: formData.targetId.trim(),
        delay_minutes: delayInMinutes
      })

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        sourcePlatform: 'telegram',
        targetPlatform: 'telegram',
        sourceId: '',
        targetId: '',
        delay: 5,
        delayUnit: 'minutes'
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create forwarding pair')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto modal-backdrop">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>

        <div className="inline-block align-bottom bg-gray-800 rounded-xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              Add Forwarding Pair
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Plan restriction warning */}
          {user?.plan === 'Free' && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                Free plan: Limited to Telegram → Telegram forwarding only. 
                <span className="font-medium"> Upgrade to Pro</span> for cross-platform support.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Platform Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Platform
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('sourcePlatform', 'telegram')}
                    className={`w-full p-3 rounded-xl border-2 transition-all ${
                      formData.sourcePlatform === 'telegram'
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
                      <span className="text-white font-medium">Telegram</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('sourcePlatform', 'discord')}
                    disabled={user?.plan === 'Free'}
                    className={`w-full p-3 rounded-xl border-2 transition-all ${
                      formData.sourcePlatform === 'discord'
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    } ${user?.plan === 'Free' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center">
                      <Hash className="h-5 w-5 mr-2 text-purple-400" />
                      <span className="text-white font-medium">Discord</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Platform
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('targetPlatform', 'telegram')}
                    className={`w-full p-3 rounded-xl border-2 transition-all ${
                      formData.targetPlatform === 'telegram'
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
                      <span className="text-white font-medium">Telegram</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('targetPlatform', 'discord')}
                    disabled={user?.plan === 'Free'}
                    className={`w-full p-3 rounded-xl border-2 transition-all ${
                      formData.targetPlatform === 'discord'
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    } ${user?.plan === 'Free' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center">
                      <Hash className="h-5 w-5 mr-2 text-purple-400" />
                      <span className="text-white font-medium">Discord</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Source ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source {formData.sourcePlatform === 'telegram' ? 'Channel/Group' : 'Channel ID'}
              </label>
              <input
                type="text"
                value={formData.sourceId}
                onChange={(e) => handleInputChange('sourceId', e.target.value)}
                placeholder={formData.sourcePlatform === 'telegram' ? '@channelname' : '123456789'}
                className="w-full px-3 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Target ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target {formData.targetPlatform === 'telegram' ? 'Channel/Group' : 'Channel ID'}
              </label>
              <input
                type="text"
                value={formData.targetId}
                onChange={(e) => handleInputChange('targetId', e.target.value)}
                placeholder={formData.targetPlatform === 'telegram' ? '@targetchannel' : '987654321'}
                className="w-full px-3 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Delay Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Forwarding Delay
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  max={formData.delayUnit === 'hours' ? 24 : 1440}
                  value={formData.delay}
                  onChange={(e) => handleInputChange('delay', parseInt(e.target.value))}
                  className="flex-1 px-3 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <select
                  value={formData.delayUnit}
                  onChange={(e) => handleInputChange('delayUnit', e.target.value)}
                  className="px-3 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {formData.delay === 0 && <><Zap className="inline h-3 w-3 mr-1" />Real-time forwarding</>}
                {formData.delay > 0 && `Messages will be forwarded after ${formData.delay} ${formData.delayUnit}`}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-600 rounded-xl text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Create Pair'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddPairModal