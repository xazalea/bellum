import React from 'react';
import { GameCard } from './GameCard';
import { Upload } from 'lucide-react';

interface GameGridProps {
  games: Array<{ id: string; name: string; type: string }>;
  onPlay: (id: string) => void;
  onUpload: () => void;
  onFileSelect: (files: FileList | null) => void;
}

export function GameGrid({ games, onPlay, onUpload, onFileSelect }: GameGridProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl mx-auto p-6">
      {/* Upload Card */}
      <div 
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/20 hover:border-blue-500 hover:bg-slate-900/40 transition-all duration-300 min-h-[240px]"
      >
        <input 
            type="file" 
            ref={inputRef} 
            className="hidden" 
            multiple 
            onChange={(e) => onFileSelect(e.target.files)}
        />
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <Upload size={24} className="text-slate-400 group-hover:text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-300 group-hover:text-white">Add Game</h3>
        <p className="text-sm text-slate-500 mt-2 text-center">Supports APK, EXE, ISO, WASM</p>
      </div>

      {games.map((game) => (
        <GameCard 
          key={game.id} 
          {...game} 
          onPlay={() => onPlay(game.id)} 
        />
      ))}
    </div>
  );
}
