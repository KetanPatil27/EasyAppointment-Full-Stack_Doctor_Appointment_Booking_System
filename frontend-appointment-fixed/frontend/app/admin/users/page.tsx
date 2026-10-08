'use client'

import { useState, useEffect } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'
import { Search, Trash2, ShieldCheck, ShieldX, Loader2 } from 'lucide-react'
import { adminGetAllPatients, adminUpdateUser, adminDeleteUser } from '@/services/adminService'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'

export default function AdminPatientsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') { router.push('/admin/login'); return }
    loadPatients()
  }, [currentUser])

  const loadPatients = async () => {
    setLoading(true)
    try {
      const data = await adminGetAllPatients()
      setPatients(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended'
    setActionLoading(user._id)
    try {
      await adminUpdateUser(user._id, { status: newStatus })
      setPatients(prev => prev.map(u => u._id === user._id ? { ...u, status: newStatus } : u))
    } catch (err) { alert('Failed to update status') }
    finally { setActionLoading(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this patient? Their appointments will be cancelled.')) return
    setActionLoading(id)
    try {
      await adminDeleteUser(id)
      setPatients(prev => prev.filter(u => u._id !== id))
    } catch (err) { alert('Failed to delete patient') }
    finally { setActionLoading(null) }
  }

  const filtered = patients.filter(u => {
    const q = searchQuery.toLowerCase()
    return !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
  })

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">Patients</h1>
              <p className="text-sm sm:text-base text-foreground/60">{patients.length} registered patients</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                      {['Name', 'Email', 'Phone', 'Appointments', 'Status', 'Registered', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(user => (
                      <tr key={user._id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground text-sm">{user.name || '—'}</td>
                        <td className="px-6 py-4 text-sm text-foreground/70">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-foreground/70 whitespace-nowrap">{user.phone || '—'}</td>
                        <td className="px-6 py-4 font-semibold text-foreground text-sm">{user.appointmentsCount || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{user.status || 'active'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/50 whitespace-nowrap">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={actionLoading === user._id}
                              title={user.status === 'active' ? 'Suspend' : 'Activate'}
                              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                user.status === 'active' ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {actionLoading === user._id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                user.status === 'active' ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
                              disabled={actionLoading === user._id}
                              className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="p-8 text-center text-foreground/50">No patients found</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
