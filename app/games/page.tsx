'use client';

import { GameGrid } from '@/components/game/game-grid';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Gamepad2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { GameFilters } from '@/lib/types/games';

export default function GamesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');

  const filters = useMemo<GameFilters>(() => ({
    search: searchTerm || undefined,
    category: category !== 'all' ? category : undefined,
    type: type !== 'all' ? (type as GameFilters['type']) : undefined,
  }), [searchTerm, category, type]);

  return (
    <div className="py-8">
      <div className="container-max">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Gamepad2 className="h-3.5 w-3.5" />
            Game Library
          </div>
          <h1 className="text-3xl font-bold">Browse & Play Instantly</h1>
          <p className="text-muted-foreground mt-1">
            HTML5, Android, and Windows apps all in one place. Click any game to launch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8 sticky top-14 z-40 bg-background/80 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b sm:border-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="html5">HTML5</SelectItem>
              <SelectItem value="action">Action</SelectItem>
              <SelectItem value="arcade">Arcade</SelectItem>
              <SelectItem value="puzzle">Puzzle</SelectItem>
              <SelectItem value="strategy">Strategy</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="html5">HTML5</SelectItem>
              <SelectItem value="apk">APK</SelectItem>
              <SelectItem value="exe">EXE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <GameGrid filters={filters} />
      </div>
    </div>
  );
}
