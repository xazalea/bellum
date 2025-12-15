import React from 'react';

export function AdCard() {
  return (
    <div className="bellum-card border-2 border-white/10 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/45 font-bold">Sponsored</div>
        <div className="text-[10px] text-white/35">ad</div>
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-3 flex justify-center">
          <iframe
            title="Sponsored"
            src="/ad/frame"
            className="rounded-xl border-0"
            style={{ width: 160, height: 300 }}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </div>
  );
}

