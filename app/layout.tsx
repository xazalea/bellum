import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';

export const metadata: Metadata = {
  title: 'nacho. - Universal Compiler Platform',
  description: 'Transform native binaries into web apps. Run Roblox, Fortnite, and Android apps in your browser with zero lag.',
  keywords: ['compiler', 'emulator', 'wasm', 'android', 'windows', 'gaming', 'nacho'],
  authors: [{ name: 'nacho.' }],
  openGraph: {
    title: 'nacho. - Universal Compiler Platform',
    description: 'Transform native binaries into web apps. Run Roblox, Fortnite, and Android apps in your browser.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
};

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center px-6 z-50">
      <Link href="/" className="text-xl font-bold tracking-tighter mr-8">
        nacho<span className="text-blue-500">.</span>
      </Link>
      <div className="flex gap-6 text-sm font-medium text-gray-400">
        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        <Link href="/unblocker" className="hover:text-white transition-colors">Unblocker</Link>
        <Link href="/games" className="hover:text-white transition-colors">Games</Link>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://github.com" />
        <link rel="dns-prefetch" href="https://github.com" />
        
        {/* Puter.js for backend file storage */}
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
        
        {/* Pyodide for Python execution */}
        <Script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js" strategy="afterInteractive" />
        
        {/* Performance hints */}
        <link rel="preload" as="fetch" href="/v86/v86.wasm" crossOrigin="anonymous" />
      </head>
      <body className="bg-black text-white min-h-screen">
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
        <ClientInit />
      </body>
    </html>
  );
}
