'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Shield,
  Activity,
  Settings,
  Webhook,
  Code,
  TestTube
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppSelector } from '@/store';
import { toast } from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  usage: {
    requests: number;
    limit: number;
    lastUsed: string;
  };
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt?: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive' | 'failed';
  lastTriggered?: string;
  totalCalls: number;
  successRate: number;
}

const availablePermissions = [
  { id: 'forwarding:read', name: 'Read Forwarding Pairs' },
  { id: 'forwarding:write', name: 'Manage Forwarding Pairs' },
  { id: 'analytics:read', name: 'View Analytics' },
  { id: 'accounts:read', name: 'View Accounts' },
  { id: 'accounts:write', name: 'Manage Accounts' },
  { id: 'webhooks:write', name: 'Manage Webhooks' }
];

const availableEvents = [
  { id: 'message.forwarded', name: 'Message Forwarded' },
  { id: 'pair.created', name: 'Pair Created' },
  { id: 'pair.updated', name: 'Pair Updated' },
  { id: 'pair.deleted', name: 'Pair Deleted' },
  { id: 'session.connected', name: 'Session Connected' },
  { id: 'session.disconnected', name: 'Session Disconnected' },
  { id: 'error.occurred', name: 'Error Occurred' }
];

export const APIKeyManager: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'afxk_1234567890abcdef',
      permissions: ['forwarding:read', 'forwarding:write', 'analytics:read'],
      usage: { requests: 1250, limit: 10000, lastUsed: '2025-06-28T19:00:00Z' },
      status: 'active',
      createdAt: '2025-06-20T10:00:00Z',
      expiresAt: '2025-12-31T23:59:59Z'
    }
  ]);

  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: '1',
      name: 'Analytics Webhook',
      url: 'https://api.example.com/webhooks/analytics',
      events: ['message.forwarded', 'pair.created'],
      secret: 'whk_secretkey123',
      status: 'active',
      lastTriggered: '2025-06-28T18:45:00Z',
      totalCalls: 458,
      successRate: 98.7
    }
  ]);

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // New API Key Form
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    permissions: [] as string[],
    expiresAt: ''
  });

  // New Webhook Form
  const [newWebhookForm, setNewWebhookForm] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: ''
  });

  const generateAPIKey = () => {
    return 'afxk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const generateWebhookSecret = () => {
    return 'whk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const createAPIKey = () => {
    if (!newKeyForm.name || newKeyForm.permissions.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyForm.name,
      key: generateAPIKey(),
      permissions: newKeyForm.permissions,
      usage: { requests: 0, limit: user?.plan === 'elite' ? 100000 : 10000, lastUsed: '' },
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: newKeyForm.expiresAt || undefined
    };

    setApiKeys(prev => [...prev, newKey]);
    setNewKeyForm({ name: '', permissions: [], expiresAt: '' });
    setShowCreateKey(false);
    toast.success('API key created successfully');
  };

  const createWebhook = () => {
    if (!newWebhookForm.name || !newWebhookForm.url || newWebhookForm.events.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newWebhook: Webhook = {
      id: Date.now().toString(),
      name: newWebhookForm.name,
      url: newWebhookForm.url,
      events: newWebhookForm.events,
      secret: newWebhookForm.secret || generateWebhookSecret(),
      status: 'active',
      totalCalls: 0,
      successRate: 100
    };

    setWebhooks(prev => [...prev, newWebhook]);
    setNewWebhookForm({ name: '', url: '', events: [], secret: '' });
    setShowCreateWebhook(false);
    toast.success('Webhook created successfully');
  };

  const revokeAPIKey = (keyId: string) => {
    setApiKeys(prev => prev.map(key => 
      key.id === keyId ? { ...key, status: 'revoked' as const } : key
    ));
    toast.success('API key revoked');
  };

  const deleteWebhook = (webhookId: string) => {
    setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
    toast.success('Webhook deleted');
  };

  const testWebhook = async (webhookId: string) => {
    setTestingWebhook(webhookId);
    try {
      // Simulate webhook test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setWebhooks(prev => prev.map(webhook => 
        webhook.id === webhookId 
          ? { ...webhook, lastTriggered: new Date().toISOString(), totalCalls: webhook.totalCalls + 1 }
          : webhook
      ));
      
      toast.success('Webhook test successful');
    } catch (error) {
      toast.error('Webhook test failed');
    } finally {
      setTestingWebhook(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-neon-green';
      case 'inactive': return 'text-neon-orange';
      case 'revoked':
      case 'expired':
      case 'failed': return 'text-red-500';
      default: return 'text-dark-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-neon-green" />;
      case 'inactive': return <Clock className="h-4 w-4 text-neon-orange" />;
      case 'revoked':
      case 'expired':
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-dark-muted" />;
    }
  };

  // Check if user has Elite plan
  if (user?.plan !== 'elite') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <Shield className="h-16 w-16 text-neon-orange mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-text mb-2">Elite Plan Required</h3>
            <p className="text-dark-muted mb-4">
              API key and webhook management is available for Elite plan users only.
            </p>
            <Button className="bg-neon-green hover:bg-neon-green/80">
              Upgrade to Elite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <Key className="h-6 w-6" />
            API Keys & Webhooks
          </h1>
          <p className="text-dark-muted">
            Manage your API keys and webhook endpoints for automated integrations
          </p>
        </div>

        <Badge variant="outline" className="text-neon-green border-neon-green">
          Elite Plan Features
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark-text">API Keys</h2>
            <Button 
              onClick={() => setShowCreateKey(true)}
              className="bg-neon-green hover:bg-neon-green/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          {/* API Keys List */}
          <div className="space-y-4">
            {apiKeys.map((apiKey, index) => (
              <motion.div
                key={apiKey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-dark-text">{apiKey.name}</h3>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(apiKey.status)}
                            <span className={`text-sm ${getStatusColor(apiKey.status)}`}>
                              {apiKey.status.charAt(0).toUpperCase() + apiKey.status.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* API Key Display */}
                          <div className="flex items-center gap-2">
                            <code className="bg-dark-border px-3 py-2 rounded text-sm font-mono flex-1">
                              {visibleKeys.has(apiKey.id) ? apiKey.key : '•'.repeat(apiKey.key.length)}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                            >
                              {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(apiKey.key, 'API key')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Usage Statistics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-dark-muted">Usage:</span>
                              <div className="font-medium text-dark-text">
                                {apiKey.usage.requests.toLocaleString()} / {apiKey.usage.limit.toLocaleString()}
                              </div>
                              <div className="w-full bg-dark-border rounded-full h-2 mt-1">
                                <div 
                                  className="bg-neon-green h-2 rounded-full" 
                                  style={{ width: `${(apiKey.usage.requests / apiKey.usage.limit) * 100}%` }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <span className="text-dark-muted">Last Used:</span>
                              <div className="font-medium text-dark-text">
                                {apiKey.usage.lastUsed 
                                  ? new Date(apiKey.usage.lastUsed).toLocaleDateString()
                                  : 'Never'
                                }
                              </div>
                            </div>

                            <div>
                              <span className="text-dark-muted">Expires:</span>
                              <div className="font-medium text-dark-text">
                                {apiKey.expiresAt 
                                  ? new Date(apiKey.expiresAt).toLocaleDateString()
                                  : 'Never'
                                }
                              </div>
                            </div>
                          </div>

                          {/* Permissions */}
                          <div>
                            <span className="text-dark-muted text-sm">Permissions:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {apiKey.permissions.map(permission => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {availablePermissions.find(p => p.id === permission)?.name || permission}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {apiKey.status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-red-500 border-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently revoke the API key "{apiKey.name}". 
                                  Any applications using this key will immediately lose access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeAPIKey(apiKey.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Revoke Key
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-8 text-dark-muted">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No API keys created yet</p>
                <p className="text-sm">Create your first API key to get started</p>
              </div>
            )}
          </div>

          {/* Create API Key Modal */}
          {showCreateKey && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1a1a1b] border border-dark-border rounded-lg p-6 w-full max-w-md"
              >
                <h3 className="text-lg font-semibold text-dark-text mb-4">Create API Key</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Name</Label>
                    <Input
                      id="keyName"
                      value={newKeyForm.name}
                      onChange={(e) => setNewKeyForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Production API, Development, etc."
                    />
                  </div>

                  <div>
                    <Label>Permissions</Label>
                    <div className="space-y-2 mt-2">
                      {availablePermissions.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={permission.id}
                            checked={newKeyForm.permissions.includes(permission.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewKeyForm(prev => ({
                                  ...prev,
                                  permissions: [...prev.permissions, permission.id]
                                }));
                              } else {
                                setNewKeyForm(prev => ({
                                  ...prev,
                                  permissions: prev.permissions.filter(p => p !== permission.id)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={permission.id} className="text-sm">
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={newKeyForm.expiresAt}
                      onChange={(e) => setNewKeyForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAPIKey} className="bg-neon-green hover:bg-neon-green/80">
                    Create Key
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark-text">Webhooks</h2>
            <Button 
              onClick={() => setShowCreateWebhook(true)}
              className="bg-neon-green hover:bg-neon-green/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          {/* Webhooks List */}
          <div className="space-y-4">
            {webhooks.map((webhook, index) => (
              <motion.div
                key={webhook.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-dark-text">{webhook.name}</h3>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(webhook.status)}
                            <span className={`text-sm ${getStatusColor(webhook.status)}`}>
                              {webhook.status.charAt(0).toUpperCase() + webhook.status.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-dark-muted text-sm">URL:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="bg-dark-border px-3 py-2 rounded text-sm font-mono flex-1">
                                {webhook.url}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(webhook.url, 'Webhook URL')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-dark-muted">Total Calls:</span>
                              <div className="font-medium text-dark-text">
                                {webhook.totalCalls.toLocaleString()}
                              </div>
                            </div>

                            <div>
                              <span className="text-dark-muted">Success Rate:</span>
                              <div className="font-medium text-dark-text">
                                {webhook.successRate}%
                              </div>
                            </div>

                            <div>
                              <span className="text-dark-muted">Last Triggered:</span>
                              <div className="font-medium text-dark-text">
                                {webhook.lastTriggered 
                                  ? new Date(webhook.lastTriggered).toLocaleDateString()
                                  : 'Never'
                                }
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-dark-muted text-sm">Events:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {webhook.events.map(event => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {availableEvents.find(e => e.id === event)?.name || event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testWebhook(webhook.id)}
                          disabled={testingWebhook === webhook.id}
                        >
                          {testingWebhook === webhook.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-500 border-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the webhook "{webhook.name}". 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteWebhook(webhook.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete Webhook
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {webhooks.length === 0 && (
              <div className="text-center py-8 text-dark-muted">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No webhooks created yet</p>
                <p className="text-sm">Create your first webhook to receive real-time notifications</p>
              </div>
            )}
          </div>

          {/* Create Webhook Modal */}
          {showCreateWebhook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1a1a1b] border border-dark-border rounded-lg p-6 w-full max-w-md"
              >
                <h3 className="text-lg font-semibold text-dark-text mb-4">Create Webhook</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhookName">Name</Label>
                    <Input
                      id="webhookName"
                      value={newWebhookForm.name}
                      onChange={(e) => setNewWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Analytics Webhook, Notification Service, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="webhookUrl">URL</Label>
                    <Input
                      id="webhookUrl"
                      value={newWebhookForm.url}
                      onChange={(e) => setNewWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://api.example.com/webhooks/messages"
                    />
                  </div>

                  <div>
                    <Label>Events</Label>
                    <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                      {availableEvents.map(event => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={event.id}
                            checked={newWebhookForm.events.includes(event.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewWebhookForm(prev => ({
                                  ...prev,
                                  events: [...prev.events, event.id]
                                }));
                              } else {
                                setNewWebhookForm(prev => ({
                                  ...prev,
                                  events: prev.events.filter(e => e !== event.id)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={event.id} className="text-sm">
                            {event.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="webhookSecret">Secret (Optional)</Label>
                    <Input
                      id="webhookSecret"
                      value={newWebhookForm.secret}
                      onChange={(e) => setNewWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                      placeholder="Leave empty to auto-generate"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createWebhook} className="bg-neon-green hover:bg-neon-green/80">
                    Create Webhook
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-dark-text mb-3">Quick Start</h3>
                <div className="bg-dark-border rounded-lg p-4">
                  <h4 className="font-medium text-dark-text mb-2">Authentication</h4>
                  <p className="text-sm text-dark-muted mb-2">Include your API key in the Authorization header:</p>
                  <code className="block bg-black text-neon-green p-3 rounded text-sm font-mono">
                    curl -H "Authorization: Bearer YOUR_API_KEY" \<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;https://api.autoforwardx.com/v1/forwarding-pairs
                  </code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-dark-text mb-3">Available Endpoints</h3>
                <div className="space-y-3">
                  <div className="border border-dark-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-neon-green border-neon-green">GET</Badge>
                      <code className="text-sm">/v1/forwarding-pairs</code>
                    </div>
                    <p className="text-sm text-dark-muted">List all forwarding pairs</p>
                  </div>

                  <div className="border border-dark-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-blue-400 border-blue-400">POST</Badge>
                      <code className="text-sm">/v1/forwarding-pairs</code>
                    </div>
                    <p className="text-sm text-dark-muted">Create a new forwarding pair</p>
                  </div>

                  <div className="border border-dark-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-neon-green border-neon-green">GET</Badge>
                      <code className="text-sm">/v1/analytics</code>
                    </div>
                    <p className="text-sm text-dark-muted">Get analytics data</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-dark-text mb-3">Webhook Events</h3>
                <p className="text-sm text-dark-muted mb-3">
                  Webhooks are sent as POST requests with the following structure:
                </p>
                <div className="bg-black text-neon-green p-4 rounded text-sm font-mono">
                  {`{
  "event": "message.forwarded",
  "timestamp": "2025-06-28T19:00:00Z",
  "data": {
    "pair_id": 123,
    "message_id": "msg_456",
    "source_platform": "telegram",
    "destination_platform": "discord",
    "success": true
  }
}`}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};