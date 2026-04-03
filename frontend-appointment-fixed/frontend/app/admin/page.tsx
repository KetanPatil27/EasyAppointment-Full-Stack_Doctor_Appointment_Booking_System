'use client'

import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'
import { Users, Stethoscope, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { adminGetStats, adminGetAppointmentsWithNames } from '@/services/adminService'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  confirmed: 'bg-blue-100 text-blue-800',
  booked: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  cancelled_by_patient: 'bg-red-100 text-red-800',
  cancelled_by_doctor: 'bg-orange-100 text-orange-800',
  rejected: 'bg-gray-100 text-gray-800'
}

const STATUS_LABELS: Record<string, string> = {
  cancelled_by_patient: 'Patient Cancelled',
  cancelled_by_doctor: 'Doctor Cancelled',
}

export default function AdminDashboard() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [stats, setStats] = useState({ totalUsers: 0, totalDoctors: 0, totalAppointments: 0 })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser.role !== 'admin') {
      router.push('/admin/login')
    }
  }, [currentUser, isAuthenticated, router])

  useEffect(() => {
    if (currentUser?.role !== 'admin') return
    const load = async () => {
      try {
        const [s, appts] = await Promise.all([
          adminGetStats(),
          adminGetAppointmentsWithNames({ $limit: 5, $sort: { createdAt: -1 } })
        ])
        setStats(s)
        setRecentAppointments(appts)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [currentUser])

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users },
    { label: 'Active Doctors', value: stats.totalDoctors, icon: Stethoscope },
    { label: 'Total Appointments', value: stats.totalAppointments, icon: Calendar },
  ]

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-foreground/60">Welcome back, {currentUser?.name}!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-foreground/60 text-sm">{label}</p>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">{loading ? '...' : value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Recent Appointments</h2>
                <Link href="/admin/appointments" className="text-primary hover:underline text-sm font-medium">View All</Link>
              </div>
              {loading ? (
                <div className="p-8 text-center text-foreground/50">Loading...</div>
              ) : recentAppointments.length === 0 ? (
                <div className="p-8 text-center text-foreground/50">No appointments yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Patient</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Doctor</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentAppointments.map((apt) => (
                        <tr key={apt._id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-foreground">{apt.patientName || 'Unknown'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">{apt.doctorName || 'Unknown'}</td>
                          <td className="px-6 py-4 text-sm text-foreground/70">{apt.date || new Date(apt.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                              {STATUS_LABELS[apt.status] || apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {[
                  { href: '/admin/doctors', label: 'Manage Doctors', color: 'bg-primary/10 text-primary hover:bg-primary/20' },
                  { href: '/admin/users', label: 'Manage Patients', color: 'bg-accent/10 text-accent hover:bg-accent/20' },
                  { href: '/admin/appointments', label: 'View Appointments', color: 'bg-muted text-foreground hover:bg-muted/80' },
                ].map(({ href, label, color }) => (
                  <Link key={href} href={href}
                    className={`flex items-center justify-between w-full p-4 rounded-lg transition-colors font-medium ${color}`}
                  >
                    <span>{label}</span><span>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
