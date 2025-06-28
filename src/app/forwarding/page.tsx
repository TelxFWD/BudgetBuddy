'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { fetchForwardingPairs, createForwardingPair, updateForwardingPair, deleteForwardingPair } from '@/store/slices/forwardingSlice';
import DashboardLayout from '@/components/DashboardLayout';
import { ForwardingPairBuilder } from '@/components/ForwardingPairBuilder';
import { BulkOperations } from '@/components/BulkOperations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function ForwardingPage() {
  const dispatch = useDispatch();
  const { pairs, isLoading } = useSelector((state: RootState) => state.forwarding);
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedPairs, setSelectedPairs] = useState<number[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPair, setEditingPair] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchForwardingPairs() as any);
  }, [dispatch]);

  const filteredPairs = pairs?.filter(pair => {
    const matchesSearch = !searchTerm || 
      pair.source_chat_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.destination_chat_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && pair.is_active) ||
      (filterStatus === 'inactive' && !pair.is_active);
    
    return matchesSearch && matchesFilter;
  }) || [];

  const handleTogglePair = async (pairId: number, isActive: boolean) => {
    try {
      await dispatch(updateForwardingPair({ 
        id: pairId, 
        data: { is_active: !isActive } 
      }) as any).unwrap();
      toast.success(`Pair ${!isActive ? 'activated' : 'paused'} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pair');
    }
  };

  const handleDeletePair = async (pairId: number) => {
    if (!confirm('Are you sure you want to delete this forwarding pair?')) return;
    
    try {
      await dispatch(deleteForwardingPair(pairId) as any).unwrap();
      toast.success('Pair deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete pair');
    }
  };

  const getStatusColor = (isActive: boolean, lastForwarded?: string) => {
    if (!isActive) return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
    if (lastForwarded) return 'text-neon-green border-neon-green/30 bg-neon-green/10';
    return 'text-neon-orange border-neon-orange/30 bg-neon-orange/10';
  };

  const planLimits = {
    free: 2,
    pro: 10,
    elite: 50
  };

  const currentLimit = planLimits[user?.plan as keyof typeof planLimits] || planLimits.free;
  const canCreateMore = (pairs?.length || 0) < currentLimit;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <Activity className="h-8 w-8 text-neon-blue" />
              Forwarding Pairs
            </h1>
            <p className="text-dark-muted mt-1">
              Manage your message forwarding configurations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-neon-blue border-neon-blue">
              {pairs?.length || 0} / {currentLimit} pairs
            </Badge>
            <Button
              onClick={() => setShowBuilder(true)}
              disabled={!canCreateMore}
              className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Pair
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-3 h-4 w-4 text-dark-muted" />
              <input
                type="text"
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 bg-dark-border border border-dark-border rounded-lg text-dark-text placeholder:text-dark-muted focus:border-neon-blue focus:outline-none"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-dark-border border border-dark-border rounded-lg text-dark-text focus:border-neon-blue focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {selectedPairs.length > 0 && (
            <BulkOperations 
              selectedPairs={selectedPairs}
              onClearSelection={() => setSelectedPairs([])}
            />
          )}
        </div>

        {/* Pairs Grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
            </div>
          ) : filteredPairs.length === 0 ? (
            <Card className="glass-effect border-dark-border">
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 text-dark-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text mb-2">
                  {pairs?.length === 0 ? 'No forwarding pairs yet' : 'No pairs match your filters'}
                </h3>
                <p className="text-dark-muted mb-6">
                  {pairs?.length === 0 
                    ? 'Create your first forwarding pair to start forwarding messages'
                    : 'Try adjusting your search terms or filters'
                  }
                </p>
                {pairs?.length === 0 && canCreateMore && (
                  <Button
                    onClick={() => setShowBuilder(true)}
                    className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Pair
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPairs.map((pair, index) => (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-effect border-dark-border hover:border-neon-blue/50 transition-all duration-300 group">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPairs.includes(pair.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPairs(prev => [...prev, pair.id]);
                              } else {
                                setSelectedPairs(prev => prev.filter(id => id !== pair.id));
                              }
                            }}
                            className="rounded border-dark-border"
                          />
                          <Badge className={`text-xs ${getStatusColor(pair.is_active, pair.last_forwarded)}`}>
                            {pair.is_active ? (pair.last_forwarded ? 'Active' : 'Waiting') : 'Paused'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pair.is_active}
                            onCheckedChange={() => handleTogglePair(pair.id, pair.is_active)}
                            className="data-[state=checked]:bg-neon-green"
                          />
                          <button className="text-dark-muted hover:text-dark-text opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-dark-muted uppercase tracking-wide">Source</p>
                          <p className="text-sm text-dark-text capitalize flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${pair.source_platform === 'telegram' ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                            {pair.source_platform} • {pair.source_chat_id}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center">
                            <Activity className="h-4 w-4 text-neon-green" />
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-dark-muted uppercase tracking-wide">Destination</p>
                          <p className="text-sm text-dark-text capitalize flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${pair.destination_platform === 'telegram' ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                            {pair.destination_platform} • {pair.destination_chat_id}
                          </p>
                        </div>
                      </div>
                      
                      {pair.delay_seconds > 0 && (
                        <div className="flex items-center gap-2 text-xs text-dark-muted">
                          <Clock className="h-3 w-3" />
                          {pair.delay_seconds}s delay
                        </div>
                      )}
                      
                      {pair.last_forwarded && (
                        <div className="text-xs text-dark-muted">
                          Last: {new Date(pair.last_forwarded).toLocaleString()}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPair(pair)}
                          className="flex-1 border-dark-border hover:border-neon-blue"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePair(pair.id)}
                          className="flex-1 border-red-400/30 text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
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
        {!canCreateMore && (
          <Card className="glass-effect border-neon-orange/30 bg-neon-orange/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-neon-orange" />
                <div>
                  <p className="text-dark-text font-medium">Plan Limit Reached</p>
                  <p className="text-dark-muted text-sm">
                    Upgrade to {user?.plan === 'free' ? 'Pro' : 'Elite'} plan to create more forwarding pairs
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

        {/* Forwarding Pair Builder Modal */}
        {(showBuilder || editingPair) && (
          <ForwardingPairBuilder
            pair={editingPair}
            onClose={() => {
              setShowBuilder(false);
              setEditingPair(null);
            }}
            onSuccess={() => {
              setShowBuilder(false);
              setEditingPair(null);
              dispatch(fetchForwardingPairs() as any);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}