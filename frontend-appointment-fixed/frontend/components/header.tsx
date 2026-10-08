'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from './logo';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

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

          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-sm">
          <nav className="flex flex-col px-4 py-4 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            >
              Home
            </Link>
            <Link
              href="/doctors"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            >
              Find Doctors
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            >
              Login
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            >
              Admin
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="mx-4 mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Register
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
