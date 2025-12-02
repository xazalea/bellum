'use client';

export default function UnblockerPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <iframe
        src="/unblocker/index.html"
        title="nacho unblocker"
        style={{ border: 'none', width: '100%', height: '100%' }}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
      />
    </div>
  );
}
