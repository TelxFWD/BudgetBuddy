'use client';

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateForwardingPair, deleteForwardingPair } from '@/store/slices/forwardingSlice';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Trash2, 
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BulkOperationsProps {
  selectedPairs: number[];
  onClearSelection: () => void;
}

export function BulkOperations({ selectedPairs, onClearSelection }: BulkOperationsProps) {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    if (selectedPairs.length === 0) return;

    const confirmMessage = {
      pause: `Are you sure you want to pause ${selectedPairs.length} forwarding pairs?`,
      resume: `Are you sure you want to resume ${selectedPairs.length} forwarding pairs?`,
      delete: `Are you sure you want to delete ${selectedPairs.length} forwarding pairs? This action cannot be undone.`
    };

    if (!confirm(confirmMessage[action])) return;

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const pairId of selectedPairs) {
        try {
          if (action === 'delete') {
            await dispatch(deleteForwardingPair(pairId) as any).unwrap();
          } else {
            await dispatch(updateForwardingPair({
              pairId,
              updates: { is_active: action === 'resume' }
            }) as any).unwrap();
          }
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        const actionText = {
          pause: 'paused',
          resume: 'resumed',
          delete: 'deleted'
        };
        toast.success(`${successCount} pairs ${actionText[action]} successfully`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} pairs failed to process`);
      }

      onClearSelection();
    } catch (error) {
      toast.error('Failed to process bulk action');
    }

    setIsProcessing(false);
  };

  if (selectedPairs.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-dark-border rounded-lg border border-neon-blue/30">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-neon-blue" />
        <span className="text-dark-text text-sm font-medium">
          {selectedPairs.length} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkAction('resume')}
          disabled={isProcessing}
          className="border-neon-green/30 text-neon-green hover:bg-neon-green/10"
        >
          <Play className="h-3 w-3 mr-1" />
          Resume All
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkAction('pause')}
          disabled={isProcessing}
          className="border-neon-orange/30 text-neon-orange hover:bg-neon-orange/10"
        >
          <Pause className="h-3 w-3 mr-1" />
          Pause All
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkAction('delete')}
          disabled={isProcessing}
          className="border-red-400/30 text-red-400 hover:bg-red-400/10"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete All
        </Button>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        className="text-dark-muted hover:text-dark-text ml-auto"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}