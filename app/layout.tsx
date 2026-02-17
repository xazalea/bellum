import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Abyss OS | Challenger Deep',
  description: 'Run Android, Windows, and 20,000+ games directly in your browser. No downloads. No installs. Just pure web-native power.',
  keywords: ['abyss os', 'challenger deep', 'android in browser', 'windows in browser', 'html5 games', 'cloud gaming', 'virtual machines'],
  authors: [{ name: 'Abyss OS Team' }],
  openGraph: {
    title: 'Abyss OS | Challenger Deep',
    description: 'Run Android, Windows, and 20,000+ games directly in your browser.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#01040a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} min-h-screen bg-[#01040a] text-[#f0f9ff] antialiased`}>
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Gradient orbs */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* App Layout */}
        <div className="relative flex min-h-screen">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col ml-16 lg:ml-64">
            <Header />
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
