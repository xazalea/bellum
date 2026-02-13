import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AppHeader } from '@/components/shell/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

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
  themeColor: '#0a1118',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-screen w-full bg-ocean-bg text-ocean-primary font-sans antialiased">
        <div className="flex flex-col min-h-screen w-full">
          <AppHeader />
          <main className="flex-grow pt-16">{children}</main>
          <SiteFooter />
        </div>
        <ClientInit />
      </body>
    </html>
  );
}
