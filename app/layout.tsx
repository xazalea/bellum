import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { OceanCreatures3D } from '@/components/OceanCreatures3D';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
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
  themeColor: '#0B1120',
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
        <div className="ocean-atmosphere" />
        <div className="ocean-vignette" />
        <div className="ocean-grid" />
        <OceanCreatures3D />
        <div className="relative z-10 w-full flex-1 flex flex-col">
          <SiteNav />
          <div className="flex-1">
            {children}
          </div>
          <SiteFooter />
        </div>
        <ClientInit />
      </body>
    </html>
  );
}
