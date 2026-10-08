'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { Star, Loader2, CheckCircle, MessageSquare } from 'lucide-react'
import { getMyAppointments, Appointment } from '@/services/appointmentService'
import { getDoctorByUserId } from '@/services/doctorService'
import { createReview, getMyReviews, Review } from '@/services/reviewService'

interface AppointmentWithDoctor extends Appointment {
  doctorName?: string
  doctorSpec?: string
  reviewed?: boolean
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star className={`h-8 w-8 ${(hover || value) >= n ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
        </button>
      ))}
    </div>
  )
}

export default function PatientReviewsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [appointments,   setAppointments]   = useState<AppointmentWithDoctor[]>([])
  const [loading,        setLoading]        = useState(true)
  const [selected,       setSelected]       = useState<AppointmentWithDoctor | null>(null)
  const [rating,         setRating]         = useState(5)
  const [text,           setText]           = useState('')
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    load()
  }, [currentUser])

  const load = async () => {
    try {
      const [appts, myReviews] = await Promise.all([
        getMyAppointments(),
        getMyReviews().catch(() => [])
      ])
      const reviewedIds = new Set((myReviews as Review[]).map(r => r.appointmentId))
      const completed = appts.filter((a: Appointment) => a.status === 'completed')
      const enriched: AppointmentWithDoctor[] = await Promise.all(
        completed.map(async (apt: Appointment) => {
          const doc = await getDoctorByUserId(apt.doctorId).catch(() => null)
          return {
            ...apt,
            doctorName: doc?.name || 'Doctor',
            doctorSpec: doc?.specialization || '',
            reviewed:   reviewedIds.has(apt._id),
          }
        })
      )
      setAppointments(enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!selected) return
    if (rating < 1) { setError('Please select a rating'); return }
    setSaving(true); setError('')
    try {
      await createReview({ appointmentId: selected._id, rating, text })
      setSaved(true)
      setAppointments(prev => prev.map(a => a._id === selected._id ? { ...a, reviewed: true } : a))
      setSelected(null); setRating(5); setText('')
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit review')
    } finally { setSaving(false) }
  }

  const reviewable = appointments.filter(a => !a.reviewed)
  const reviewed   = appointments.filter(a => a.reviewed)

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Rate Your Doctors</h1>
          <p className="text-foreground/60 mb-6 sm:mb-8 text-sm">Share your experience to help other patients</p>

          {saved && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
              <CheckCircle className="h-5 w-5 shrink-0" /> Review submitted! Thank you.
            </div>
          )}

          {/* Write review modal-style inline panel */}
          {selected && (
            <div className="rounded-xl border-2 border-primary bg-card p-4 sm:p-6 mb-6">
              <h2 className="font-bold text-foreground mb-1 text-base sm:text-lg">Write a Review</h2>
              <p className="text-sm text-foreground/60 mb-4">Dr. {selected.doctorName} · {selected.doctorSpec}</p>
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Your Rating</p>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1">Review (optional)</label>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                  placeholder="Describe your experience with this doctor…"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              {error && <p className="text-sm text-destructive mb-3">{error}</p>}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => { setSelected(null); setRating(5); setText(''); setError('') }}
                  className="w-full sm:flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving || rating < 1}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  {saving ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : appointments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <MessageSquare className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/60 font-medium">No completed appointments yet</p>
              <p className="text-sm text-foreground/40 mt-1">Complete an appointment to leave a review</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewable.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                    Pending Reviews ({reviewable.length})
                  </h2>
                  <div className="space-y-3">
                    {reviewable.map(apt => (
                      <div key={apt._id} className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                          <p className="font-semibold text-foreground">Dr. {apt.doctorName}</p>
                          <p className="text-sm text-primary">{apt.doctorSpec}</p>
                          {apt.date && <p className="text-xs text-foreground/50 mt-1">{apt.date}</p>}
                        </div>
                        <button onClick={() => { setSelected(apt); setRating(5); setText('') }}
                          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                          <Star className="h-4 w-4" /> Rate
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewed.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                    Reviewed ({reviewed.length})
                  </h2>
                  <div className="space-y-3">
                    {reviewed.map(apt => (
                      <div key={apt._id} className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 opacity-70">
                        <div>
                          <p className="font-semibold text-foreground">Dr. {apt.doctorName}</p>
                          <p className="text-sm text-primary">{apt.doctorSpec}</p>
                        </div>
                        <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                          <CheckCircle className="h-4 w-4" /> Reviewed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
