'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Trash2, 
  Square, 
  CheckSquare, 
  RefreshCw,
  AlertTriangle,
  Download,
  Upload
} from 'lucide-react';
import { motion } from 'framer-motion';
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

interface ForwardingPair {
  id: number;
  source_platform: string;
  destination_platform: string;
  source_chat_id: string;
  destination_chat_id: string;
  is_active: boolean;
  delay_seconds: number;
  silent_mode: boolean;
  copy_mode: boolean;
}

interface BulkOperationsProps {
  pairs: ForwardingPair[];
  selectedPairs: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onBulkAction: (action: string, pairIds: number[]) => Promise<void>;
  isLoading: boolean;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  pairs,
  selectedPairs,
  onSelectionChange,
  onBulkAction,
  isLoading
}) => {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const allSelected = pairs.length > 0 && selectedPairs.length === pairs.length;
  const someSelected = selectedPairs.length > 0 && selectedPairs.length < pairs.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(pairs.map(pair => pair.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedPairs.length === 0) {
      toast.error('Please select at least one forwarding pair');
      return;
    }

    setActionInProgress(action);
    try {
      await onBulkAction(action, selectedPairs);
      
      const actionLabels = {
        pause: 'paused',
        resume: 'resumed',
        delete: 'deleted',
        restart: 'restarted'
      };
      
      toast.success(`${selectedPairs.length} pair(s) ${actionLabels[action as keyof typeof actionLabels]}`);
      
      // Clear selection after successful action
      if (action === 'delete') {
        onSelectionChange([]);
      }
    } catch (error) {
      toast.error(`Failed to ${action} selected pairs`);
      console.error(`Bulk ${action} error:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const getSelectedStats = () => {
    const selectedPairData = pairs.filter(pair => selectedPairs.includes(pair.id));
    const activePairs = selectedPairData.filter(pair => pair.is_active).length;
    const inactivePairs = selectedPairData.length - activePairs;
    
    return { activePairs, inactivePairs, total: selectedPairData.length };
  };

  const stats = getSelectedStats();

  const exportPairs = () => {
    const selectedPairData = pairs.filter(pair => selectedPairs.includes(pair.id));
    const exportData = selectedPairData.map(pair => ({
      source_platform: pair.source_platform,
      source_chat_id: pair.source_chat_id,
      destination_platform: pair.destination_platform,
      destination_chat_id: pair.destination_chat_id,
      delay_seconds: pair.delay_seconds,
      silent_mode: pair.silent_mode,
      copy_mode: pair.copy_mode,
      is_active: pair.is_active
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forwarding-pairs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Forwarding pairs exported successfully');
  };

  return (
    <motion.div 
      className="bg-dark-card border border-dark-border rounded-lg p-4 mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Selection Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              ref={(ref) => {
                if (ref) {
                  ref.indeterminate = someSelected;
                }
              }}
            />
            <span className="text-sm font-medium">
              {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All'}
            </span>
          </div>

          {selectedPairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <Badge variant="outline" className="text-neon-green border-neon-green">
                {selectedPairs.length} selected
              </Badge>
              
              {stats.total > 0 && (
                <div className="flex gap-1">
                  {stats.activePairs > 0 && (
                    <Badge variant="default" className="text-xs">
                      {stats.activePairs} active
                    </Badge>
                  )}
                  {stats.inactivePairs > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {stats.inactivePairs} inactive
                    </Badge>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedPairs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap items-center gap-2"
          >
            {/* Resume/Pause Actions */}
            {stats.inactivePairs > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('resume')}
                disabled={isLoading || actionInProgress === 'resume'}
                className="border-neon-green text-neon-green hover:bg-neon-green hover:text-black"
              >
                {actionInProgress === 'resume' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Resume ({stats.inactivePairs})
              </Button>
            )}

            {stats.activePairs > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('pause')}
                disabled={isLoading || actionInProgress === 'pause'}
                className="border-neon-orange text-neon-orange hover:bg-neon-orange hover:text-black"
              >
                {actionInProgress === 'pause' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4 mr-2" />
                )}
                Pause ({stats.activePairs})
              </Button>
            )}

            {/* Restart Action */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('restart')}
              disabled={isLoading || actionInProgress === 'restart'}
            >
              {actionInProgress === 'restart' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Restart
            </Button>

            {/* Export Action */}
            <Button
              size="sm"
              variant="outline"
              onClick={exportPairs}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            {/* Delete Action */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedPairs.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Confirm Bulk Delete
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedPairs.length} forwarding pair(s)? 
                    This action cannot be undone and will permanently remove:
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>{stats.activePairs} active pair(s)</li>
                      <li>{stats.inactivePairs} inactive pair(s)</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkAction('delete')}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {actionInProgress === 'delete' ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </div>

      {/* Quick Stats Bar */}
      {selectedPairs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-dark-border"
        >
          <div className="flex flex-wrap items-center gap-4 text-sm text-dark-muted">
            <span>Selected operations will affect:</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {pairs.filter(p => selectedPairs.includes(p.id) && p.source_platform === 'telegram').length} Telegram sources
              </Badge>
              <Badge variant="outline" className="text-xs">
                {pairs.filter(p => selectedPairs.includes(p.id) && p.destination_platform === 'discord').length} Discord destinations
              </Badge>
              <Badge variant="outline" className="text-xs">
                {pairs.filter(p => selectedPairs.includes(p.id) && p.delay_seconds > 0).length} with delays
              </Badge>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};