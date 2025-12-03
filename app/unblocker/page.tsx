import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nacho Unblocker',
  description: 'Access the web freely with Nacho Unblocker.',
};

export default function UnblockerPage() {
  return (
    <div className="fixed inset-0 bg-black z-50">
      <iframe 
        src="/unblocker/index.html"
        className="w-full h-full border-0"
        allowFullScreen
        title="Nacho Unblocker"
      />
    </div>
  );
}
