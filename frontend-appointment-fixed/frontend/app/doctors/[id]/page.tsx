'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { MapPin, Clock, IndianRupee, ArrowLeft, CheckCircle, Loader2, Star, GraduationCap, Award } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getDoctorById, Doctor, getSpecializations } from '@/services/doctorService'
import { getSlotsByDoctor, bookAppointment, Slot } from '@/services/appointmentService'
import { getReviewsByDoctor, getAverageRating, Review } from '@/services/reviewService'
import { useApp } from '@/lib/app-context'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`${s} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()

  const [doctor,  setDoctor]  = useState<Doctor | null>(null)
  const [slots,   setSlots]   = useState<Slot[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [selectedDate, setSelectedDate]   = useState('')
  const [selectedSlot, setSelectedSlot]   = useState<Slot | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [booking,  setBooking]  = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [error, setError] = useState('')

  // ── Load doctor + slots + reviews ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const doc = await getDoctorById(id)
        setDoctor(doc)
        if (doc) {
          const [allSlots, revs] = await Promise.all([
            getSlotsByDoctor(doc.userId),
            getReviewsByDoctor(doc.userId)
          ])
          const available = allSlots.filter((s: Slot) => !s.isBooked)
          setSlots(available)
          setReviews(revs)

          if (available.length > 0) {
            const dates = [...new Set(available.map((s: Slot) => s.date))].sort() as string[]

            // ── Booking intent recovery: if user just came back from login ──
            // We stored the desired slotId in sessionStorage before redirecting
            try {
              const pendingSlotId = sessionStorage.getItem(`pendingSlot_${id}`)
              if (pendingSlotId) {
                const pendingSlot = available.find((s: Slot) => s._id === pendingSlotId)
                if (pendingSlot) {
                  setSelectedDate(pendingSlot.date)
                  setSelectedSlot(pendingSlot)
                  sessionStorage.removeItem(`pendingSlot_${id}`)
                  // auto-book immediately after login
                  // defer until auth state is settled (handleBook checks isAuthenticated)
                  sessionStorage.setItem(`autoBook_${id}`, pendingSlotId)
                } else {
                  setSelectedDate(dates[0])
                }
              } else {
                setSelectedDate(dates[0])
              }
            } catch {
              setSelectedDate(dates[0])
            }
          }
        }
      } catch (err) {
        console.error('Failed to load doctor', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Auto-book when auth finishes loading (post-login redirect) ────────────
  useEffect(() => {
    if (isAuthLoading || loading) return
    if (!isAuthenticated || !currentUser) return
    if (currentUser.role !== 'patient') return

    try {
      const autoBookSlotId = sessionStorage.getItem(`autoBook_${id}`)
      if (autoBookSlotId && selectedSlot?._id === autoBookSlotId) {
        sessionStorage.removeItem(`autoBook_${id}`)
        executeBooking(selectedSlot)
      }
    } catch { /* ignore */ }
  }, [isAuthLoading, isAuthenticated, currentUser, loading])

  // ── Core booking logic ────────────────────────────────────────────────────
  const executeBooking = async (slot: Slot) => {
    setBooking(true); setError('')
    try {
      await bookAppointment(slot._id)
      setBookingSuccess(true)
      setSlots(prev => prev.filter(s => s._id !== slot._id))
      setSelectedSlot(null)
      setTimeout(() => router.push('/dashboard/appointments'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to book appointment')
    } finally {
      setBooking(false)
    }
  }

  const handleBook = async () => {
    if (!selectedSlot) { setError('Please select a time slot'); return }

    // Not logged in → save the slot intent and redirect to login
    if (!isAuthenticated || !currentUser) {
      try {
        sessionStorage.setItem(`pendingSlot_${id}`, selectedSlot._id)
      } catch { /* ignore private mode */ }
      router.push(`/login?redirect=/doctors/${id}`)
      return
    }

    if (currentUser.role !== 'patient') {
      setError('Only patients can book appointments')
      return
    }

    await executeBooking(selectedSlot)
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const avgRating       = getAverageRating(reviews)
  const availableDates  = [...new Set(slots.map(s => s.date))].sort() as string[]
  const slotsForDate    = slots.filter(s => s.date === selectedDate)
  const initials        = (doctor?.name || 'D').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
      <Footer />
    </div>
  )

  if (!doctor) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/60 text-lg mb-4">Doctor not found</p>
          <Link href="/doctors" className="text-primary hover:underline">Browse all doctors →</Link>
        </div>
      </main>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/doctors" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to Doctors
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left: Doctor Info ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── Hero card — matches screenshot design ── */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row gap-0">
                  {/* Profile image — square */}
                  <div className="w-full sm:w-52 sm:min-h-[200px] shrink-0 bg-gradient-to-br from-primary/5 to-primary/15 flex items-center justify-center overflow-hidden">
                    {doctor.profileImage ? (
                      <img
                        src={doctor.profileImage}
                        alt={`Dr. ${doctor.name}`}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="h-28 w-28 rounded-2xl bg-primary/15 flex items-center justify-center text-primary text-5xl font-bold">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-6 flex flex-col justify-center flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-1">Dr. {doctor.name}</h1>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getSpecializations(doctor).map((s) => (
                        <span
                          key={s}
                          className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Rating */}
                    {avgRating > 0 ? (
                      <div className="flex items-center gap-2 mb-3">
                        <StarRow rating={Math.round(avgRating)} size="sm" />
                        <span className="text-sm font-bold text-foreground">{avgRating.toFixed(1)}</span>
                        <span className="text-sm text-foreground/50">({reviews.length} reviews)</span>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/40 mb-3">No reviews yet</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-foreground/70">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary/60" />
                        {doctor.experience}+ years experience
                      </span>
                      <span className="flex items-center gap-1.5">
                        <IndianRupee className="h-4 w-4 text-primary/60" />
                        ₹{doctor.hourlyRate} consultation
                      </span>
                      {doctor.clinicAddress?.city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-primary/60" />
                          {doctor.clinicAddress.city}{doctor.clinicAddress.state && `, ${doctor.clinicAddress.state}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              {doctor.bio && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-base font-bold text-foreground mb-2">About</h2>
                  <p className="text-foreground/70 text-sm leading-relaxed">{doctor.bio}</p>
                </div>
              )}

              {/* Qualifications */}
              {doctor.qualifications && doctor.qualifications.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-bold text-foreground">Qualifications</h2>
                  </div>
                  <div className="space-y-3">
                    {doctor.qualifications.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <Award className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{q.degree}</p>
                          <p className="text-foreground/60">{q.college} · {q.year}</p>
                          {q.certification && <p className="text-foreground/50 text-xs mt-0.5">{q.certification}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages + Clinic */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-base font-bold text-foreground mb-4">Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  {doctor.licenseNumber && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-1">License</p>
                      <p className="text-foreground">{doctor.licenseNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-1">Duration</p>
                    <p className="text-foreground">{doctor.consultationDuration || 30} minutes</p>
                  </div>
                  {doctor.languages && doctor.languages.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-1">Languages</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doctor.languages.map(l => (
                          <span key={l} className="px-2.5 py-1 rounded-full bg-muted text-xs text-foreground/70 border border-border">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {doctor.clinicAddress?.street && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-1">Clinic</p>
                      <p className="text-foreground">
                        {doctor.clinicAddress.street}
                        {doctor.clinicAddress.city && `, ${doctor.clinicAddress.city}`}
                        {doctor.clinicAddress.state && `, ${doctor.clinicAddress.state}`}
                        {doctor.clinicAddress.zipCode && ` – ${doctor.clinicAddress.zipCode}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-foreground">Patient Reviews</h2>
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-1.5">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-foreground text-sm">{avgRating.toFixed(1)}</span>
                      <span className="text-foreground/50 text-xs">/ 5</span>
                      <span className="text-foreground/40 text-xs">({reviews.length})</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map(review => (
                      <div key={review._id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {(review.patientName || 'P')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-foreground">{review.patientName || 'Patient'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StarRow rating={review.rating} />
                            <span className="text-xs text-foreground/40">
                              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        {review.text && (
                          <p className="text-sm text-foreground/70 mt-1.5 ml-10 italic">"{review.text}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Booking Panel ── */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-border bg-card p-6 sticky top-24 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-1">Book Appointment</h2>
                <p className="text-sm text-foreground/50 mb-5">
                  ₹{doctor.hourlyRate} · {doctor.consultationDuration || 30} min
                </p>

                {bookingSuccess ? (
                  <div className="text-center py-10">
                    <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-bold text-lg">Appointment Booked!</p>
                    <p className="text-foreground/60 text-sm mt-1">Taking you to your dashboard…</p>
                  </div>
                ) : (
                  <>
                    {slots.length === 0 ? (
                      <div className="text-center py-10">
                        <Clock className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                        <p className="text-foreground/60 text-sm font-medium">No available slots</p>
                        <p className="text-foreground/40 text-xs mt-1">Check back later</p>
                      </div>
                    ) : (
                      <>
                        {/* Date selection */}
                        <div className="mb-5">
                          <p className="text-sm font-semibold text-foreground mb-2">Select Date</p>
                          <div className="flex flex-col gap-2">
                            {availableDates.map(date => (
                              <button
                                key={date}
                                onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
                                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium border transition-all text-left ${
                                  selectedDate === date
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background hover:border-primary hover:text-primary'
                                }`}
                              >
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Time selection */}
                        {selectedDate && (
                          <div className="mb-5">
                            <p className="text-sm font-semibold text-foreground mb-2">
                              Select Time{' '}
                              <span className="text-foreground/40 font-normal">({slotsForDate.length} available)</span>
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {slotsForDate.map(slot => (
                                <button
                                  key={slot._id}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                                    selectedSlot?._id === slot._id
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-background hover:border-primary hover:text-primary'
                                  }`}
                                >
                                  {slot.startTime}{slot.endTime && ` – ${slot.endTime}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Summary */}
                    {selectedSlot && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 text-sm">
                        <p className="font-semibold text-foreground mb-1">Booking summary</p>
                        <div className="flex justify-between text-foreground/70">
                          <span>Date</span>
                          <span className="font-medium">{new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex justify-between text-foreground/70 mt-0.5">
                          <span>Time</span>
                          <span className="font-medium">{selectedSlot.startTime} – {selectedSlot.endTime}</span>
                        </div>
                        <div className="flex justify-between text-foreground/70 mt-0.5">
                          <span>Fee</span>
                          <span className="font-bold text-primary">₹{doctor.hourlyRate}</span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">{error}</p>
                    )}

                    <button
                      onClick={handleBook}
                      disabled={!selectedSlot || booking || slots.length === 0}
                      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {booking ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking…</> : 'Book Appointment'}
                    </button>

                    {!isAuthenticated && (
                      <p className="text-xs text-foreground/50 text-center mt-3">
                        <Link href={`/login?redirect=/doctors/${id}`} className="text-primary hover:underline font-medium">
                          Sign in
                        </Link>{' '}to confirm booking
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
