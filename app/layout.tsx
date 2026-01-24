import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AppHeader } from '@/components/shell/AppHeader';

export const metadata: Metadata = {
  title: 'Bellum',
  description: 'Run Android, Windows, games, and apps directly in your browser.',
  keywords: ['bellum', 'android in browser', 'windows in browser', 'html games', 'cloud storage'],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen w-full bg-nacho-bg text-nacho-primary font-sans antialiased">
        <div className="min-h-screen w-full">
          <AppHeader />
          <div className="pt-16">{children}</div>
        </div>
        <ClientInit />
      </body>
    </html>
  );
}
