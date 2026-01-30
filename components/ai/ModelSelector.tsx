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
        setSupports(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load supports:', err);
        setLoading(false);
      });
  }, []);

  const currentSiteModels = supports.find((s) => s.site === selectedSite)?.models || [];

  return (
    <Card className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-nacho-text mb-2">
          Provider
        </label>
        <select
          value={selectedSite}
          onChange={(e) => onSiteChange(e.target.value)}
          className="bellum-input w-full px-3 py-2 rounded-lg bg-nacho-bg border border-nacho-border text-nacho-text focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
        <label className="block text-sm font-medium text-nacho-text mb-2">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="bellum-input w-full px-3 py-2 rounded-lg bg-nacho-bg border border-nacho-border text-nacho-text focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

      <div className="text-xs text-nacho-text-secondary pt-2 border-t border-nacho-border">
        <p className="mb-1">
          <span className="font-semibold">Provider:</span> {selectedSite}
        </p>
        <p>
          <span className="font-semibold">Model:</span> {selectedModel}
        </p>
      </div>
    </Card>
  );
}
