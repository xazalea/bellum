import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}