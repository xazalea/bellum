import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';

export const metadata: Metadata = {
  title: 'Bellum - Ultra-Fast Web Emulator Platform',
  description: 'Run Android, Windows, Linux, and gaming consoles in your browser with zero-lag performance',
  keywords: ['emulator', 'virtual machine', 'web emulator', 'android emulator', 'windows emulator', 'gaming'],
  authors: [{ name: 'Bellum' }],
  openGraph: {
    title: 'Bellum - Ultra-Fast Web Emulator Platform',
    description: 'Run Android, Windows, Linux, and gaming consoles in your browser',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://js.puter.com" />
        <link rel="preconnect" href="https://github.com" />
        <link rel="dns-prefetch" href="https://js.puter.com" />
        <link rel="dns-prefetch" href="https://github.com" />
        
        {/* Puter.js - async load */}
        <script src="https://js.puter.com/v2/" async defer></script>
        
        {/* Pyodide for Python execution */}
        <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js" async defer></script>
        
        {/* Performance hints */}
        <link rel="preload" as="fetch" href="/v86/v86.wasm" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <ClientInit />
      </body>
    </html>
  );
}

