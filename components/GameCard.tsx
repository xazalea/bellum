import React from 'react';
import { Play, Settings, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GameCardProps {
  id: string;
  name: string;
  type: string;
  onPlay: () => void;
  onDelete?: () => void;
  className?: string;
}

export function GameCard({ id, name, type, onPlay, onDelete, className }: GameCardProps) {
  return (
    <div className={twMerge(
      "group relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300",
      "bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-blue-900/10",
      className
    )}>
      {/* Icon Placeholder */}
      <div className="w-16 h-16 mb-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
        {name.charAt(0).toUpperCase()}
      </div>

      <h3 className="text-lg font-semibold text-white mb-1 text-center truncate w-full">{name}</h3>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">{type}</p>

      <div className="flex gap-2 w-full">
        <button 
          onClick={onPlay}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white text-slate-900 font-medium hover:bg-blue-50 transition-colors"
        >
          <Play size={16} className="fill-current" />
          Play
        </button>
        {onDelete && (
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            >
                <Trash2 size={16} />
            </button>
        )}
      </div>
    </div>
  );
}
