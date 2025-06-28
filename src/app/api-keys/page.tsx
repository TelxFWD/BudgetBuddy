"use client";

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Globe, Shield, AlertCircle } from 'lucide-react';
import { ApiKeyService } from '@/services/apiKeyService';
import { BillingService } from '@/services/billingService';

export default function ApiKeysPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [visibleKeys, setVisibleKeys] = useState(new Set());

  const planLimits = BillingService.getPlanLimits(user?.plan || 'free');
  const hasApiAccess = planLimits.features.includes('api_access');
  const hasWebhookAccess = planLimits.features.includes('webhook_integration');

  useEffect(() => {
    if (hasApiAccess) {
      fetchApiKeys();
    }
    if (hasWebhookAccess) {
      fetchWebhooks();
    }
    setLoading(false);
  }, [hasApiAccess, hasWebhookAccess]);

  const fetchApiKeys = async () => {
    try {
      const keys = await ApiKeyService.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const hooks = await ApiKeyService.getWebhooks();
      setWebhooks(hooks);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      const newKey = await ApiKeyService.createApiKey(newKeyName, ['read', 'write']);
      setApiKeys([...apiKeys, newKey]);
      setNewKeyName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      await ApiKeyService.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const createWebhook = async () => {
    if (!newWebhookUrl.trim()) return;
    
    try {
      const newWebhook = await ApiKeyService.createWebhook(newWebhookUrl, ['message_forwarded', 'session_status']);
      setWebhooks([...webhooks, newWebhook]);
      setNewWebhookUrl('');
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys & Webhooks</h1>
        <Badge className={`${user?.plan === 'elite' ? 'bg-purple-500' : 'bg-gray-500'} text-white`}>
          {user?.plan?.toUpperCase()} PLAN
        </Badge>
      </div>

      {/* Plan Restriction Notice */}
      {!hasApiAccess && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Elite Plan Required</h3>
                <p className="text-yellow-700">
                  API access and webhook integration are available in the Elite plan. 
                  Upgrade to unlock these advanced features.
                </p>
                <Button className="mt-3" size="sm">
                  Upgrade to Elite
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys" disabled={!hasApiAccess}>
            API Keys {!hasApiAccess && '(Elite)'}
          </TabsTrigger>
          <TabsTrigger value="webhooks" disabled={!hasWebhookAccess}>
            Webhooks {!hasWebhookAccess && '(Elite)'}
          </TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <div className="space-y-6">
            {/* Create New API Key */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys
                  </span>
                  {hasApiAccess && (
                    <Button 
                      onClick={() => setShowCreateForm(!showCreateForm)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Key
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showCreateForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-3">Create New API Key</h4>
                    <div className="flex gap-3">
                      <Input
                        placeholder="API Key Name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                        Create
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {hasApiAccess ? (
                  <div className="space-y-4">
                    {apiKeys.length > 0 ? (
                      apiKeys.map((key) => (
                        <div key={key.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{key.name}</h4>
                              <div className="flex items-center gap-2 mt-2">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                                  {visibleKeys.has(key.id) ? key.key : `${key.key.substring(0, 8)}...`}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleKeyVisibility(key.id)}
                                >
                                  {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(key.key)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                <span>Usage: {key.usageCount} calls</span>
                                <span>Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={key.isActive ? 'default' : 'secondary'}>
                                {key.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteApiKey(key.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No API keys created yet</p>
                        <p className="text-sm text-gray-500">Create your first API key to get started</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">API access not available</p>
                    <p className="text-sm text-gray-500">Upgrade to Elite plan to access API features</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasWebhookAccess ? (
                <div className="space-y-6">
                  {/* Create Webhook */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-3">Add Webhook URL</h4>
                    <div className="flex gap-3">
                      <Input
                        placeholder="https://your-server.com/webhook"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={createWebhook} disabled={!newWebhookUrl.trim()}>
                        Add Webhook
                      </Button>
                    </div>
                  </div>

                  {/* Webhook List */}
                  <div className="space-y-4">
                    {webhooks.length > 0 ? (
                      webhooks.map((webhook) => (
                        <div key={webhook.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{webhook.url}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span>Events: {webhook.events.join(', ')}</span>
                                <span>Last triggered: {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleDateString() : 'Never'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                                {webhook.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Button variant="outline" size="sm">
                                Test
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No webhooks configured</p>
                        <p className="text-sm text-gray-500">Add your first webhook to receive real-time notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Webhook access not available</p>
                  <p className="text-sm text-gray-500">Upgrade to Elite plan to configure webhooks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h3>Getting Started</h3>
                <p>Use your API key to authenticate requests to the AutoForwardX API.</p>
                
                <h4>Authentication</h4>
                <pre className="bg-gray-100 p-3 rounded">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     https://api.autoforwardx.com/v1/forwarding-pairs`}
                </pre>

                <h4>Available Endpoints</h4>
                <div className="space-y-4">
                  <div>
                    <code>GET /api/forwarding-pairs</code>
                    <p className="text-sm text-gray-600">List all forwarding pairs</p>
                  </div>
                  <div>
                    <code>POST /api/forwarding-pairs</code>
                    <p className="text-sm text-gray-600">Create a new forwarding pair</p>
                  </div>
                  <div>
                    <code>GET /api/analytics/stats</code>
                    <p className="text-sm text-gray-600">Get analytics and statistics</p>
                  </div>
                </div>

                <h4>Webhook Events</h4>
                <ul>
                  <li><code>message_forwarded</code> - Triggered when a message is successfully forwarded</li>
                  <li><code>session_status</code> - Triggered when session status changes</li>
                  <li><code>error_occurred</code> - Triggered when an error occurs</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}