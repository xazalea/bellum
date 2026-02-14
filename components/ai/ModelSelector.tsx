import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface SiteSupport {
  site: string;
  models: string[];
}

interface ModelSelectorProps {
  selectedSite: string;
  selectedModel: string;
  onSiteChange: (site: string) => void;
  onModelChange: (model: string) => void;
}

export function ModelSelector({
  selectedSite,
  selectedModel,
  onSiteChange,
  onModelChange,
}: ModelSelectorProps) {
  const [supports, setSupports] = useState<SiteSupport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/supports')
      .then((res) => res.json())
      .then((data) => {
        setSupports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load supports:', err);
        setSupports([]);
        setLoading(false);
      });
  }, []);

  const currentSiteModels = supports.find((s) => s.site === selectedSite)?.models || [];

  return (
    <Card className="p-4 space-y-3">
      <div>
        <label className="block font-pixel text-[8px] text-ocean-muted uppercase tracking-wider mb-2">
          Provider
        </label>
        <select
          value={selectedSite}
          onChange={(e) => onSiteChange(e.target.value)}
          className="ocean-input w-full"
          disabled={loading}
        >
          {loading ? (
            <option>Loading...</option>
          ) : (
            supports.map((support) => (
              <option key={support.site} value={support.site}>
                {support.site}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="block font-pixel text-[8px] text-ocean-muted uppercase tracking-wider mb-2">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="ocean-input w-full"
          disabled={loading || currentSiteModels.length === 0}
        >
          {currentSiteModels.length === 0 ? (
            <option>No models available</option>
          ) : (
            currentSiteModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="font-mono text-xs text-ocean-muted pt-2 border-t-2 border-ocean-border">
        <p>{selectedSite} · {selectedModel}</p>
      </div>
    </Card>
  );
}
