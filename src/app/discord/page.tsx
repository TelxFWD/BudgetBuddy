'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Key,
  CheckCircle,
  AlertCircle,
  Users,
  Settings,
  Wifi,
  WifiOff,
  Shield,
  Clock,
  Server,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/apiService';

interface DiscordServer {
  id: number;
  server_id: string;
  server_name: string;
  bot_token: string;
  is_active: boolean;
  bot_status: string;
  member_count?: number;
  permissions: string[];
  last_seen: string;
  created_at: string;
}

export default function DiscordPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [servers, setServers] = useState<DiscordServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [serverName, setServerName] = useState('');

  const planLimits = {
    free: 1,
    pro: 3,
    elite: 10
  };

  const currentLimit = planLimits[user?.plan as keyof typeof planLimits] || planLimits.free;
  const canAddMore = servers.length < currentLimit;

  useEffect(() => {
    loadDiscordServers();
  }, []);

  const loadDiscordServers = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get('/discord/servers');
      setServers(response.data);
    } catch (error) {
      console.error('Failed to load Discord servers:', error);
    }
    setIsLoading(false);
  };

  const handleAddServer = async () => {
    if (!botToken.trim()) {
      toast.error('Please enter a bot token');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.post('/discord/servers', {
        bot_token: botToken,
        server_name: serverName || undefined
      });
      
      await loadDiscordServers();
      setShowAddForm(false);
      setBotToken('');
      setServerName('');
      toast.success('Discord server connected successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to connect Discord server');
    }
    setIsLoading(false);
  };

  const handleDeleteServer = async (serverId: number) => {
    if (!confirm('Are you sure you want to remove this Discord server?')) return;

    try {
      await apiService.delete(`/discord/servers/${serverId}`);
      await loadDiscordServers();
      toast.success('Discord server removed successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove server');
    }
  };

  const handleToggleServer = async (serverId: number, isActive: boolean) => {
    try {
      await apiService.patch(`/discord/servers/${serverId}`, {
        is_active: !isActive
      });
      await loadDiscordServers();
      toast.success(`Server ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update server');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-neon-green border-neon-green/30 bg-neon-green/10';
      case 'connecting': return 'text-neon-orange border-neon-orange/30 bg-neon-orange/10';
      case 'offline': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-dark-muted border-dark-border bg-dark-border/10';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-purple-400" />
              Discord Servers
            </h1>
            <p className="text-dark-muted mt-1">
              Manage your connected Discord servers for message forwarding
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-purple-400 border-purple-400">
              {servers.length} / {currentLimit} servers
            </Badge>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={!canAddMore}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </div>
        </div>

        {/* Add Server Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="glass-effect border-purple-400/30 bg-purple-400/5">
                <CardHeader>
                  <CardTitle className="text-dark-text flex items-center gap-2">
                    <Plus className="h-5 w-5 text-purple-400" />
                    Connect Discord Server
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="serverName" className="text-dark-text">Server Name (Optional)</Label>
                      <Input
                        id="serverName"
                        placeholder="My Discord Server"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        className="mt-1 bg-dark-border border-dark-border text-dark-text"
                      />
                      <p className="text-dark-muted text-sm mt-1">
                        Custom name for easy identification
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="botToken" className="text-dark-text">Bot Token</Label>
                      <Input
                        id="botToken"
                        type="password"
                        placeholder="Your Discord bot token"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="mt-1 bg-dark-border border-dark-border text-dark-text"
                      />
                      <p className="text-dark-muted text-sm mt-1">
                        Get your bot token from Discord Developer Portal
                      </p>
                    </div>

                    <div className="p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
                      <h4 className="text-dark-text font-medium mb-2 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        How to create a Discord bot:
                      </h4>
                      <ol className="text-dark-muted text-sm space-y-1 list-decimal list-inside">
                        <li>Go to Discord Developer Portal</li>
                        <li>Create a new application and bot</li>
                        <li>Copy the bot token</li>
                        <li>Invite the bot to your server with necessary permissions</li>
                      </ol>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 border-neon-blue text-neon-blue hover:bg-neon-blue/10"
                        onClick={() => window.open('https://discord.com/developers/applications', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Developer Portal
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleAddServer}
                        disabled={!botToken || isLoading}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        {isLoading ? 'Connecting...' : 'Connect Server'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddForm(false)}
                        className="border-dark-border hover:border-red-400 hover:text-red-400"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Servers List */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : servers.length === 0 ? (
            <Card className="glass-effect border-dark-border">
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-dark-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text mb-2">No Discord servers connected</h3>
                <p className="text-dark-muted mb-6">
                  Connect your first Discord server to start forwarding messages
                </p>
                {canAddMore && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Discord
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {servers.map((server, index) => (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-effect border-dark-border hover:border-purple-400/50 transition-all duration-300 group">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Server className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-dark-text font-medium">{server.server_name}</h3>
                            <p className="text-dark-muted text-sm">{server.server_id}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getStatusColor(server.bot_status)}`}>
                            {server.bot_status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Status</span>
                          <div className="flex items-center gap-2">
                            {server.is_active ? (
                              <>
                                <Wifi className="h-3 w-3 text-neon-green" />
                                <span className="text-neon-green text-sm">Active</span>
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-3 w-3 text-red-400" />
                                <span className="text-red-400 text-sm">Inactive</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {server.member_count && (
                          <div className="flex items-center justify-between">
                            <span className="text-dark-muted text-sm">Members</span>
                            <span className="text-dark-text text-sm flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {server.member_count}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Permissions</span>
                          <span className="text-dark-text text-sm">
                            {server.permissions?.length || 0} granted
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Last Seen</span>
                          <span className="text-dark-text text-sm">
                            {new Date(server.last_seen).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Connected</span>
                          <span className="text-dark-text text-sm">
                            {new Date(server.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {server.permissions && server.permissions.length > 0 && (
                        <div>
                          <p className="text-dark-muted text-sm mb-2">Bot Permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {server.permissions.slice(0, 3).map((permission, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                            {server.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{server.permissions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleServer(server.id, server.is_active)}
                          className={`flex-1 ${server.is_active 
                            ? 'border-red-400/30 text-red-400 hover:bg-red-400/10' 
                            : 'border-neon-green/30 text-neon-green hover:bg-neon-green/10'
                          }`}
                        >
                          {server.is_active ? (
                            <>
                              <WifiOff className="h-3 w-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Wifi className="h-3 w-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteServer(server.id)}
                          className="border-red-400/30 text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Plan Limit Warning */}
        {!canAddMore && (
          <Card className="glass-effect border-neon-orange/30 bg-neon-orange/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-neon-orange" />
                <div>
                  <p className="text-dark-text font-medium">Server Limit Reached</p>
                  <p className="text-dark-muted text-sm">
                    Upgrade to {user?.plan === 'free' ? 'Pro' : 'Elite'} plan to connect more Discord servers
                  </p>
                </div>
                <Button 
                  size="sm"
                  className="ml-auto bg-neon-orange hover:bg-neon-orange/90 text-black"
                  onClick={() => window.location.href = '/billing'}
                >
                  Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Information */}
        <Card className="glass-effect border-dark-border">
          <CardHeader>
            <CardTitle className="text-dark-text flex items-center gap-2">
              <Shield className="h-5 w-5 text-neon-blue" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-dark-text font-medium mb-3">Bot Setup Requirements</h4>
                <ul className="text-dark-muted text-sm space-y-2">
                  <li>• Your bot needs "Send Messages" permission</li>
                  <li>• Bot should have access to target channels</li>
                  <li>• Ensure bot has "Read Message History" for context</li>
                  <li>• "Manage Messages" for advanced features</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-dark-text font-medium mb-3">Security & Management</h4>
                <ul className="text-dark-muted text-sm space-y-2">
                  <li>• Bot tokens are encrypted and stored securely</li>
                  <li>• Each server can be used in multiple forwarding pairs</li>
                  <li>• Inactive servers won't participate in forwarding</li>
                  <li>• Bot health is monitored automatically</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}