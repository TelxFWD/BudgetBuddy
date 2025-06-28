/**
 * API Key Management Component for Elite Plan Users
 * Handles API key generation, display, revocation, and webhook management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Globe, 
  TestTube, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Settings,
  Activity,
  Clock
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  usage_count: number;
  rate_limit: number;
  permissions: string[];
  status: 'active' | 'revoked' | 'expired';
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive' | 'error';
  last_triggered?: string;
  success_rate: number;
  created_at: string;
}

interface APIKeyManagerProps {
  userPlan: 'free' | 'pro' | 'elite';
  onAPIKeyCreate: (name: string, permissions: string[]) => Promise<APIKey>;
  onAPIKeyRevoke: (keyId: string) => Promise<void>;
  onWebhookCreate: (webhook: Omit<Webhook, 'id' | 'created_at' | 'success_rate'>) => Promise<Webhook>;
  onWebhookUpdate: (webhookId: string, updates: Partial<Webhook>) => Promise<void>;
  onWebhookDelete: (webhookId: string) => Promise<void>;
  onWebhookTest: (webhookId: string) => Promise<{ success: boolean; response?: string; error?: string }>;
}

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({
  userPlan,
  onAPIKeyCreate,
  onAPIKeyRevoke,
  onWebhookCreate,
  onWebhookUpdate,
  onWebhookDelete,
  onWebhookTest
}) => {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [testingWebhooks, setTestingWebhooks] = useState<Set<string>>(new Set());
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: ''
  });

  const availablePermissions = [
    'forwarding:read',
    'forwarding:write',
    'analytics:read',
    'accounts:read',
    'accounts:write'
  ];

  const availableEvents = [
    'pair.created',
    'pair.updated',
    'pair.deleted',
    'message.forwarded',
    'session.connected',
    'session.disconnected',
    'error.occurred'
  ];

  // Check if user has access to API management
  if (userPlan !== 'elite') {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 text-center">
        <Key className="mx-auto mb-4 text-gray-500" size={48} />
        <h3 className="text-xl font-semibold text-dark-text mb-2">API Key Management</h3>
        <p className="text-gray-400 mb-4">
          API key management is available for Elite plan users only.
        </p>
        <button className="px-6 py-2 bg-neon-purple text-white rounded-lg hover:bg-purple-600 transition-colors">
          Upgrade to Elite
        </button>
      </div>
    );
  }

  useEffect(() => {
    // Load existing API keys and webhooks
    loadAPIKeys();
    loadWebhooks();
  }, []);

  const loadAPIKeys = async () => {
    // In real implementation, fetch from API
    const mockKeys: APIKey[] = [
      {
        id: '1',
        name: 'Production API',
        key: 'ak_live_1234567890abcdef',
        created_at: '2024-01-15T10:30:00Z',
        last_used: '2024-01-20T14:22:00Z',
        usage_count: 1250,
        rate_limit: 1000,
        permissions: ['forwarding:read', 'forwarding:write', 'analytics:read'],
        status: 'active'
      },
      {
        id: '2',
        name: 'Analytics Dashboard',
        key: 'ak_live_fedcba0987654321',
        created_at: '2024-01-10T09:15:00Z',
        last_used: '2024-01-19T11:45:00Z',
        usage_count: 580,
        rate_limit: 500,
        permissions: ['analytics:read'],
        status: 'active'
      }
    ];
    setAPIKeys(mockKeys);
  };

  const loadWebhooks = async () => {
    // In real implementation, fetch from API
    const mockWebhooks: Webhook[] = [
      {
        id: '1',
        name: 'Slack Notifications',
        url: 'https://hooks.slack.com/services/xxx',
        events: ['message.forwarded', 'error.occurred'],
        secret: 'whsec_1234567890',
        status: 'active',
        last_triggered: '2024-01-20T15:30:00Z',
        success_rate: 98.5,
        created_at: '2024-01-15T10:30:00Z'
      }
    ];
    setWebhooks(mockWebhooks);
  };

  const handleCreateAPIKey = async () => {
    if (!newKeyName.trim() || newKeyPermissions.length === 0) return;

    try {
      const newKey = await onAPIKeyCreate(newKeyName, newKeyPermissions);
      setAPIKeys(prev => [...prev, newKey]);
      setShowCreateKey(false);
      setNewKeyName('');
      setNewKeyPermissions([]);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRevokeAPIKey = async (keyId: string) => {
    try {
      await onAPIKeyRevoke(keyId);
      setAPIKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, status: 'revoked' as const } : key
      ));
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0) return;

    try {
      const webhook = await onWebhookCreate({
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
        secret: newWebhook.secret || generateWebhookSecret(),
        status: 'active'
      });
      setWebhooks(prev => [...prev, webhook]);
      setShowCreateWebhook(false);
      setNewWebhook({ name: '', url: '', events: [], secret: '' });
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhooks(prev => new Set(prev).add(webhookId));
    
    try {
      const result = await onWebhookTest(webhookId);
      // Show success/error notification
      console.log('Webhook test result:', result);
    } catch (error) {
      console.error('Webhook test failed:', error);
    } finally {
      setTestingWebhooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(webhookId);
        return newSet;
      });
    }
  };

  const generateWebhookSecret = () => {
    return 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskAPIKey = (key: string) => {
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">API Key Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateWebhook(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Globe size={16} />
            Add Webhook
          </button>
          <button
            onClick={() => setShowCreateKey(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            Create API Key
          </button>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-dark-text mb-4">API Keys</h3>
        
        <div className="space-y-4">
          {apiKeys.map(key => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    key.status === 'active' ? 'bg-neon-green' : 
                    key.status === 'revoked' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <h4 className="font-medium text-dark-text">{key.name}</h4>
                  <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 capitalize">
                    {key.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleKeyVisibility(key.id)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                  >
                    {visibleKeys.has(key.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(key.key)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                  >
                    <Copy size={16} />
                  </button>
                  {key.status === 'active' && (
                    <button
                      onClick={() => handleRevokeAPIKey(key.id)}
                      className="p-1 rounded hover:bg-red-700 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="font-mono text-sm bg-gray-800 p-2 rounded mb-3">
                {visibleKeys.has(key.id) ? key.key : maskAPIKey(key.key)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Usage:</span>
                  <div className="text-dark-text">{key.usage_count.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-400">Rate Limit:</span>
                  <div className="text-dark-text">{key.rate_limit}/hour</div>
                </div>
                <div>
                  <span className="text-gray-400">Last Used:</span>
                  <div className="text-dark-text">
                    {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Permissions:</span>
                  <div className="text-dark-text">{key.permissions.length} scopes</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-400 mb-1">Permissions:</div>
                <div className="flex flex-wrap gap-1">
                  {key.permissions.map(permission => (
                    <span
                      key={permission}
                      className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          {apiKeys.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No API keys created yet. Create your first API key to get started.
            </div>
          )}
        </div>
      </div>

      {/* Webhooks Section */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-dark-text mb-4">Webhooks</h3>
        
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <motion.div
              key={webhook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    webhook.status === 'active' ? 'bg-neon-green' : 
                    webhook.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <h4 className="font-medium text-dark-text">{webhook.name}</h4>
                  <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 capitalize">
                    {webhook.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    disabled={testingWebhooks.has(webhook.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    <TestTube size={12} />
                    {testingWebhooks.has(webhook.id) ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={() => onWebhookDelete(webhook.id)}
                    className="p-1 rounded hover:bg-red-700 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-300 mb-3 font-mono bg-gray-800 p-2 rounded">
                {webhook.url}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-400">Success Rate:</span>
                  <div className="text-neon-green">{webhook.success_rate}%</div>
                </div>
                <div>
                  <span className="text-gray-400">Last Triggered:</span>
                  <div className="text-dark-text">
                    {webhook.last_triggered ? new Date(webhook.last_triggered).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Events:</span>
                  <div className="text-dark-text">{webhook.events.length} types</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Subscribed Events:</div>
                <div className="flex flex-wrap gap-1">
                  {webhook.events.map(event => (
                    <span
                      key={event}
                      className="text-xs px-2 py-1 bg-purple-900 text-purple-300 rounded"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          {webhooks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No webhooks configured. Add a webhook to receive real-time notifications.
            </div>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      <AnimatePresence>
        {showCreateKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowCreateKey(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card border border-dark-border rounded-lg p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-dark-text mb-4">Create New API Key</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {availablePermissions.map(permission => (
                      <label key={permission} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newKeyPermissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyPermissions(prev => [...prev, permission]);
                            } else {
                              setNewKeyPermissions(prev => prev.filter(p => p !== permission));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-dark-text">{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateKey(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAPIKey}
                    disabled={!newKeyName.trim() || newKeyPermissions.length === 0}
                    className="flex-1 px-4 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    Create Key
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Webhook Modal */}
      <AnimatePresence>
        {showCreateWebhook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowCreateWebhook(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card border border-dark-border rounded-lg p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-dark-text mb-4">Add New Webhook</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Webhook Name</label>
                  <input
                    type="text"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Slack Notifications"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Events to Subscribe</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {availableEvents.map(event => (
                      <label key={event} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook(prev => ({ ...prev, events: [...prev.events, event] }));
                            } else {
                              setNewWebhook(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-dark-text">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateWebhook(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWebhook}
                    disabled={!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0}
                    className="flex-1 px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                  >
                    Create Webhook
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};