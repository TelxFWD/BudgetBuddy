'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  X
} from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onPause,
  onResume,
  onDelete,
  onClear
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
      <span className="text-sm text-neon-blue font-medium">
        {selectedCount} selected
      </span>
      
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onResume}
          className="p-1.5 text-neon-green hover:bg-neon-green/20 rounded transition-colors"
          title="Resume selected pairs"
        >
          <Play className="w-3 h-3" />
        </button>
        
        <button
          onClick={onPause}
          className="p-1.5 text-neon-orange hover:bg-neon-orange/20 rounded transition-colors"
          title="Pause selected pairs"
        >
          <Pause className="w-3 h-3" />
        </button>
        
        <button
          onClick={onDelete}
          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
          title="Delete selected pairs"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        
        <div className="w-px h-4 bg-neon-blue/30 mx-1" />
        
        <button
          onClick={onClear}
          className="p-1.5 text-dark-muted hover:bg-dark-bg rounded transition-colors"
          title="Clear selection"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default BulkActions;