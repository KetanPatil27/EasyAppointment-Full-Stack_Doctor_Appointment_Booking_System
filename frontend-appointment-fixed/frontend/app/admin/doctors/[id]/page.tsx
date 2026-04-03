'use client'

import { useParams } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditDoctorPage() {
  const params = useParams()
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
            <h1 className="text-2xl font-bold text-foreground mb-4">Doctor: {params.id}</h1>
            <p className="text-foreground/60 text-sm">Doctor profiles are managed by doctors themselves at <strong>/doctor/profile</strong>. Admins can suspend/approve doctors from the <Link href="/admin/doctors" className="text-primary hover:underline">Doctors list</Link>.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
