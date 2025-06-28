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
  Smartphone, 
  Plus, 
  Trash2, 
  Key,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Users,
  Settings,
  Wifi,
  WifiOff,
  Shield,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/apiService';

interface TelegramAccount {
  id: number;
  phone: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  session_status: string;
  last_seen: string;
  created_at: string;
}

export default function TelegramPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionString, setSessionString] = useState('');

  const planLimits = {
    free: 1,
    pro: 3,
    elite: 10
  };

  const currentLimit = planLimits[user?.plan as keyof typeof planLimits] || planLimits.free;
  const canAddMore = accounts.length < currentLimit;

  useEffect(() => {
    loadTelegramAccounts();
  }, []);

  const loadTelegramAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get('/telegram/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load Telegram accounts:', error);
    }
    setIsLoading(false);
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    try {
      await apiService.post('/telegram/send-otp', { phone: phoneNumber });
      setIsVerifying(true);
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send verification code');
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.post('/telegram/verify-otp', {
        phone: phoneNumber,
        code: verificationCode
      });
      
      if (response.data.session_string) {
        setSessionString(response.data.session_string);
        await loadTelegramAccounts();
        setShowAddForm(false);
        setPhoneNumber('');
        setVerificationCode('');
        setIsVerifying(false);
        toast.success('Telegram account connected successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to verify code');
    }
    setIsLoading(false);
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Are you sure you want to remove this Telegram account?')) return;

    try {
      await apiService.delete(`/telegram/accounts/${accountId}`);
      await loadTelegramAccounts();
      toast.success('Telegram account removed successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove account');
    }
  };

  const handleToggleAccount = async (accountId: number, isActive: boolean) => {
    try {
      await apiService.patch(`/telegram/accounts/${accountId}`, {
        is_active: !isActive
      });
      await loadTelegramAccounts();
      toast.success(`Account ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update account');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-neon-green border-neon-green/30 bg-neon-green/10';
      case 'connecting': return 'text-neon-orange border-neon-orange/30 bg-neon-orange/10';
      case 'error': return 'text-red-400 border-red-400/30 bg-red-400/10';
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
              <Smartphone className="h-8 w-8 text-blue-400" />
              Telegram Accounts
            </h1>
            <p className="text-dark-muted mt-1">
              Manage your connected Telegram accounts for message forwarding
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {accounts.length} / {currentLimit} accounts
            </Badge>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={!canAddMore}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Add Account Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="glass-effect border-blue-400/30 bg-blue-400/5">
                <CardHeader>
                  <CardTitle className="text-dark-text flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-400" />
                    Connect Telegram Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isVerifying ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="phone" className="text-dark-text">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 bg-dark-border border-dark-border text-dark-text"
                        />
                        <p className="text-dark-muted text-sm mt-1">
                          Enter your phone number with country code
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleSendOTP}
                          disabled={!phoneNumber || isLoading}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {isLoading ? 'Sending...' : 'Send Verification Code'}
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
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="code" className="text-dark-text">Verification Code</Label>
                        <Input
                          id="code"
                          type="text"
                          placeholder="12345"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="mt-1 bg-dark-border border-dark-border text-dark-text"
                        />
                        <p className="text-dark-muted text-sm mt-1">
                          Enter the verification code sent to {phoneNumber}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleVerifyOTP}
                          disabled={!verificationCode || isLoading}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {isLoading ? 'Verifying...' : 'Verify & Connect'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsVerifying(false);
                            setVerificationCode('');
                          }}
                          className="border-dark-border hover:border-neon-orange hover:text-neon-orange"
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accounts List */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : accounts.length === 0 ? (
            <Card className="glass-effect border-dark-border">
              <CardContent className="text-center py-12">
                <Smartphone className="h-12 w-12 text-dark-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text mb-2">No Telegram accounts connected</h3>
                <p className="text-dark-muted mb-6">
                  Connect your first Telegram account to start forwarding messages
                </p>
                {canAddMore && (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Telegram
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {accounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-effect border-dark-border hover:border-blue-400/50 transition-all duration-300 group">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-dark-text font-medium">
                              {account.first_name} {account.last_name}
                            </h3>
                            <p className="text-dark-muted text-sm">{account.username ? `@${account.username}` : account.phone}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getStatusColor(account.session_status)}`}>
                            {account.session_status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Phone</span>
                          <span className="text-dark-text text-sm">{account.phone}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Status</span>
                          <div className="flex items-center gap-2">
                            {account.is_active ? (
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
                        
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Last Seen</span>
                          <span className="text-dark-text text-sm">
                            {new Date(account.last_seen).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-dark-muted text-sm">Connected</span>
                          <span className="text-dark-text text-sm">
                            {new Date(account.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAccount(account.id, account.is_active)}
                          className={`flex-1 ${account.is_active 
                            ? 'border-red-400/30 text-red-400 hover:bg-red-400/10' 
                            : 'border-neon-green/30 text-neon-green hover:bg-neon-green/10'
                          }`}
                        >
                          {account.is_active ? (
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
                          onClick={() => handleDeleteAccount(account.id)}
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
                  <p className="text-dark-text font-medium">Account Limit Reached</p>
                  <p className="text-dark-muted text-sm">
                    Upgrade to {user?.plan === 'free' ? 'Pro' : 'Elite'} plan to connect more Telegram accounts
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
                <h4 className="text-dark-text font-medium mb-3">Security & Privacy</h4>
                <ul className="text-dark-muted text-sm space-y-2">
                  <li>• Your session data is encrypted and stored securely</li>
                  <li>• We never store your passwords or sensitive data</li>
                  <li>• You can disconnect accounts at any time</li>
                  <li>• All forwarding respects Telegram's rate limits</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-dark-text font-medium mb-3">Account Management</h4>
                <ul className="text-dark-muted text-sm space-y-2">
                  <li>• Each account can be used in multiple forwarding pairs</li>
                  <li>• Inactive accounts won't participate in forwarding</li>
                  <li>• Session health is monitored automatically</li>
                  <li>• Reconnection happens automatically when needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}