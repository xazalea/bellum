import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Nacho - Universal Runtime Platform',
  description: 'Run Windows and Android apps in your browser with local storage and WebGPU acceleration.',
  keywords: ['nacho', 'webgpu', 'wasm', 'android', 'windows', 'runtime', 'emulation'],
  authors: [{ name: 'nacho' }],
  openGraph: {
    title: 'Nacho - Universal Runtime Platform',
    description: 'Run Windows and Android apps in your browser with local storage and WebGPU acceleration.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020408',
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
        <link rel="preconnect" href="https://github.com" />
        <link rel="dns-prefetch" href="https://github.com" />

        {/* Firebase SDK */}
        <Script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js" strategy="beforeInteractive" />
        <Script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js" strategy="beforeInteractive" />

        {/* Pyodide for Python execution */}
        <Script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js" strategy="afterInteractive" />

        {/* Performance hints */}
        <link rel="prefetch" href="/v86/v86.wasm" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#020408] text-white min-h-screen">
        <AppShell>
          {children}
        </AppShell>
        <ClientInit />
      </body>
    </html>
  );
}
