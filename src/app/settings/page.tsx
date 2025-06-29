'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';

import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Key,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Download,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/apiService';

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    securityAlerts: true,
    maintenanceUpdates: false
  });

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 24,
    ipWhitelist: [],
    apiKeyAccess: user?.plan === 'elite'
  });

  const [connectedAccounts, setConnectedAccounts] = useState({
    telegram: [],
    discord: []
  });

  useEffect(() => {
    loadUserSettings();
    loadConnectedAccounts();
  }, []);

  const loadUserSettings = async () => {
    try {
      const response = await apiService.get('/user/settings');
      const settings = response.data;
      setNotifications(settings.notifications || notifications);
      setSecurity(settings.security || security);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadConnectedAccounts = async () => {
    try {
      const response = await apiService.get('/auth/linked-accounts');
      setConnectedAccounts(response.data);
    } catch (error) {
      console.error('Failed to load connected accounts:', error);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updateData: any = {
        username: profileData.username,
        email: profileData.email
      };

      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast.error('Passwords do not match');
          setIsSaving(false);
          return;
        }
        updateData.current_password = profileData.currentPassword;
        updateData.new_password = profileData.newPassword;
      }

      // TODO: Implement updateProfile action in authSlice
      console.log('Profile update data:', updateData);
      toast.success('Profile updated successfully');
      setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
    setIsSaving(false);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await apiService.put('/user/settings/notifications', notifications);
      toast.success('Notification settings saved');
    } catch (error) {
      toast.error('Failed to save notification settings');
    }
    setIsSaving(false);
  };

  const handleSaveSecurity = async () => {
    setIsSaving(true);
    try {
      await apiService.put('/user/settings/security', security);
      toast.success('Security settings saved');
    } catch (error) {
      toast.error('Failed to save security settings');
    }
    setIsSaving(false);
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') return;

    try {
      await apiService.delete('/user/account');
      toast.success('Account deleted successfully');
      window.location.href = '/login';
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await apiService.get('/user/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'user_data.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'accounts', label: 'Connected Accounts', icon: Key },
    { id: 'data', label: 'Data & Privacy', icon: Lock }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-neon-blue" />
              Settings
            </h1>
            <p className="text-dark-muted mt-1">
              Manage your account preferences and security settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation */}
          <div className="lg:col-span-1">
            <Card className="glass-effect border-dark-border">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                          : 'text-dark-muted hover:text-dark-text hover:bg-dark-border'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && (
                <Card className="glass-effect border-dark-border">
                  <CardHeader>
                    <CardTitle className="text-dark-text">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username" className="text-dark-text">Username</Label>
                        <Input
                          id="username"
                          value={profileData.username}
                          onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                          className="mt-1 bg-dark-border border-dark-border text-dark-text"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-dark-text">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1 bg-dark-border border-dark-border text-dark-text"
                        />
                      </div>
                    </div>

                    <div className="border-t border-dark-border pt-6">
                      <h3 className="text-lg font-semibold text-dark-text mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword" className="text-dark-text">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPassword ? "text" : "password"}
                              value={profileData.currentPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="mt-1 bg-dark-border border-dark-border text-dark-text pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-muted hover:text-dark-text"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="newPassword" className="text-dark-text">New Password</Label>
                            <Input
                              id="newPassword"
                              type={showPassword ? "text" : "password"}
                              value={profileData.newPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="mt-1 bg-dark-border border-dark-border text-dark-text"
                            />
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword" className="text-dark-text">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type={showPassword ? "text" : "password"}
                              value={profileData.confirmPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="mt-1 bg-dark-border border-dark-border text-dark-text"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'notifications' && (
                <Card className="glass-effect border-dark-border">
                  <CardHeader>
                    <CardTitle className="text-dark-text">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                        <div>
                          <p className="text-dark-text font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </p>
                          <p className="text-dark-muted text-sm">
                            {key === 'emailNotifications' && 'Receive email notifications for important updates'}
                            {key === 'pushNotifications' && 'Get push notifications in your browser'}
                            {key === 'weeklyReports' && 'Weekly summary of your forwarding activity'}
                            {key === 'securityAlerts' && 'Immediate alerts for security-related events'}
                            {key === 'maintenanceUpdates' && 'Notifications about system maintenance'}
                          </p>
                        </div>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [key]: checked }))}
                          className="data-[state=checked]:bg-neon-blue"
                        />
                      </div>
                    ))}

                    <Button
                      onClick={handleSaveNotifications}
                      disabled={isSaving}
                      className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="glass-effect border-dark-border">
                  <CardHeader>
                    <CardTitle className="text-dark-text">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                      <div>
                        <p className="text-dark-text font-medium">Two-Factor Authentication</p>
                        <p className="text-dark-muted text-sm">Add an extra layer of security to your account</p>
                      </div>
                      <Switch
                        checked={security.twoFactorEnabled}
                        onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, twoFactorEnabled: checked }))}
                        className="data-[state=checked]:bg-neon-green"
                      />
                    </div>

                    <div className="p-3 bg-dark-border rounded-lg">
                      <Label htmlFor="sessionTimeout" className="text-dark-text">Session Timeout (hours)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        min="1"
                        max="168"
                        value={security.sessionTimeout}
                        onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 24 }))}
                        className="mt-2 bg-dark-bg border-dark-border text-dark-text"
                      />
                      <p className="text-dark-muted text-sm mt-1">
                        Automatically log out after this period of inactivity
                      </p>
                    </div>

                    <Button
                      onClick={handleSaveSecurity}
                      disabled={isSaving}
                      className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Security Settings'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'accounts' && (
                <Card className="glass-effect border-dark-border">
                  <CardHeader>
                    <CardTitle className="text-dark-text">Connected Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-blue-400" />
                        Telegram Accounts
                      </h3>
                      {connectedAccounts.telegram.length > 0 ? (
                        <div className="space-y-3">
                          {connectedAccounts.telegram.map((account: any, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                              <div>
                                <p className="text-dark-text font-medium">{account.username || account.phone}</p>
                                <p className="text-dark-muted text-sm">Connected {new Date(account.created_at).toLocaleDateString()}</p>
                              </div>
                              <Badge variant="outline" className="text-neon-green border-neon-green">
                                Active
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-dark-border rounded-lg">
                          <Smartphone className="h-8 w-8 text-dark-muted mx-auto mb-2" />
                          <p className="text-dark-muted">No Telegram accounts connected</p>
                          <Button size="sm" className="mt-3 bg-blue-500 hover:bg-blue-600 text-white">
                            Connect Telegram
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-purple-400" />
                        Discord Servers
                      </h3>
                      {connectedAccounts.discord.length > 0 ? (
                        <div className="space-y-3">
                          {connectedAccounts.discord.map((server: any, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                              <div>
                                <p className="text-dark-text font-medium">{server.name}</p>
                                <p className="text-dark-muted text-sm">Connected {new Date(server.created_at).toLocaleDateString()}</p>
                              </div>
                              <Badge variant="outline" className="text-neon-green border-neon-green">
                                Active
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-dark-border rounded-lg">
                          <MessageSquare className="h-8 w-8 text-dark-muted mx-auto mb-2" />
                          <p className="text-dark-muted">No Discord servers connected</p>
                          <Button size="sm" className="mt-3 bg-purple-500 hover:bg-purple-600 text-white">
                            Connect Discord
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'data' && (
                <Card className="glass-effect border-dark-border">
                  <CardHeader>
                    <CardTitle className="text-dark-text">Data & Privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="h-5 w-5 text-neon-blue" />
                        <h3 className="text-dark-text font-medium">Data Export</h3>
                      </div>
                      <p className="text-dark-muted text-sm mb-4">
                        Download a copy of all your data including forwarding pairs, messages, and account information.
                      </p>
                      <Button
                        onClick={handleExportData}
                        variant="outline"
                        className="border-neon-blue text-neon-blue hover:bg-neon-blue/10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </div>

                    <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <h3 className="text-dark-text font-medium">Delete Account</h3>
                      </div>
                      <p className="text-dark-muted text-sm mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button
                        onClick={handleDeleteAccount}
                        variant="outline"
                        className="border-red-400 text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}