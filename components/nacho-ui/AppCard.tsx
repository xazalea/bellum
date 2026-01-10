import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { MoreVertical } from 'lucide-react';

export function AppCard() {
  return (
    <Card className="relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-nacho-subtext/20 to-nacho-subtext/5 backdrop-blur-sm border border-white/5" />
        <button className="text-nacho-subtext hover:text-white transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>
      
      <h3 className="text-lg font-bold text-white mb-2 font-display">Nacho App Card</h3>
      <p className="text-sm text-nacho-subtext leading-relaxed mb-6">
        Optimized for toolbars and dashboard widgets, the App Card features a primary-colored top accent.
      </p>
      
      <Button variant="secondary" className="w-full uppercase text-xs tracking-wider font-bold py-3 hover:bg-nacho-card-hover hover:border-nacho-border-strong">
        Open Workspace
      </Button>
    </Card>
  );
}

