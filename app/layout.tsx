import type { Metadata } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { NachoCursor } from '@/components/NachoCursor';
import { SeaLifeBackground } from '@/components/SeaLifeBackground';
import { cn } from '@/lib/utils';

const fontPixel = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

const fontRetro = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-retro',
});

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
    <html lang="en" className={cn(fontPixel.variable, fontRetro.variable, "dark")}>
      <head>
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-screen w-full flex flex-col font-retro antialiased overflow-x-hidden selection:bg-nacho-primary selection:text-nacho-bg">
        <SeaLifeBackground />
        <NachoCursor />
        {children}
        <ClientInit />
      </body>
    </html>
  );
}
