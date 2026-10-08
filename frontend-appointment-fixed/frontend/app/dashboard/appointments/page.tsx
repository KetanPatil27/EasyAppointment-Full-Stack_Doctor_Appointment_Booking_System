'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { useApp } from '@/lib/app-context'
import {
  getMyAppointments, cancelAppointment, rescheduleAppointment,
  getSlotsByDoctor, Appointment, Slot
} from '@/services/appointmentService'
import { getDoctorByUserId } from '@/services/doctorService'
import {
  Calendar, Clock, IndianRupee, User, X, CheckCircle,
  AlertCircle, XCircle, Loader2, MapPin, RefreshCw
} from 'lucide-react'

interface EnrichedAppointment extends Appointment {
  doctorName?: string
  doctorSpec?: string
  consultationFee?: number
  clinicAddress?: { street?: string; city?: string; state?: string }
  doctorUserId?: string
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({
  apt,
  onClose,
  onSuccess,
}: {
  apt: EnrichedAppointment
  onClose: () => void
  onSuccess: () => void
}) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // doctorId in appointment = doctor's userId
        const all: Slot[] = await getSlotsByDoctor(apt.doctorId)
        // Available slots only, and not the current slot
        const available = all.filter(s => !s.isBooked && s._id !== apt.slotId)
        setSlots(available)
        if (available.length > 0) {
          const dates = [...new Set(available.map(s => s.date))].sort()
          setSelectedDate(dates[0])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSlots(false)
      }
    }
    load()
  }, [apt.doctorId, apt.slotId])

  const availableDates = [...new Set(slots.map(s => s.date))].sort()
  const slotsForDate = slots.filter(s => s.date === selectedDate)

  const handleReschedule = async () => {
    if (!selectedSlot) { setError('Please select a new time slot'); return }
    setSaving(true)
    setError('')
    try {
      await rescheduleAppointment(apt._id, selectedSlot._id)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reschedule. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Reschedule Appointment</h2>
            <p className="text-sm text-foreground/60 mt-0.5">
              Dr. {apt.doctorName} · Currently: {apt.date} {apt.startTime}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-foreground/60" />
          </button>
        </div>

        <div className="p-6">
          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
              <p className="font-medium text-foreground/50">No available slots</p>
              <p className="text-sm text-foreground/35 mt-1">The doctor hasn't added new slots yet.</p>
            </div>
          ) : (
            <>
              {/* Date picker */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-foreground mb-2">Select New Date</p>
                <div className="flex flex-wrap gap-2">
                  {availableDates.map(date => (
                    <button
                      key={date}
                      onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        selectedDate === date
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:border-primary'
                      }`}
                    >
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short'
                      })}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time picker */}
              {selectedDate && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Select Time
                    <span className="text-foreground/40 font-normal ml-2">
                      ({slotsForDate.length} available)
                    </span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {slotsForDate.map(slot => (
                      <button
                        key={slot._id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          selectedSlot?._id === slot._id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary'
                        }`}
                      >
                        {slot.startTime}{slot.endTime && ` – ${slot.endTime}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {selectedSlot && (
                <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium text-foreground mb-1">New appointment details</p>
                  <p className="text-foreground/60">
                    {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })} · {selectedSlot.startTime} – {selectedSlot.endTime}
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={saving || !selectedSlot || slots.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {saving ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  booked:    'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100  text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100   text-red-800',
  rejected:  'bg-gray-100  text-gray-800',
}
const STATUS_ICONS: Record<string, any> = {
  booked:    AlertCircle,
  confirmed: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  rejected:  XCircle,
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PatientAppointmentsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [appointments, setAppointments]   = useState<EnrichedAppointment[]>([])
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState<string>('all')
  const [cancelling, setCancelling]       = useState<string | null>(null)
  const [rescheduling, setRescheduling]   = useState<EnrichedAppointment | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    loadAppointments()
  }, [currentUser, isAuthenticated])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const data = await getMyAppointments()
      // Enrich: appointment.doctorId = doctor's userId → query by userId
      const enriched = await Promise.all(data.map(async (apt: Appointment) => {
        try {
          const doctor = await getDoctorByUserId(apt.doctorId)
          return {
            ...apt,
            doctorName:      doctor?.name             || 'Doctor',
            doctorSpec:      doctor?.specialization   || '',
            consultationFee: apt.consultationFee ?? doctor?.hourlyRate ?? 0,
            clinicAddress:   doctor?.clinicAddress,
            doctorUserId:    apt.doctorId,
          }
        } catch {
          return { ...apt, doctorName: 'Doctor', doctorSpec: '' }
        }
      }))
      setAppointments(enriched.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (err) {
      console.error('Failed to load appointments', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    setCancelling(id)
    try {
      await cancelAppointment(id)
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'cancelled' } : a))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel appointment')
    } finally {
      setCancelling(null)
    }
  }

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter)

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />

      {rescheduling && (
        <RescheduleModal
          apt={rescheduling}
          onClose={() => setRescheduling(null)}
          onSuccess={() => { setRescheduling(null); loadAppointments() }}
        />
      )}

      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">My Appointments</h1>
            <p className="text-foreground/60 text-sm">Manage and track your medical appointments</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto pb-1">
            {(['all', 'booked', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  filter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground/70 hover:bg-muted/80'
                }`}
              >
                {status}
                {status !== 'all' && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-black/10 text-xs">
                    {appointments.filter(a => a.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center">
              <Calendar className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/60 mb-4">
                {filter === 'all' ? 'No appointments yet' : `No ${filter} appointments`}
              </p>
              <button
                onClick={() => router.push('/doctors')}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(apt => {
                const StatusIcon = STATUS_ICONS[apt.status] || AlertCircle
                const canAct = apt.status === 'booked' || apt.status === 'confirmed'
                const clinicCity = apt.clinicAddress?.city
                const clinicStreet = apt.clinicAddress?.street

                return (
                  <div key={apt._id} className="rounded-xl border border-border bg-card p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Doctor info */}
                      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-base">
                            Dr. {apt.doctorName}
                          </h3>
                          {apt.doctorSpec && (
                            <p className="text-sm text-primary">{apt.doctorSpec}</p>
                          )}
                          <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-foreground/60">
                            {apt.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', {
                                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </span>
                            )}
                            {apt.startTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                {apt.startTime}{apt.endTime && ` – ${apt.endTime}`}
                              </span>
                            )}
                            {(clinicStreet || clinicCity) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                {[clinicStreet, clinicCity].filter(Boolean).join(', ')}
                              </span>
                            )}
                            {apt.consultationFee !== undefined && apt.consultationFee > 0 && (
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                ₹{apt.consultationFee}
                              </span>
                            )}
                          </div>
                          {apt.notes && (
                            <p className="text-xs text-foreground/50 mt-1 italic">"{apt.notes}"</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[apt.status]}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {apt.status}
                        </span>
                        {canAct && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRescheduling(apt)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(apt._id)}
                              disabled={cancelling === apt._id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              {cancelling === apt._id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <X className="h-3.5 w-3.5" />
                              }
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
