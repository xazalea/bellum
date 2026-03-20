import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GameProvider } from '@/components/providers/game-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a1020',
};

export const metadata: Metadata = {
  title: { default: 'Challenger Deep', template: '%s | Challenger Deep' },
  description: 'Play HTML5 games, Android APKs, and Windows EXEs instantly in your browser. No downloads, no installs.',
  keywords: ['browser games', 'html5 games', 'android emulator', 'play games online', 'no download games'],
  openGraph: {
    type: 'website',
    title: 'Challenger Deep — Play Any Game, Instantly',
    description: 'Browser-native gaming platform: 20,000+ HTML5 games, Android APKs, and Windows EXEs. No downloads. No plugins.',
    siteName: 'Challenger Deep',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Challenger Deep',
    description: 'Play 20,000+ games instantly in your browser.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <GameProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </GameProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
