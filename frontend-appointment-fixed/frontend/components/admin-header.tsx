'use client'

import { User } from 'lucide-react'
import { useApp } from '@/lib/app-context'

export function AdminHeader({ title }: { title?: string } = {}) {
  const { currentUser } = useApp()
  return (
    <header className="hidden lg:block bg-card border-b border-border sticky top-0 z-40">
      <div className="px-6 py-4 flex items-center justify-end">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{currentUser?.name || 'Admin'}</p>
            <p className="text-xs text-foreground/60">Administrator</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  )
}
