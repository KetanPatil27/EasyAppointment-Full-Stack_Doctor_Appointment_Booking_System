'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Calendar, User, Settings, LogOut, LayoutDashboard,
  MessageSquare, Activity, Pill, Star, Menu, X
} from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { Logo } from './logo'

const navItems = [
  { label: 'Dashboard',       href: '/dashboard',                 icon: LayoutDashboard },
  { label: 'Appointments',    href: '/dashboard/appointments',    icon: Calendar },
  { label: 'Messages',        href: '/dashboard/messages',        icon: MessageSquare },
  { label: 'Prescriptions',   href: '/dashboard/prescriptions',   icon: Pill },
  { label: 'Health Insights', href: '/dashboard/health-insights', icon: Activity },
  { label: 'Profile',         href: '/dashboard/profile',         icon: User },
  { label: 'My Reviews',      href: '/dashboard/reviews',         icon: Star },
  { label: 'Settings',        href: '/dashboard/settings',        icon: Settings },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { logout, currentUser } = useApp()

  const handleLogout = () => {
    logout()
    router.push('/login')
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo → home */}
      <div
        onClick={onClose}
        className="p-5 border-b border-border flex flex-col gap-0.5 hover:bg-sidebar-accent/50 transition-colors shrink-0"
      >
        <Logo />
        <span className="text-xs text-foreground/50 font-medium ml-11">Patient Dashboard</span>
      </div>

      {/* Nav — clean, uniform items only */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User + Logout — always visible */}
      <div className="p-4 border-t border-sidebar-border shrink-0">
        {currentUser && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg bg-sidebar-accent/40">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {currentUser.name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
              <p className="text-xs text-foreground/50 truncate">{currentUser.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 mt-1 text-destructive hover:bg-destructive/10 transition-all font-medium"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export function DashboardSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border shadow-sm">
        <Logo size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[85vw] h-full bg-sidebar border-r border-border shadow-2xl flex flex-col overflow-hidden">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted/50 transition-colors z-10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-foreground/60" />
            </button>
            <SidebarContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar h-screen fixed left-0 top-0 flex-col overflow-hidden z-20">
        <SidebarContent />
      </aside>
    </>
  )
}
