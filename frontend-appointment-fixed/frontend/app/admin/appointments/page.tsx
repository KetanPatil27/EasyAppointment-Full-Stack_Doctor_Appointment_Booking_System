'use client'

import { useState, useEffect } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'
import { Search, Loader2, IndianRupee } from 'lucide-react'
import { adminGetAppointmentsWithNames } from '@/services/adminService'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'

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

export default function AdminAppointmentsPage() {
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated || currentUser?.role !== 'admin') { router.push('/admin/login'); return }
    const load = async () => {
      try {
        const data = await adminGetAppointmentsWithNames({ $limit: 500, $sort: { createdAt: -1 } })
        setAppointments(data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [currentUser, isAuthenticated, isAuthLoading])

  const filtered = appointments.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    const q = searchQuery.toLowerCase()
    return !q ||
      a.patientName?.toLowerCase().includes(q) ||
      a.doctorName?.toLowerCase().includes(q) ||
      a.date?.includes(searchQuery) ||
      a._id?.includes(searchQuery)
  })

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 min-w-0 w-full flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">Appointments</h1>
              <p className="text-xs sm:text-base text-foreground/60">{appointments.length} total appointments</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                {['booked', 'confirmed', 'completed', 'cancelled', 'cancelled_by_patient', 'cancelled_by_doctor', 'rejected'].map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Search by name, date..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-foreground/50 text-sm">No appointments found</div>
              ) : (
                <>
                  {/* Mobile Card List (< sm) */}
                  <div className="sm:hidden divide-y divide-border">
                    {filtered.map(apt => (
                      <div key={apt._id} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] text-foreground/50 font-medium">Patient</p>
                            <p className={`font-semibold text-sm ${apt.patientName === 'Deleted Account' ? 'text-destructive/70 italic' : 'text-foreground'}`}>
                              {apt.patientName || 'Unknown'}
                            </p>
                          </div>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_LABELS[apt.status] || apt.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <div>
                            <span className="text-foreground/50">Doctor: </span>
                            <span className={`font-medium ${apt.doctorName === 'Deleted Account' ? 'text-destructive/70 italic' : 'text-foreground'}`}>
                              {apt.doctorName || 'Unknown'}
                            </span>
                          </div>
                          {apt.consultationFee ? (
                            <span className="font-semibold text-foreground flex items-center">
                              <IndianRupee className="h-3 w-3" />{apt.consultationFee}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-foreground/50 pt-1 border-t border-border/40">
                          <span>📅 {apt.date || '—'} {apt.startTime ? `• ${apt.startTime}` : ''}</span>
                          <span>{apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          {['Patient', 'Doctor', 'Date', 'Time', 'Fee', 'Status', 'Created'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-sm font-semibold text-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map(apt => (
                          <tr key={apt._id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-5 py-4 text-sm">
                              <span className={`font-medium ${apt.patientName === 'Deleted Account' ? 'text-destructive/70 italic' : 'text-foreground'}`}>
                                {apt.patientName}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <span className={`font-medium ${apt.doctorName === 'Deleted Account' ? 'text-destructive/70 italic' : 'text-foreground'}`}>
                                {apt.doctorName}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-foreground">{apt.date || '—'}</td>
                            <td className="px-5 py-4 text-sm text-foreground/70">{apt.startTime || '—'}</td>
                            <td className="px-5 py-4 text-sm text-foreground/70">
                              {apt.consultationFee ? (
                                <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{apt.consultationFee}</span>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                                {STATUS_LABELS[apt.status] || apt.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-foreground/50 whitespace-nowrap">
                              {new Date(apt.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
