'use client';

import { useApp } from '@/lib/app-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { FileText } from 'lucide-react';

export default function MedicalRecordsPage() {
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

      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Medical Records</h1>
              <p className="text-foreground/60 text-sm">Your health documents and test results</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
            <p className="text-foreground/60 mb-2">Medical records feature coming soon</p>
            <p className="text-sm text-foreground/40">Your prescriptions and medical documents will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
