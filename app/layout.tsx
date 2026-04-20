import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GameProvider } from '@/components/providers/game-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: { default: 'Bellum', template: '%s — Bellum' },
  description: 'Run Android APKs and Windows EXEs in your browser. Export to self-contained HTML.',
  keywords: ['browser emulator', 'apk runner', 'android emulator', 'exe runner', 'web emulator'],
  openGraph: {
    type: 'website',
    title: 'Bellum — Run Anything',
    description: 'Browser-native execution for Android APKs and Windows EXEs. Export to single HTML files.',
    siteName: 'Bellum',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols can't use next/font (icon font with variable axes) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>
          <ThemeProvider>
            <GameProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <div className="flex flex-1">
                  <Sidebar />
                  <main className="flex-1 pb-14 sm:pb-0">{children}</main>
                </div>
                <Footer />
                <MobileNav />
              </div>
            </GameProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
