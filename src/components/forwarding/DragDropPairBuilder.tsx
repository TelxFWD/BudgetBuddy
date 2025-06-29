'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  Settings, 
  Smartphone, 
  MessageSquare,
  Clock,
  Volume2,
  Copy,
  Save,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/store';
import { toast } from 'react-hot-toast';

interface ForwardingPair {
  id: string;
  sourcePlatform: 'telegram' | 'discord';
  sourceAccount: string;
  sourceChannel: string;
  destinationPlatform: 'telegram' | 'discord';
  destinationAccount: string;
  destinationChannel: string;
  delay: number;
  silentMode: boolean;
  copyMode: boolean;
  isActive: boolean;
  order: number;
}

interface PairBuilderProps {
  onSave: (pairs: ForwardingPair[]) => Promise<void>;
  initialPairs?: ForwardingPair[];
}

export const DragDropPairBuilder: React.FC<PairBuilderProps> = ({ onSave, initialPairs = [] }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { telegramAccounts, discordAccounts } = useAppSelector((state) => state.forwarding);
  
  const [pairs, setPairs] = useState<ForwardingPair[]>(initialPairs);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Available accounts for selection
  const availableAccounts = {
    telegram: telegramAccounts || [],
    discord: discordAccounts || []
  };

  const createNewPair = (): ForwardingPair => ({
    id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourcePlatform: 'telegram',
    sourceAccount: '',
    sourceChannel: '',
    destinationPlatform: 'discord',
    destinationAccount: '',
    destinationChannel: '',
    delay: 0,
    silentMode: false,
    copyMode: false,
    isActive: true,
    order: pairs.length
  });

  const addNewPair = () => {
    const newPair = createNewPair();
    setPairs(prev => [...prev, newPair]);
    setSelectedPair(newPair.id);
    setIsBuilding(true);
  };

  const updatePair = (pairId: string, updates: Partial<ForwardingPair>) => {
    setPairs(prev => prev.map(pair => 
      pair.id === pairId ? { ...pair, ...updates } : pair
    ));
  };

  const deletePair = (pairId: string) => {
    setPairs(prev => prev.filter(pair => pair.id !== pairId));
    if (selectedPair === pairId) {
      setSelectedPair(null);
    }
  };

  const duplicatePair = (pairId: string) => {
    const originalPair = pairs.find(p => p.id === pairId);
    if (originalPair) {
      const newPair = {
        ...originalPair,
        id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order: pairs.length
      };
      setPairs(prev => [...prev, newPair]);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pairs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setPairs(updatedItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(pairs);
      toast.success('Forwarding pairs saved successfully!');
      setIsBuilding(false);
    } catch (error) {
      toast.error('Failed to save forwarding pairs');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const validatePair = (pair: ForwardingPair): boolean => {
    return !!(
      pair.sourceAccount && 
      pair.sourceChannel && 
      pair.destinationAccount && 
      pair.destinationChannel
    );
  };

  const selectedPairData = pairs.find(p => p.id === selectedPair);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Pair List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Forwarding Pairs
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={addNewPair}
                size="sm"
                className="bg-neon-green hover:bg-neon-green/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pair
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving || pairs.length === 0}
                size="sm"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="forwarding-pairs">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-dark-border/50' : ''
                    }`}
                  >
                    <AnimatePresence>
                      {pairs.map((pair, index) => (
                        <Draggable key={pair.id} draggableId={pair.id} index={index}>
                          {(provided, snapshot) => (
                            <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className={`bg-dark-card border rounded-lg p-4 cursor-pointer transition-all ${
                                selectedPair === pair.id
                                  ? 'border-neon-green shadow-lg'
                                  : 'border-dark-border hover:border-dark-muted'
                              } ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                              onClick={() => setSelectedPair(pair.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  {/* Source */}
                                  <div className="flex items-center gap-2">
                                    {pair.sourcePlatform === 'telegram' ? (
                                      <Smartphone className="h-4 w-4 text-blue-400" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4 text-purple-400" />
                                    )}
                                    <span className="text-sm font-medium">
                                      {pair.sourceChannel || 'No channel'}
                                    </span>
                                  </div>

                                  {/* Arrow */}
                                  <ArrowRight className="h-4 w-4 text-dark-muted" />

                                  {/* Destination */}
                                  <div className="flex items-center gap-2">
                                    {pair.destinationPlatform === 'telegram' ? (
                                      <Smartphone className="h-4 w-4 text-blue-400" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4 text-purple-400" />
                                    )}
                                    <span className="text-sm font-medium">
                                      {pair.destinationChannel || 'No channel'}
                                    </span>
                                  </div>

                                  {/* Status */}
                                  <Badge variant={validatePair(pair) ? 'default' : 'destructive'}>
                                    {validatePair(pair) ? 'Valid' : 'Incomplete'}
                                  </Badge>

                                  {/* Active indicator */}
                                  {pair.isActive && (
                                    <div className="h-2 w-2 bg-neon-green rounded-full"></div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicatePair(pair.id);
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePair(pair.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Configuration preview */}
                              {(pair.delay > 0 || pair.silentMode || pair.copyMode) && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-border">
                                  {pair.delay > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {pair.delay}s delay
                                    </Badge>
                                  )}
                                  {pair.silentMode && (
                                    <Badge variant="outline" className="text-xs">
                                      <Volume2 className="h-3 w-3 mr-1" />
                                      Silent
                                    </Badge>
                                  )}
                                  {pair.copyMode && (
                                    <Badge variant="outline" className="text-xs">
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy mode
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                    
                    {pairs.length === 0 && (
                      <div className="text-center py-8 text-dark-muted">
                        <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No forwarding pairs configured</p>
                        <p className="text-sm">Click "Add Pair" to get started</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPairData ? (
              <Tabs defaultValue="source" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="source">Source</TabsTrigger>
                  <TabsTrigger value="destination">Destination</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="source" className="space-y-4">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={selectedPairData.sourcePlatform}
                      onValueChange={(value: 'telegram' | 'discord') =>
                        updatePair(selectedPairData.id, { sourcePlatform: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-blue-400" />
                            Telegram
                          </div>
                        </SelectItem>
                        <SelectItem value="discord">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-purple-400" />
                            Discord
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Account</Label>
                    <Select
                      value={selectedPairData.sourceAccount}
                      onValueChange={(value) =>
                        updatePair(selectedPairData.id, { sourceAccount: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAccounts[selectedPairData.sourcePlatform].map((account: any) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {selectedPairData.sourcePlatform === 'telegram'
                              ? account.phone_number
                              : account.bot_name || account.discord_user_id
                            }
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Channel/Chat ID</Label>
                    <Input
                      value={selectedPairData.sourceChannel}
                      onChange={(e) =>
                        updatePair(selectedPairData.id, { sourceChannel: e.target.value })
                      }
                      placeholder={
                        selectedPairData.sourcePlatform === 'telegram'
                          ? "@channel_username or -100123456789"
                          : "channel_id or #channel-name"
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="destination" className="space-y-4">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={selectedPairData.destinationPlatform}
                      onValueChange={(value: 'telegram' | 'discord') =>
                        updatePair(selectedPairData.id, { destinationPlatform: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-blue-400" />
                            Telegram
                          </div>
                        </SelectItem>
                        <SelectItem value="discord">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-purple-400" />
                            Discord
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Account</Label>
                    <Select
                      value={selectedPairData.destinationAccount}
                      onValueChange={(value) =>
                        updatePair(selectedPairData.id, { destinationAccount: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAccounts[selectedPairData.destinationPlatform].map((account: any) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {selectedPairData.destinationPlatform === 'telegram'
                              ? account.phone_number
                              : account.bot_name || account.discord_user_id
                            }
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Channel/Chat ID</Label>
                    <Input
                      value={selectedPairData.destinationChannel}
                      onChange={(e) =>
                        updatePair(selectedPairData.id, { destinationChannel: e.target.value })
                      }
                      placeholder={
                        selectedPairData.destinationPlatform === 'telegram'
                          ? "@channel_username or -100123456789"
                          : "channel_id or #channel-name"
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <Label>Delay (seconds)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="3600"
                      value={selectedPairData.delay}
                      onChange={(e) =>
                        updatePair(selectedPairData.id, { delay: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={selectedPairData.isActive}
                      onCheckedChange={(checked) =>
                        updatePair(selectedPairData.id, { isActive: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Silent Mode</Label>
                    <Switch
                      checked={selectedPairData.silentMode}
                      onCheckedChange={(checked) =>
                        updatePair(selectedPairData.id, { silentMode: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Copy Mode</Label>
                    <Switch
                      checked={selectedPairData.copyMode}
                      onCheckedChange={(checked) =>
                        updatePair(selectedPairData.id, { copyMode: checked })
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-dark-muted">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a forwarding pair to configure</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};