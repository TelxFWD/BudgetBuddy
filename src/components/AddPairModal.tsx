import React, { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { forwardingAPI } from '../api/endpoints'

interface AddPairModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const AddPairModal: React.FC<AddPairModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    source_platform: 'telegram',
    destination_platform: 'telegram',
    source_chat: '',
    destination_chat: '',
    delay_minutes: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await forwardingAPI.createPair(formData)
      onSuccess()
      onClose()
      // Reset form
      setFormData({
        source_platform: 'telegram',
        destination_platform: 'telegram',
        source_chat: '',
        destination_chat: '',
        delay_minutes: 0
      })
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create forwarding pair')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Add Forwarding Pair</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Platform
              </label>
              <select
                value={formData.source_platform}
                onChange={(e) => setFormData({ ...formData, source_platform: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destination Platform
              </label>
              <select
                value={formData.destination_platform}
                onChange={(e) => setFormData({ ...formData, destination_platform: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Source Chat ID/Username
            </label>
            <input
              type="text"
              value={formData.source_chat}
              onChange={(e) => setFormData({ ...formData, source_chat: e.target.value })}
              placeholder="@channel_name or chat_id"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Destination Chat ID/Username
            </label>
            <input
              type="text"
              value={formData.destination_chat}
              onChange={(e) => setFormData({ ...formData, destination_chat: e.target.value })}
              placeholder="@channel_name or chat_id"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Delay (minutes)
            </label>
            <input
              type="number"
              value={formData.delay_minutes}
              onChange={(e) => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
              min="0"
              max="1440"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pair
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddPairModal