import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Nacho - Universal Runtime Platform',
  description: 'Run Windows and Android apps in your browser with local storage and WebGPU acceleration.',
  keywords: ['nacho', 'webgpu', 'wasm', 'android', 'windows', 'runtime', 'emulation'],
  authors: [{ name: 'nacho' }],
  icons: {
    icon: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
  openGraph: {
    title: 'Nacho - Universal Runtime Platform',
    description: 'Run Windows and Android apps in your browser with local storage and WebGPU acceleration.',
    type: 'website',
    images: [{ url: '/icon' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#303446',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Performance hints */}
        <link rel="prefetch" href="/v86/v86.wasm" crossOrigin="anonymous" />
      </head>
      {/* Theme + background are defined in globals.css (Catppuccin Frappé). */}
      <body className="min-h-screen">
        <AppShell>
          {children}
        </AppShell>
        <ClientInit />
      </body>
    </html>
  );
}
