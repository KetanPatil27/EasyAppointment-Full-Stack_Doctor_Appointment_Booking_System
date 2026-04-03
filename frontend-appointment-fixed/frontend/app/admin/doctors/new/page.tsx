'use client'

import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddDoctorPage() {
  const router = useRouter()
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-8">
          <Link href="/admin/doctors" className="flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Doctors
          </Link>
          <div className="bg-card rounded-xl border border-border p-8 max-w-lg">
            <h1 className="text-2xl font-bold text-foreground mb-4">Add Doctor</h1>
            <p className="text-foreground/60 text-sm">
              Doctors self-register at <strong>/register</strong> selecting the "Doctor" role. 
              Their profile becomes visible after they complete their profile at <strong>/doctor/profile</strong>.
            </p>
            <Link href="/admin/doctors" className="mt-6 inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              View All Doctors
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
