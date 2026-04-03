import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Logo } from './logo';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="flex h-16 items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/doctors" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Find Doctors
            </Link>
            <Link href="/login" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Login
            </Link>
            <Link href="/admin/login" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Admin
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Register
            </Link>
          </nav>

          <button className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
