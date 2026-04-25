import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GameProvider } from '@/components/providers/game-provider';
import { ComputeProvider } from '@/components/providers/compute-provider';
import { PerformanceProvider } from '@/components/providers/performance-provider';
import { SignupModal } from '@/components/ui/signup-modal';
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

      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>
          <ThemeProvider>
            <PerformanceProvider>
              <ComputeProvider>
                <GameProvider>
                  <div className="min-h-screen flex flex-col">
                  <Header />
                  <div className="flex flex-1">
                    <Sidebar />
                    <main className="flex-1 pb-14 sm:pb-0">{children}</main>
                  </div>
                  <Footer />
                  <MobileNav />
                  <SignupModal />
                </div>
              </GameProvider>
            </ComputeProvider>
          </PerformanceProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
