import React, { useState } from 'react'
import { X, MessageSquare, Hash, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { forwardingAPI } from '../api/endpoints'

interface AddPairModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const AddPairModalSimple: React.FC<AddPairModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    sourcePlatform: 'telegram' as 'telegram' | 'discord',
    targetPlatform: 'telegram' as 'telegram' | 'discord',
    sourceId: '',
    targetId: '',
    delayMinutes: 5
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const planLimits = {
    Free: { maxPairs: 1, crossPlatform: false },
    Pro: { maxPairs: 10, crossPlatform: true },
    Elite: { maxPairs: 50, crossPlatform: true }
  }

  const userPlan = user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1).toLowerCase() : 'Free'
  const currentPlanLimits = planLimits[userPlan as keyof typeof planLimits] || planLimits.Free

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate cross-platform restriction for Free plan
    if (userPlan === 'Free' && formData.sourcePlatform !== formData.targetPlatform) {
      setError('Cross-platform forwarding requires Pro or Elite plan')
      return
    }

    // Validate required fields
    if (!formData.sourceId.trim() || !formData.targetId.trim()) {
      setError('Please fill in both source and target IDs')
      return
    }

    setLoading(true)
    setError('')

    try {
      await forwardingAPI.createPair({
        source_platform: formData.sourcePlatform,
        target_platform: formData.targetPlatform,
        source_id: formData.sourceId.trim(),
        target_id: formData.targetId.trim(),
        delay_minutes: formData.delayMinutes
      })

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        sourcePlatform: 'telegram',
        targetPlatform: 'telegram',
        sourceId: '',
        targetId: '',
        delayMinutes: 5
      })
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create pair')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Forwarding Pair</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Source Platform
            </label>
            <select
              value={formData.sourcePlatform}
              onChange={(e) => setFormData(prev => ({ ...prev, sourcePlatform: e.target.value as 'telegram' | 'discord' }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="telegram">📱 Telegram</option>
              <option value="discord">💬 Discord</option>
            </select>
          </div>

          {/* Source ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Source ID
            </label>
            <input
              type="text"
              value={formData.sourceId}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceId: e.target.value }))}
              placeholder={formData.sourcePlatform === 'telegram' ? '@channel_name' : 'Channel ID'}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Target Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Platform
            </label>
            <select
              value={formData.targetPlatform}
              onChange={(e) => setFormData(prev => ({ ...prev, targetPlatform: e.target.value as 'telegram' | 'discord' }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="telegram">📱 Telegram</option>
              <option value="discord" disabled={userPlan === 'Free'}>
                💬 Discord {userPlan === 'Free' && '(Pro+ Required)'}
              </option>
            </select>
          </div>

          {/* Target ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target ID
            </label>
            <input
              type="text"
              value={formData.targetId}
              onChange={(e) => setFormData(prev => ({ ...prev, targetId: e.target.value }))}
              placeholder={formData.targetPlatform === 'telegram' ? '@channel_name' : 'Channel ID'}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Delay (minutes)
            </label>
            <input
              type="number"
              value={formData.delayMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, delayMinutes: parseInt(e.target.value) || 0 }))}
              min="0"
              max="1440"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Pair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddPairModalSimple