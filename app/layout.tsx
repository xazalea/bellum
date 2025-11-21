import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bellum - Hyper VM Platform',
  description: 'Run multiple virtual machines in your browser',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.puter.com/v2/" async></script>
      </head>
      <body>{children}</body>
    </html>
  );
}

