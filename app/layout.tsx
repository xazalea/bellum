import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { cn } from '@/lib/utils';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'challenger deep. - explore the depths.',
  description: 'High-performance distributed computing. Secure. Private. Deep.',
  keywords: ['challenger deep', 'distributed computing', 'privacy', 'wasm', 'webgpu'],
  icons: {
    icon: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F8FAFC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        {/* Inter Font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        {/* Model Viewer Script */}
        <Script 
          type="module" 
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" 
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen w-full flex flex-col font-sans antialiased overflow-x-hidden bg-nacho-bg text-nacho-primary selection:bg-nacho-accent selection:text-white">
        {children}
        <ClientInit />
      </body>
    </html>
  );
}
