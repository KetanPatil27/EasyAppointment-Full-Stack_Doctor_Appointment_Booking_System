'use client'

import { useState, useEffect } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminHeader } from '@/components/admin-header'
import { Search, Trash2, ShieldCheck, ShieldX, Loader2, GraduationCap, Star, CheckCircle } from 'lucide-react'
import { adminGetAllDoctors, adminDeleteDoctor, adminApproveDoctor, adminSuspendUser, adminDeleteUser } from '@/services/adminService'
import { getReviewsByDoctor, getAverageRating } from '@/services/reviewService'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
}

export default function AdminDoctorsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [doctors, setDoctors] = useState<any[]>([])
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') { router.push('/admin/login'); return }
    loadDoctors()
  }, [currentUser])

  const loadDoctors = async () => {
    setLoading(true)
    try {
      const data = await adminGetAllDoctors()
      setDoctors(data)
      const ratingMap: Record<string, { avg: number; count: number }> = {}
      await Promise.all(data.map(async (doc: any) => {
        try {
          const revs = await getReviewsByDoctor(doc.userId)
          ratingMap[doc._id] = { avg: getAverageRating(revs), count: revs.length }
        } catch { ratingMap[doc._id] = { avg: 0, count: 0 } }
      }))
      setRatings(ratingMap)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleApprove = async (doctor: any) => {
    setActionLoading(doctor._id)
    try {
      await adminApproveDoctor(doctor.userId)
      setDoctors(prev => prev.map(d => d._id === doctor._id ? { ...d, status: 'active' } : d))
      toast.success(`Dr. ${doctor.name} approved`)
    } catch { toast.error('Failed to approve doctor') }
    finally { setActionLoading(null) }
  }

  const handleToggleSuspend = async (doctor: any) => {
    const willSuspend = doctor.status !== 'suspended'
    setActionLoading(doctor._id)
    try {
      await adminSuspendUser(doctor.userId, willSuspend)
      setDoctors(prev => prev.map(d => d._id === doctor._id ? { ...d, status: willSuspend ? 'suspended' : 'active' } : d))
      toast.success(`Dr. ${doctor.name} ${willSuspend ? 'suspended' : 'activated'}`)
    } catch { toast.error('Failed to update status') }
    finally { setActionLoading(null) }
  }

  const handleDelete = async (doctor: any) => {
    if (!confirm(`Delete Dr. ${doctor.name || 'this doctor'}? Their appointments will be cancelled.`)) return
    setActionLoading(doctor._id)
    try {
      // Delete user account (cascadeDelete hook handles appointments + doctor profile)
      await adminDeleteUser(doctor.userId)
      setDoctors(prev => prev.filter(d => d._id !== doctor._id))
      toast.success('Doctor deleted')
    } catch { toast.error('Failed to delete doctor') }
    finally { setActionLoading(null) }
  }

  const filtered = doctors.filter(d => {
    const matchesStatus = statusFilter === 'all' || (d.status || 'active') === statusFilter
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const pendingCount = doctors.filter(d => d.status === 'pending').length

  const initials = (name: string) => (name || 'D').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader title="Doctors" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                All Doctors <span className="text-foreground/40 font-normal text-base ml-2">({filtered.length})</span>
              </h2>
              {pendingCount > 0 && (
                <p className="text-yellow-600 text-sm font-medium mt-1">
                  {pendingCount} doctor(s) pending approval
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input type="text" placeholder="Search doctors…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-foreground/50">No doctors found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(doc => {
                const ratingData = ratings[doc._id]
                const isExpanded = expanded === doc._id
                const status = doc.status || 'active'
                return (
                  <div key={doc._id} className={`bg-card rounded-xl border overflow-hidden ${status === 'pending' ? 'border-yellow-300' : 'border-border'
                    }`}>
                    {/* Main row */}
                    <div className="flex items-center gap-4 p-4">
                      <div className="shrink-0">
                        {doc.profileImage ? (
                          <img src={doc.profileImage} alt={doc.name} className="h-12 w-12 rounded-xl object-cover border border-border" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                            {initials(doc.name || '')}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">Dr. {doc.name || 'Unknown'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-700'}`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                        <p className="text-xs text-foreground/50 mt-0.5 truncate">{doc.email}</p>
                      </div>

                      <div className="hidden md:flex items-center gap-6 text-sm text-foreground/60 shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{doc.patientsCount || 0}</p>
                          <p className="text-xs">patients</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{doc.experience}</p>
                          <p className="text-xs">yrs exp</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">₹{doc.hourlyRate}</p>
                          <p className="text-xs">fee</p>
                        </div>
                        {ratingData && ratingData.count > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-foreground">{ratingData.avg.toFixed(1)}</span>
                            <span className="text-xs text-foreground/50">({ratingData.count})</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setExpanded(isExpanded ? null : doc._id)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-foreground/70">
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                        {status === 'pending' && (
                          <button onClick={() => handleApprove(doc)} disabled={actionLoading === doc._id}
                            title="Approve"
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 font-medium">
                            {actionLoading === doc._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Approve
                          </button>
                        )}
                        {status !== 'pending' && (
                          <button onClick={() => handleToggleSuspend(doc)} disabled={actionLoading === doc._id}
                            title={status === 'suspended' ? 'Activate' : 'Suspend'}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${status === 'suspended' ? 'text-green-600 hover:bg-green-50' : 'text-yellow-600 hover:bg-yellow-50'
                              }`}>
                            {actionLoading === doc._id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                              status === 'suspended' ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
                          </button>
                        )}
                        <button onClick={() => handleDelete(doc)} disabled={actionLoading === doc._id}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-4">
                          {doc.profileImage ? (
                            <img src={doc.profileImage} alt={doc.name} className="h-20 w-20 rounded-xl object-cover border border-border shrink-0" />
                          ) : (
                            <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-border shrink-0">
                              {initials(doc.name || '')}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">Dr. {doc.name}</p>
                            <p className="text-primary text-xs">{doc.specialization}</p>
                            {doc.bio && <p className="text-foreground/60 text-xs mt-1 line-clamp-3">{doc.bio}</p>}
                            {doc.licenseNumber && (
                              <p className="text-xs font-mono font-medium text-foreground bg-muted inline-block px-2 py-0.5 rounded mt-2 border border-border">
                                License: {doc.licenseNumber}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          {doc.qualifications && doc.qualifications.length > 0 ? (
                            <>
                              <p className="flex items-center gap-1 text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-2">
                                <GraduationCap className="h-3.5 w-3.5" /> Qualifications
                              </p>
                              <div className="space-y-1">
                                {doc.qualifications.map((q: any, i: number) => (
                                  <p key={i} className="text-foreground/70">{q.degree} – {q.college} – {q.year}</p>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-foreground/40 text-xs italic">No qualifications listed</p>
                          )}
                          {doc.clinicAddress?.city && (
                            <p className="text-foreground/50 text-xs mt-2">
                              📍 {doc.clinicAddress.street && `${doc.clinicAddress.street}, `}{doc.clinicAddress.city}, {doc.clinicAddress.state}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
