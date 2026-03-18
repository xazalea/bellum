import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GameProvider } from '@/components/providers/game-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: { default: 'Challenger Deep', template: '%s | Challenger Deep' },
  description: 'Play HTML5 games, Android APKs, and Windows EXEs instantly in your browser. No downloads, no installs.',
  openGraph: {
    type: 'website',
    title: 'Challenger Deep',
    description: 'Next-generation browser gaming platform.',
  },
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
