'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { useState, useCallback } from 'react';
import { Palette, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemePanel } from '@/components/theme/theme-panel';

export function ThemeSwitcher() {
  const { colorMode, toggleColorMode } = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggleColorMode}
          title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle color mode"
        >
          {colorMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={openPanel}
          title="Change theme"
          aria-label="Open theme panel"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </div>

      <ThemePanel open={panelOpen} onClose={closePanel} />
    </>
  );
}
