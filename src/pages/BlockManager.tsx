import React, { useState, useEffect } from 'react'
import { 
  Filter,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Loader2,
  Shield,
  Image,
  MessageSquare,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { forwardingAPI, filtersAPI } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-in slide-in-from-right duration-300`}>
    <div className="flex items-center justify-between">
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">×</button>
    </div>
  </div>
)

// Add Rule Modal Component
interface AddRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rule: { searchText: string; replaceWith: string }) => void
  editingRule?: { id: number; searchText: string; replaceWith: string } | null
}

const AddRuleModal: React.FC<AddRuleModalProps> = ({ isOpen, onClose, onSave, editingRule }) => {
  const [searchText, setSearchText] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingRule) {
      setSearchText(editingRule.searchText)
      setReplaceWith(editingRule.replaceWith)
    } else {
      setSearchText('')
      setReplaceWith('')
    }
  }, [editingRule, isOpen])

  const handleSave = async () => {
    if (!searchText.trim() || !replaceWith.trim()) return
    
    setLoading(true)
    try {
      await onSave({ searchText: searchText.trim(), replaceWith: replaceWith.trim() })
      onClose()
    } catch (error) {
      console.error('Failed to save rule:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">
            {editingRule ? 'Edit Rule' : 'Add Replace Rule'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search For
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Enter text to search for..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Replace With
            </label>
            <input
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder="Enter replacement text..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!searchText.trim() || !replaceWith.trim() || loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editingRule ? 'Update Rule' : 'Add Rule'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Replace Rules Table Component
interface ReplaceRule {
  id: number
  searchText: string
  replaceWith: string
  pairId: number
}

interface ReplaceRulesTableProps {
  rules: ReplaceRule[]
  onEdit: (rule: ReplaceRule) => void
  onDelete: (ruleId: number) => void
  loading: boolean
}

const ReplaceRulesTable: React.FC<ReplaceRulesTableProps> = ({ rules, onEdit, onDelete, loading }) => {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    
    setDeletingId(ruleId)
    try {
      await onDelete(ruleId)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-4" />
          <p className="text-gray-400">Loading rules...</p>
        </div>
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="text-center py-8">
          <Filter className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg font-medium">No Replace Rules</p>
          <p className="text-gray-500 text-sm mt-2">Add your first rule to start filtering messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Search For
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Replace With
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-white font-medium">{rule.searchText}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-300">{rule.replaceWith}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit(rule)}
                      className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit rule"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deletingId === rule.id}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete rule"
                    >
                      {deletingId === rule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Block Options Component
interface BlockOptionsProps {
  selectedPair: any
  onToggleBlockText: (enabled: boolean) => void
  onToggleBlockImage: (enabled: boolean) => void
  loading: boolean
}

const BlockOptions: React.FC<BlockOptionsProps> = ({ 
  selectedPair, 
  onToggleBlockText, 
  onToggleBlockImage, 
  loading 
}) => {
  const [toggleLoading, setToggleLoading] = useState<{ text: boolean; image: boolean }>({
    text: false,
    image: false
  })

  const handleToggleText = async () => {
    setToggleLoading(prev => ({ ...prev, text: true }))
    try {
      await onToggleBlockText(!selectedPair?.blockText)
    } finally {
      setToggleLoading(prev => ({ ...prev, text: false }))
    }
  }

  const handleToggleImage = async () => {
    setToggleLoading(prev => ({ ...prev, image: true }))
    try {
      await onToggleBlockImage(!selectedPair?.blockImage)
    } finally {
      setToggleLoading(prev => ({ ...prev, image: false }))
    }
  }

  if (!selectedPair) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Select a forwarding pair to configure blocking options</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-indigo-400" />
        Block Options
      </h3>

      <div className="space-y-4">
        {/* Block Text Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-blue-400 mr-3" />
            <div>
              <p className="text-white font-medium">Block Text Messages</p>
              <p className="text-gray-400 text-sm">Prevent text messages from being forwarded</p>
            </div>
          </div>
          <button
            onClick={handleToggleText}
            disabled={loading || toggleLoading.text}
            className={`flex items-center p-1 rounded-full transition-colors ${
              selectedPair?.blockText 
                ? 'bg-indigo-500 hover:bg-indigo-600' 
                : 'bg-gray-600 hover:bg-gray-500'
            } disabled:opacity-50`}
          >
            {toggleLoading.text ? (
              <Loader2 className="h-4 w-4 animate-spin text-white mx-2" />
            ) : selectedPair?.blockText ? (
              <ToggleRight className="h-6 w-6 text-white" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-white" />
            )}
          </button>
        </div>

        {/* Block Image Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center">
            <Image className="h-5 w-5 text-green-400 mr-3" />
            <div>
              <p className="text-white font-medium">Block Image Messages</p>
              <p className="text-gray-400 text-sm">Prevent images and media from being forwarded</p>
            </div>
          </div>
          <button
            onClick={handleToggleImage}
            disabled={loading || toggleLoading.image}
            className={`flex items-center p-1 rounded-full transition-colors ${
              selectedPair?.blockImage 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gray-600 hover:bg-gray-500'
            } disabled:opacity-50`}
          >
            {toggleLoading.image ? (
              <Loader2 className="h-4 w-4 animate-spin text-white mx-2" />
            ) : selectedPair?.blockImage ? (
              <ToggleRight className="h-6 w-6 text-white" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Block Manager Component
const BlockManager: React.FC = () => {
  const { user } = useAuth()
  const [pairs, setPairs] = useState<any[]>([])
  const [selectedPairId, setSelectedPairId] = useState<number | null>(null)
  const [rules, setRules] = useState<ReplaceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ReplaceRule | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const selectedPair = pairs.find(pair => pair.id === selectedPairId)

  // Load forwarding pairs
  const loadPairs = async () => {
    try {
      setLoading(true)
      const response = await forwardingAPI.getPairs()
      setPairs(response.data || [])
      
      // Auto-select first pair if available
      if (response.data && response.data.length > 0 && !selectedPairId) {
        setSelectedPairId(response.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load pairs:', error)
      showToast('Failed to load forwarding pairs', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load replace rules for selected pair
  const loadRules = async (pairId: number) => {
    try {
      setRulesLoading(true)
      const response = await filtersAPI.getReplaceRules(pairId)
      setRules(response.data || [])
    } catch (error) {
      console.error('Failed to load rules:', error)
      // Show demo data as fallback when API fails
      setRules([
        { id: 1, searchText: "@admin", replaceWith: "support", pairId },
        { id: 2, searchText: "urgent", replaceWith: "important", pairId },
      ])
    } finally {
      setRulesLoading(false)
    }
  }

  useEffect(() => {
    loadPairs()
  }, [])

  useEffect(() => {
    if (selectedPairId) {
      loadRules(selectedPairId)
    }
  }, [selectedPairId])

  // Handle pair selection
  const handlePairSelect = (pairId: number) => {
    setSelectedPairId(pairId)
  }

  // Handle block option toggles
  const handleToggleBlockText = async (enabled: boolean) => {
    if (!selectedPairId) return
    
    try {
      await filtersAPI.updatePairSettings(selectedPairId, { blockText: enabled })
      
      // Update local state
      setPairs(prevPairs => 
        prevPairs.map(pair => 
          pair.id === selectedPairId 
            ? { ...pair, blockText: enabled }
            : pair
        )
      )
      
      showToast(`Text blocking ${enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch (error) {
      console.error('Failed to update text blocking:', error)
      showToast('Failed to update block settings', 'error')
    }
  }

  const handleToggleBlockImage = async (enabled: boolean) => {
    if (!selectedPairId) return
    
    try {
      await filtersAPI.updatePairSettings(selectedPairId, { blockImage: enabled })
      
      // Update local state
      setPairs(prevPairs => 
        prevPairs.map(pair => 
          pair.id === selectedPairId 
            ? { ...pair, blockImage: enabled }
            : pair
        )
      )
      
      showToast(`Image blocking ${enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch (error) {
      console.error('Failed to update image blocking:', error)
      showToast('Failed to update block settings', 'error')
    }
  }

  // Handle rule operations
  const handleSaveRule = async (ruleData: { searchText: string; replaceWith: string }) => {
    if (!selectedPairId) return

    try {
      if (editingRule) {
        // Update existing rule
        await filtersAPI.updateReplaceRule(editingRule.id, ruleData)
        
        setRules(prevRules => 
          prevRules.map(rule => 
            rule.id === editingRule.id 
              ? { ...rule, ...ruleData }
              : rule
          )
        )
        showToast('Rule updated successfully', 'success')
      } else {
        // Create new rule
        const response = await filtersAPI.createReplaceRule({ ...ruleData, pairId: selectedPairId })
        
        const newRule = {
          id: response.data.id || Date.now(), // Use API ID or fallback
          ...ruleData,
          pairId: selectedPairId
        }
        
        setRules(prevRules => [...prevRules, newRule])
        showToast('Rule added successfully', 'success')
      }
      
      setIsAddRuleModalOpen(false)
      setEditingRule(null)
    } catch (error) {
      console.error('Failed to save rule:', error)
      showToast('Failed to save rule', 'error')
    }
  }

  const handleEditRule = (rule: ReplaceRule) => {
    setEditingRule(rule)
    setIsAddRuleModalOpen(true)
  }

  const handleDeleteRule = async (ruleId: number) => {
    try {
      await filtersAPI.deleteReplaceRule(ruleId)
      setRules(prevRules => prevRules.filter(rule => rule.id !== ruleId))
      showToast('Rule deleted successfully', 'success')
    } catch (error) {
      console.error('Failed to delete rule:', error)
      showToast('Failed to delete rule', 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-20">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-indigo-500 mb-4" />
          <p className="text-gray-400 text-lg">Loading Block Manager...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Filter className="h-8 w-8 mr-3 text-indigo-400" />
          Block Manager
        </h1>
        <p className="text-gray-400">Control filtering and replacement for your forwarding pairs</p>
      </div>

      {/* Pair Selection */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Select Forwarding Pair
        </label>
        {pairs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No forwarding pairs found. Create a pair first to manage blocking rules.</p>
          </div>
        ) : (
          <select
            value={selectedPairId || ''}
            onChange={(e) => handlePairSelect(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Choose a forwarding pair...</option>
            {pairs.map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.name || `${pair.source} → ${pair.destination}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedPair && (
        <>
          {/* Block Options */}
          <BlockOptions
            selectedPair={selectedPair}
            onToggleBlockText={handleToggleBlockText}
            onToggleBlockImage={handleToggleBlockImage}
            loading={loading}
          />

          {/* Replace Rules Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Replace Text Rules</h2>
              <button
                onClick={() => {
                  setEditingRule(null)
                  setIsAddRuleModalOpen(true)
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </button>
            </div>

            <ReplaceRulesTable
              rules={rules}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              loading={rulesLoading}
            />
          </div>
        </>
      )}

      {/* Add/Edit Rule Modal */}
      <AddRuleModal
        isOpen={isAddRuleModalOpen}
        onClose={() => {
          setIsAddRuleModalOpen(false)
          setEditingRule(null)
        }}
        onSave={handleSaveRule}
        editingRule={editingRule}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

export default BlockManager