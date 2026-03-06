import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DynamicIslandProvider } from "@/components/ui/dynamic-island";
import { DynamicIsland } from "@/components/ui/dynamic-island";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Challenger Deep",
  description: "The deepest point in the digital ocean",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        <DynamicIslandProvider>
          <DynamicIsland />
          <main className="relative">{children}</main>
        </DynamicIslandProvider>
      </body>
    </html>
  );
}