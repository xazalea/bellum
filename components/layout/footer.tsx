import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container-max">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <Gamepad2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Challenger</span>
            </div>
            <p className="text-xs text-muted-foreground">
              High-performance gaming platform supporting HTML5, APK, and EXE in the browser. 42 themes included.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-1.5">
              <li><Link href="/games" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Games</Link></li>
              <li><Link href="/ai" className="text-xs text-muted-foreground hover:text-foreground transition-colors">AI Generator</Link></li>
              <li><Link href="/android" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Android Runtime</Link></li>
              <li><Link href="/windows" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Windows Runtime</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Account</h4>
            <ul className="space-y-1.5">
              <li><Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Login</Link></li>
              <li><Link href="/signup" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-1.5">
              <li><Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-6">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Challenger Gaming Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
