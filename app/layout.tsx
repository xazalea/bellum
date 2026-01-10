import type { Metadata } from 'next';
import { Noto_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { cn } from '@/lib/utils';

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

export const metadata: Metadata = {
  title: 'Nacho UI - Minimal. Matte. Modern.',
  description: 'A design system showcase built on the philosophy of soft pastel tones, high-radius components, and a flat yet tactile interface.',
  keywords: ['nacho', 'ui', 'design system', 'react', 'tailwind'],
  authors: [{ name: 'nacho' }],
  icons: {
    icon: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0B0F1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(fontDisplay.variable, fontBody.variable, "dark")}>
      <head>
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-screen w-full flex flex-col bg-nacho-bg text-nacho-text font-body antialiased overflow-x-hidden selection:bg-nacho-primary selection:text-nacho-bg">
        {children}
        <ClientInit />
      </body>
    </html>
  );
}
