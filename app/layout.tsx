import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { SiteFooter } from '@/components/SiteFooter';
import DynamicIsland from '@/components/DynamicIsland';
import OceanCreatures from '@/components/OceanCreatures';

export const metadata: Metadata = {
  title: 'Challenger Deep',
  description: 'Explore the abyss. Run Android, Windows, games, and apps directly in your browser.',
  keywords: ['challenger deep', 'android in browser', 'windows in browser', 'html games', 'cloud storage', 'retro'],
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    shortcut: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020b18',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Share+Tech+Mono&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-screen w-full deep-ocean-bg text-ocean-primary font-mono">
        {/* Deep ocean background layers */}
        <div className="depth-layer depth-layer-1" />
        <div className="depth-layer depth-layer-2" />
        
        {/* Animated sea creatures */}
        <OceanCreatures />
        
        {/* Dynamic Island Navigation */}
        <DynamicIsland />
        
        {/* Main content */}
        <div className="relative flex flex-col min-h-screen w-full" style={{ zIndex: 2 }}>
          <main className="flex-grow pt-20">{children}</main>
          <SiteFooter />
        </div>
        
        <ClientInit />
      </body>
    </html>
  );
}
