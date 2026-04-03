'use client';

import { useApp } from '@/lib/app-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { currentUser, isAuthenticated } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />

      <div className="flex-1 overflow-auto md:ml-64 pt-14 lg:pt-0">
        <div className="p-6 md:p-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-foreground/60">Stay updated with your appointments</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Bell className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
            <p className="text-foreground/60 mb-2">No notifications yet</p>
            <p className="text-sm text-foreground/40">Appointment reminders and updates will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
