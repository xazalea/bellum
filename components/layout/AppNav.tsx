"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/android", label: "Android" },
  { href: "/windows", label: "Windows" },
  { href: "/ai", label: "AI" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-sm font-semibold tracking-wide text-foreground/90">
          Challenger Deep
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-black/5 bg-white/70 p-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-black/5 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
