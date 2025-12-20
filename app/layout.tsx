import type { Metadata } from 'next';
import { Material_Symbols_Outlined, Noto_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';

const fontDisplay = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
});

const fontBody = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const fontIcons = Material_Symbols_Outlined({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-icons',
});

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
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable} ${fontIcons.variable} dark`}>
      <head>
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
