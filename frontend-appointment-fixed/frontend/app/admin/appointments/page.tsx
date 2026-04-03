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
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') { router.push('/admin/login'); return }
    const load = async () => {
      try {
        const data = await adminGetAppointmentsWithNames({ $limit: 500, $sort: { createdAt: -1 } })
        setAppointments(data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [currentUser])

  const filtered = appointments.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      a.patientName?.toLowerCase().includes(q) ||
      a.doctorName?.toLowerCase().includes(q) ||
      a.date?.includes(searchQuery) ||
      a._id?.includes(searchQuery)
    return matchesStatus && matchesSearch
  })

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-1">Appointments</h1>
              <p className="text-foreground/60">{appointments.length} total appointments</p>
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                {['booked', 'confirmed', 'completed', 'cancelled', 'cancelled_by_patient', 'cancelled_by_doctor', 'rejected'].map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Search by name, date..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
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
              {filtered.length === 0 && (
                <div className="p-8 text-center text-foreground/50">No appointments found</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
