import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { NachoCursor } from '@/components/NachoCursor';
import { SeaLifeBackground } from '@/components/SeaLifeBackground';
import { PixelOverlay } from '@/components/PixelOverlay';
import { DynamicIsland } from '@/components/DynamicIsland';
import { DiscordButton } from '@/components/DiscordButton';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'challenger deep. - explore the depths.',
  description: 'A pixelated journey into distributed computing. Secure. Private. Deep.',
  keywords: ['challenger deep', 'pixel art', 'distributed computing', 'privacy'],
  icons: {
    icon: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0B0F1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        {/* Pixel Fonts */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen w-full flex flex-col font-retro antialiased overflow-x-hidden selection:bg-nacho-primary selection:text-nacho-bg">
        <SeaLifeBackground />
        <NachoCursor />
        <DynamicIsland />
        <PixelOverlay />
        <DiscordButton />
        {children}
        <ClientInit />
      </body>
    </html>
  );
}
