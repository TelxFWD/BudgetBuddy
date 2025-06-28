'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createForwardingPair, updateForwardingPair } from '@/store/slices/forwardingSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  X, 
  ArrowRight, 
  Clock, 
  Volume2, 
  Copy,
  Smartphone,
  MessageSquare,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ForwardingPair {
  id: number;
  source_platform: string;
  source_account_id: number;
  source_chat_id: string;
  destination_platform: string;
  destination_account_id: number;
  destination_chat_id: string;
  delay_seconds: number;
  is_active: boolean;
  silent_mode: boolean;
  copy_mode: boolean;
}

interface ForwardingPairBuilderProps {
  pair?: ForwardingPair | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ForwardingPairBuilder({ pair, onClose, onSuccess }: ForwardingPairBuilderProps) {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    source_platform: 'telegram',
    source_account_id: 1,
    source_chat_id: '',
    destination_platform: 'discord',
    destination_account_id: 1,
    destination_chat_id: '',
    delay_seconds: 0,
    silent_mode: false,
    copy_mode: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pair) {
      setFormData({
        source_platform: pair.source_platform,
        source_account_id: pair.source_account_id,
        source_chat_id: pair.source_chat_id,
        destination_platform: pair.destination_platform,
        destination_account_id: pair.destination_account_id,
        destination_chat_id: pair.destination_chat_id,
        delay_seconds: pair.delay_seconds,
        silent_mode: pair.silent_mode,
        copy_mode: pair.copy_mode
      });
    }
  }, [pair]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (pair) {
        await dispatch(updateForwardingPair({
          pairId: pair.id,
          updates: formData
        }) as any).unwrap();
        toast.success('Forwarding pair updated successfully');
      } else {
        await dispatch(createForwardingPair(formData) as any).unwrap();
        toast.success('Forwarding pair created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save forwarding pair');
    }
    setIsSubmitting(false);
  };

  const platformOptions = [
    { value: 'telegram', label: 'Telegram', icon: Smartphone, color: 'bg-blue-500' },
    { value: 'discord', label: 'Discord', icon: MessageSquare, color: 'bg-purple-500' }
  ];

  const getPlatformIcon = (platform: string) => {
    const option = platformOptions.find(p => p.value === platform);
    return option ? option.icon : Smartphone;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl"
      >
        <Card className="glass-effect border-dark-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-dark-text flex items-center gap-2">
                <Plus className="h-5 w-5 text-neon-blue" />
                {pair ? 'Edit Forwarding Pair' : 'Create Forwarding Pair'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-dark-muted hover:text-dark-text"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Visual Flow */}
              <div className="flex items-center justify-between p-4 bg-dark-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${formData.source_platform === 'telegram' ? 'bg-blue-500' : 'bg-purple-500'} flex items-center justify-center`}>
                    {React.createElement(getPlatformIcon(formData.source_platform), { className: "h-5 w-5 text-white" })}
                  </div>
                  <div>
                    <p className="text-dark-text font-medium capitalize">{formData.source_platform}</p>
                    <p className="text-dark-muted text-sm">{formData.source_chat_id || 'Source chat'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="h-6 w-6 text-neon-green" />
                  {formData.delay_seconds > 0 && (
                    <div className="flex items-center gap-1 text-neon-orange text-xs">
                      <Clock className="h-3 w-3" />
                      {formData.delay_seconds}s
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${formData.destination_platform === 'telegram' ? 'bg-blue-500' : 'bg-purple-500'} flex items-center justify-center`}>
                    {React.createElement(getPlatformIcon(formData.destination_platform), { className: "h-5 w-5 text-white" })}
                  </div>
                  <div>
                    <p className="text-dark-text font-medium capitalize">{formData.destination_platform}</p>
                    <p className="text-dark-muted text-sm">{formData.destination_chat_id || 'Destination chat'}</p>
                  </div>
                </div>
              </div>

              {/* Source Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-dark-text">Source Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="source_platform" className="text-dark-text">Platform</Label>
                    <select
                      id="source_platform"
                      value={formData.source_platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_platform: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-dark-border border border-dark-border rounded-lg text-dark-text focus:border-neon-blue focus:outline-none"
                    >
                      {platformOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="source_account_id" className="text-dark-text">Account ID</Label>
                    <Input
                      id="source_account_id"
                      type="number"
                      value={formData.source_account_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_account_id: parseInt(e.target.value) || 1 }))}
                      className="mt-1 bg-dark-border border-dark-border text-dark-text focus:border-neon-blue"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="source_chat_id" className="text-dark-text">Chat ID / Channel Username</Label>
                  <Input
                    id="source_chat_id"
                    value={formData.source_chat_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, source_chat_id: e.target.value }))}
                    placeholder="@channel_name or chat_id"
                    className="mt-1 bg-dark-border border-dark-border text-dark-text focus:border-neon-blue"
                    required
                  />
                </div>
              </div>

              {/* Destination Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-dark-text">Destination Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="destination_platform" className="text-dark-text">Platform</Label>
                    <select
                      id="destination_platform"
                      value={formData.destination_platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, destination_platform: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-dark-border border border-dark-border rounded-lg text-dark-text focus:border-neon-blue focus:outline-none"
                    >
                      {platformOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="destination_account_id" className="text-dark-text">Account ID</Label>
                    <Input
                      id="destination_account_id"
                      type="number"
                      value={formData.destination_account_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, destination_account_id: parseInt(e.target.value) || 1 }))}
                      className="mt-1 bg-dark-border border-dark-border text-dark-text focus:border-neon-blue"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="destination_chat_id" className="text-dark-text">Chat ID / Channel Username</Label>
                  <Input
                    id="destination_chat_id"
                    value={formData.destination_chat_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, destination_chat_id: e.target.value }))}
                    placeholder="@channel_name or chat_id"
                    className="mt-1 bg-dark-border border-dark-border text-dark-text focus:border-neon-blue"
                    required
                  />
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-dark-text">Advanced Options</h3>
                
                <div>
                  <Label htmlFor="delay_seconds" className="text-dark-text">Delay (seconds)</Label>
                  <Input
                    id="delay_seconds"
                    type="number"
                    min="0"
                    max="3600"
                    value={formData.delay_seconds}
                    onChange={(e) => setFormData(prev => ({ ...prev, delay_seconds: parseInt(e.target.value) || 0 }))}
                    className="mt-1 bg-dark-border border-dark-border text-dark-text focus:border-neon-blue"
                  />
                  <p className="text-dark-muted text-sm mt-1">
                    Add delay between receiving and forwarding messages
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-neon-orange" />
                    <div>
                      <p className="text-dark-text font-medium">Silent Mode</p>
                      <p className="text-dark-muted text-sm">Forward messages without notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.silent_mode}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, silent_mode: checked }))}
                    className="data-[state=checked]:bg-neon-orange"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Copy className="h-4 w-4 text-neon-purple" />
                    <div>
                      <p className="text-dark-text font-medium">Copy Mode</p>
                      <p className="text-dark-muted text-sm">Preserve original message formatting</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.copy_mode}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, copy_mode: checked }))}
                    className="data-[state=checked]:bg-neon-purple"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-dark-border hover:border-red-400 hover:text-red-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
                >
                  {isSubmitting ? 'Saving...' : pair ? 'Update Pair' : 'Create Pair'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}