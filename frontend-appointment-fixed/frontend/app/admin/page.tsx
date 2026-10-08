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
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()
  const router = useRouter()
  const [stats, setStats] = useState({ totalUsers: 0, totalDoctors: 0, totalAppointments: 0 })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated || !currentUser || currentUser.role !== 'admin') {
      router.push('/admin/login')
    }
  }, [currentUser, isAuthenticated, isAuthLoading, router])

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
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 min-w-0 w-full flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <div className="hidden lg:block"><AdminHeader /></div>
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8">
          <div className="mb-5 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-foreground/60 text-xs sm:text-base">Welcome back, {currentUser?.name || 'Admin'}!</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-5 sm:mb-8">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card rounded-xl border border-border p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <p className="text-foreground/60 text-xs sm:text-sm font-medium">{label}</p>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{loading ? '...' : value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Recent Appointments</h2>
                <Link href="/admin/appointments" className="text-primary hover:underline text-xs sm:text-sm font-medium">View All</Link>
              </div>
              {loading ? (
                <div className="p-8 text-center text-foreground/50 text-sm">Loading...</div>
              ) : recentAppointments.length === 0 ? (
                <div className="p-8 text-center text-foreground/50 text-sm">No appointments yet</div>
              ) : (
                <>
                  {/* Mobile Card View (< sm) */}
                  <div className="sm:hidden divide-y divide-border">
                    {recentAppointments.map((apt) => (
                      <div key={apt._id} className="p-3.5 space-y-1.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground text-sm truncate">{apt.patientName || 'Unknown'}</span>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_LABELS[apt.status] || apt.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-foreground/70">
                          <span className="truncate">Dr. {apt.doctorName || 'Unknown'}</span>
                          <span className="shrink-0 text-foreground/50">{apt.date || (apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : '—')}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-5 sm:px-6 py-3 text-left text-sm font-semibold text-foreground">Patient</th>
                          <th className="px-5 sm:px-6 py-3 text-left text-sm font-semibold text-foreground">Doctor</th>
                          <th className="px-5 sm:px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                          <th className="px-5 sm:px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recentAppointments.map((apt) => (
                          <tr key={apt._id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-sm font-medium text-foreground">{apt.patientName || 'Unknown'}</td>
                            <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-sm font-medium text-foreground">{apt.doctorName || 'Unknown'}</td>
                            <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-sm text-foreground/70">{apt.date || (apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : '—')}</td>
                            <td className="px-5 sm:px-6 py-3.5 sm:py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                                {STATUS_LABELS[apt.status] || apt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
              <div className="space-y-2.5 sm:space-y-3">
                {[
                  { href: '/admin/doctors', label: 'Manage Doctors', color: 'bg-primary/10 text-primary hover:bg-primary/20' },
                  { href: '/admin/users', label: 'Manage Patients', color: 'bg-accent/10 text-accent hover:bg-accent/20' },
                  { href: '/admin/appointments', label: 'View Appointments', color: 'bg-muted text-foreground hover:bg-muted/80' },
                ].map(({ href, label, color }) => (
                  <Link key={href} href={href}
                    className={`flex items-center justify-between w-full p-3 sm:p-4 rounded-lg transition-colors font-medium text-sm sm:text-base ${color}`}
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
