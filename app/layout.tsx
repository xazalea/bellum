import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Challenger Deep",
  description: "Play 20,000+ games instantly. Run Android and Windows apps in your browser.",
  keywords: ["games", "android", "windows", "emulator", "browser games", "cloud gaming"],
  authors: [{ name: "Challenger Deep" }],
  openGraph: {
    title: "Challenger Deep",
    description: "Play 20,000+ games instantly. Run Android and Windows apps in your browser.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
