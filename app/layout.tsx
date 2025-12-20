import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Performance hints */}
        <link rel="prefetch" href="/v86/v86.wasm" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen w-full flex flex-col bg-background-dark text-slate-300 font-body antialiased overflow-x-hidden selection:bg-primary selection:text-white">
        {children}
        <ClientInit />
      </body>
    </html>
  );
}
