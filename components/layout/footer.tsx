import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="cd-container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Challenger Deep
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">Games</Link>
          <Link href="/android" className="hover:text-foreground transition-colors">Android</Link>
          <Link href="/windows" className="hover:text-foreground transition-colors">Windows</Link>
          <Link href="/ai" className="hover:text-foreground transition-colors">AI</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
