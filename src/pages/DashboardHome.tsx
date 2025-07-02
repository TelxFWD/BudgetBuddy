import React, { useState, useEffect } from 'react'
import { 
  Server, 
  Database, 
  Zap, 
  Plus, 
  Edit, 
  Pause, 
  Trash2, 
  Play,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Activity,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { forwardingAPI, systemAPI } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import AddPairModal from '../components/AddPairModal'

// Component for System Status Panel
const SystemStatusPanel: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const testConnection = async () => {
    setBackendStatus('checking')
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setBackendStatus('online')
      } else {
        setBackendStatus('offline')
      }
    } catch (error) {
      setBackendStatus('offline')
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  const services = [
    {
      name: 'FastAPI Backend',
      status: backendStatus,
      icon: Server,
      description: 'REST API Server'
    },
    {
      name: 'Redis Queue',
      status: 'online' as const,
      icon: Database,
      description: 'Message Queue'
    },
    {
      name: 'Celery Workers',
      status: 'online' as const,
      icon: Zap,
      description: 'Background Tasks'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400'
      case 'offline': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/20 border-green-500/30'
      case 'offline': return 'bg-red-500/20 border-red-500/30'
      default: return 'bg-yellow-500/20 border-yellow-500/30'
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">System Status</h2>
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200"
        >
          Test Backend Connection
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.name} className={`p-4 rounded-lg border ${getStatusBg(service.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <service.icon className="h-6 w-6 text-gray-300" />
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'online' ? 'bg-green-400' : 
                service.status === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
            </div>
            <h3 className="font-medium text-white mb-1">{service.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{service.description}</p>
            <span className={`text-sm font-medium ${getStatusColor(service.status)}`}>
              {service.status === 'checking' ? 'Checking...' : service.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Plan Summary Panel Component (Replaces System Status)
interface PlanSummaryPanelProps {
  onAddPairClick: () => void;
  onRefresh: () => void;
}

const PlanSummaryPanel: React.FC<PlanSummaryPanelProps> = ({ onAddPairClick, onRefresh }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activePairs: 0,
    messagesForwarded: 0,
    planUsage: { used: 0, limit: 0 }
  });

  const planLimits = {
    'free': { pairs: 1, name: 'Free' },
    'pro': { pairs: 15, name: 'Pro' },
    'elite': { pairs: 999, name: 'Elite' }
  };

  const userPlan = user?.plan?.toLowerCase() || 'free';
  const currentPlan = planLimits[userPlan as keyof typeof planLimits] || planLimits.free;

  const fetchStats = async () => {
    try {
      const response = await forwardingAPI.getPairs();
      const pairs = response.data || [];
      setStats({
        activePairs: pairs.filter((p: any) => p.status === 'active').length,
        messagesForwarded: pairs.reduce((sum: number, p: any) => sum + (p.messages_forwarded || 0), 0),
        planUsage: { used: pairs.length, limit: currentPlan.pairs }
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentPlan.pairs]);

  // Expose fetchStats via onRefresh
  useEffect(() => {
    if (onRefresh) {
      window.planSummaryRefresh = fetchStats;
    }
  }, [onRefresh]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Plan Summary</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          userPlan === 'elite' ? 'bg-purple-500/20 text-purple-300' :
          userPlan === 'pro' ? 'bg-blue-500/20 text-blue-300' :
          'bg-gray-500/20 text-gray-300'
        }`}>
          {currentPlan.name} Plan
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-2">{stats.activePairs}</div>
          <div className="text-gray-400 text-sm">Active Pairs</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-indigo-400 mb-2">{stats.messagesForwarded}</div>
          <div className="text-gray-400 text-sm">Messages Forwarded</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-violet-400 mb-2">
            {stats.planUsage.used}/{currentPlan.pairs === 999 ? '∞' : currentPlan.pairs}
          </div>
          <div className="text-gray-400 text-sm">Pair Usage</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-3">
        <button 
          onClick={onAddPairClick}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Pair
        </button>
        {userPlan === 'free' && (
          <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
            Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
};

// Enhanced Component for Forwarding Pairs Manager with Elite Features
interface ForwardingPairsPanelProps {
  onAddPairClick: () => void;
  onRefresh: () => void;
}

const ForwardingPairsPanel: React.FC<ForwardingPairsPanelProps> = ({ onAddPairClick, onRefresh }) => {
  const { user } = useAuth();
  const [pairs, setPairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})

  const userPlan = user?.plan?.toLowerCase() || 'free';
  const planLimits = {
    'free': { pairs: 1, name: 'Free', copyMode: false, contentFilter: false, csvExport: false },
    'pro': { pairs: 15, name: 'Pro', copyMode: false, contentFilter: false, csvExport: true },
    'elite': { pairs: 999, name: 'Elite', copyMode: true, contentFilter: true, csvExport: true }
  };
  const currentPlan = planLimits[userPlan as keyof typeof planLimits] || planLimits.free;

  // Load pairs from API
  const loadPairs = async () => {
    try {
      setLoading(true)
      const response = await forwardingAPI.getPairs()
      setPairs(response.data || [])
    } catch (error) {
      console.error('Failed to load forwarding pairs:', error)
      setPairs([]) // Use empty array, no fallback data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPairs()
  }, [])

  // Expose loadPairs via onRefresh
  useEffect(() => {
    if (onRefresh) {
      window.forwardingRefresh = loadPairs;
    }
  }, [onRefresh]);

  // Enhanced pair actions with backend integration
  const handlePauseResume = async (pairId: number, currentStatus: string) => {
    const actionKey = `pause-${pairId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await forwardingAPI.updatePair(pairId, { status: newStatus });
      setPairs(pairs.map(p => p.id === pairId ? {...p, status: newStatus} : p));
    } catch (error) {
      console.error('Failed to update pair status:', error);
      alert('Failed to update pair status. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleDelete = async (pairId: number) => {
    if (!confirm('Are you sure you want to delete this forwarding pair?')) return;
    
    const actionKey = `delete-${pairId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      await forwardingAPI.deletePair(pairId);
      setPairs(pairs.filter(p => p.id !== pairId));
    } catch (error) {
      console.error('Failed to delete pair:', error);
      alert('Failed to delete pair. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleCopyModeToggle = async (pairId: number, currentMode: boolean) => {
    if (!currentPlan.copyMode) {
      alert('Copy Mode is only available for Elite plan users. Upgrade to unlock this feature.');
      return;
    }
    try {
      await forwardingAPI.updatePair(pairId, { copy_mode: !currentMode });
      setPairs(pairs.map(p => p.id === pairId ? {...p, copy_mode: !currentMode} : p));
    } catch (error) {
      console.error('Failed to toggle copy mode:', error);
      alert('Failed to update copy mode. Please try again.');
    }
  };

  const handleContentFilterToggle = async (pairId: number, filterType: 'block_images' | 'block_text', currentValue: boolean) => {
    if (!currentPlan.contentFilter) {
      alert('Content filtering is only available for Elite plan users. Upgrade to unlock this feature.');
      return;
    }
    try {
      await forwardingAPI.updatePair(pairId, { [filterType]: !currentValue });
      setPairs(pairs.map(p => p.id === pairId ? {...p, [filterType]: !currentValue} : p));
    } catch (error) {
      console.error('Failed to update content filter:', error);
      alert('Failed to update content filter. Please try again.');
    }
  };

  const handleCustomDelayUpdate = async (pairId: number, delayMinutes: number) => {
    try {
      await forwardingAPI.updatePair(pairId, { delay_minutes: delayMinutes });
      setPairs(pairs.map(p => p.id === pairId ? {...p, delay_minutes: delayMinutes} : p));
    } catch (error) {
      console.error('Failed to update delay:', error);
      alert('Failed to update delay. Please try again.');
    }
  };

  const handleAddPair = () => {
    if (pairs.length >= currentPlan.pairs) {
      alert(`You've reached your plan limit of ${currentPlan.pairs} forwarding pairs. Upgrade to add more.`);
      return;
    }
    // Redirect to Add Pair page
    window.location.href = '/dashboard/pairs';
  };

  const openTextFilters = (pair: any) => {
    if (!currentPlan.contentFilter) {
      alert('Text filtering is only available for Elite plan users. Upgrade to unlock this feature.');
      return;
    }
    alert('Text filter editor coming soon! This will open a modal to edit search/replace rules.');
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Forwarding Pairs</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {pairs.length}/{currentPlan.pairs === 999 ? '∞' : currentPlan.pairs} pairs used
          </span>
          <button 
            onClick={onAddPairClick}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pair
          </button>
        </div>
      </div>

      {pairs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No forwarding pairs yet</div>
          <button 
            onClick={onAddPairClick}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-colors flex items-center justify-center mx-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Pair
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair) => (
            <div key={pair.id} className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
              {/* Main pair info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-white font-medium text-lg">
                      {pair.source_platform?.charAt(0).toUpperCase() + pair.source_platform?.slice(1) || 'Unknown'} → {pair.destination_platform?.charAt(0).toUpperCase() + pair.destination_platform?.slice(1) || 'Unknown'}
                    </span>
                    <span className={`ml-3 px-3 py-1 text-xs rounded-full font-medium ${
                      pair.status === 'active' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : pair.status === 'paused'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {pair.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400 mb-2">
                    <span className="font-mono">{pair.source_chat || 'N/A'}</span>
                    <ArrowRight className="h-4 w-4 mx-2" />
                    <span className="font-mono">{pair.destination_chat || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {pair.messages_forwarded || 0} messages
                    </span>
                    <span>Delay: {pair.delay_minutes ? `${pair.delay_minutes}m` : '0m'}</span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => openTextFilters(pair)}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      currentPlan.contentFilter 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                        : 'text-gray-600 cursor-not-allowed'
                    }`}
                    title={currentPlan.contentFilter ? 'Edit Text Filters' : 'Elite feature - Upgrade to unlock'}
                    disabled={!currentPlan.contentFilter}
                  >
                    🔍
                  </button>
                  <button 
                    onClick={() => handlePauseResume(pair.id, pair.status)}
                    disabled={actionLoading[`pause-${pair.id}`]}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    title={pair.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    {actionLoading[`pause-${pair.id}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : pair.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleDelete(pair.id)}
                    disabled={actionLoading[`delete-${pair.id}`]}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete pair"
                  >
                    {actionLoading[`delete-${pair.id}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Elite Features Section */}
              <div className="border-t border-gray-600 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Copy Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Copy Mode</span>
                    <button
                      onClick={() => handleCopyModeToggle(pair.id, pair.copy_mode)}
                      disabled={!currentPlan.copyMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentPlan.copyMode
                          ? pair.copy_mode
                            ? 'bg-indigo-600'
                            : 'bg-gray-600'
                          : 'bg-gray-700 cursor-not-allowed'
                      }`}
                      title={currentPlan.copyMode ? 'Toggle copy mode' : 'Elite feature - Upgrade to unlock'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pair.copy_mode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Block Images Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Block Images</span>
                    <button
                      onClick={() => handleContentFilterToggle(pair.id, 'block_images', pair.block_images)}
                      disabled={!currentPlan.contentFilter}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentPlan.contentFilter
                          ? pair.block_images
                            ? 'bg-red-600'
                            : 'bg-gray-600'
                          : 'bg-gray-700 cursor-not-allowed'
                      }`}
                      title={currentPlan.contentFilter ? 'Toggle image blocking' : 'Elite feature - Upgrade to unlock'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pair.block_images ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Block Text Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Block Text</span>
                    <button
                      onClick={() => handleContentFilterToggle(pair.id, 'block_text', pair.block_text)}
                      disabled={!currentPlan.contentFilter}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentPlan.contentFilter
                          ? pair.block_text
                            ? 'bg-red-600'
                            : 'bg-gray-600'
                          : 'bg-gray-700 cursor-not-allowed'
                      }`}
                      title={currentPlan.contentFilter ? 'Toggle text blocking' : 'Elite feature - Upgrade to unlock'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pair.block_text ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Custom Delay Slider */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Custom Delay</span>
                    <span className="text-sm text-indigo-400">{pair.delay_minutes || 0} minutes</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1440"
                    step="5"
                    value={pair.delay_minutes || 0}
                    onChange={(e) => handleCustomDelayUpdate(pair.id, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0m</span>
                    <span>6h</span>
                    <span>12h</span>
                    <span>24h</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Component for Analytics Panel
const AnalyticsPanel: React.FC = () => {
  const stats = {
    totalMessages: 2847,
    successRate: 98.5,
    todayMessages: 156
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Analytics Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm font-medium">Total Messages</p>
              <p className="text-2xl font-bold text-white">{stats.totalMessages.toLocaleString()}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-300 text-sm font-medium">Today</p>
              <p className="text-2xl font-bold text-white">{stats.todayMessages}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Simple Chart Preview */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Weekly Activity</h3>
        <div className="flex items-end justify-between h-24 space-x-2">
          {[40, 65, 45, 80, 60, 90, 75].map((height, index) => (
            <div key={index} className="flex-1 bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t-sm opacity-80" style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Component for Account Manager
const AccountManagerPanel: React.FC = () => {
  const [accounts] = useState([
    {
      id: 1,
      platform: 'Telegram',
      username: '@myAccount',
      status: 'connected',
      sessions: 3,
      lastActive: '2 minutes ago'
    },
    {
      id: 2,
      platform: 'Discord',
      username: 'MyBot#1234',
      status: 'connected',
      sessions: 1,
      lastActive: '5 minutes ago'
    },
    {
      id: 3,
      platform: 'Telegram',
      username: '@backupAccount',
      status: 'disconnected',
      sessions: 0,
      lastActive: '2 hours ago'
    }
  ])

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Account Manager</h2>
        <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Telegram Account
        </button>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  account.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <div>
                  <div className="flex items-center">
                    <span className="text-white font-medium">{account.platform}</span>
                    <span className="ml-2 text-gray-400">{account.username}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400 mt-1">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>{account.sessions} sessions</span>
                    <span className="ml-4">Last: {account.lastActive}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-colors">
                  Reconnect
                </button>
                <button className="px-3 py-1 text-sm text-gray-300 bg-gray-600/50 border border-gray-500/30 rounded-lg hover:bg-gray-600 transition-colors">
                  Switch
                </button>
                <button className="px-3 py-1 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Dashboard Home Component
const DashboardHome: React.FC = () => {
  const [showAddPairModal, setShowAddPairModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddPairClick = () => {
    setShowAddPairModal(true)
  }

  const handleModalSuccess = () => {
    setRefreshKey(prev => prev + 1) // Trigger refresh
    setShowAddPairModal(false)
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Monitor and manage your message forwarding system</p>
      </div>

      {/* Plan Summary and Quick Actions */}
      <PlanSummaryPanel 
        onAddPairClick={handleAddPairClick}
        onRefresh={handleRefresh}
      />

      {/* Forwarding Pairs */}
      <ForwardingPairsPanel 
        onAddPairClick={handleAddPairClick}
        onRefresh={handleRefresh}
        key={refreshKey} // Force refresh when needed
      />

      {/* Analytics and Account Manager in Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsPanel />
        <AccountManagerPanel />
      </div>

      {/* Add Pair Modal */}
      <AddPairModal
        isOpen={showAddPairModal}
        onClose={() => setShowAddPairModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}

export default DashboardHome