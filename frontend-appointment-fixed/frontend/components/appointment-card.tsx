'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cancelAppointment } from '@/services/appointmentService'

interface AppointmentCardProps {
  id: string
  doctorId: string
  doctorName?: string
  doctorSpec?: string
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  slotId: string
  createdAt: string
  date?: string
  startTime?: string
  endTime?: string
  clinicAddress?: { street?: string; city?: string; state?: string }
  onCancel?: () => void
}

const statusConfig = {
  booked:    { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700', Icon: AlertCircle },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100  text-blue-700',    Icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700',   Icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100   text-red-700',     Icon: X },
  rejected:  { label: 'Rejected',  color: 'bg-gray-100  text-gray-700',    Icon: X },
}

export function AppointmentCard({
  id, doctorName, doctorSpec, status, createdAt,
  date, startTime, endTime, clinicAddress, onCancel
}: AppointmentCardProps) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    if (!confirm('Cancel this appointment?')) return
    setCancelling(true)
    try {
      await cancelAppointment(id)
      onCancel?.()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  const cfg = statusConfig[status] || statusConfig.booked
  const { Icon } = cfg
  const clinicLabel = [clinicAddress?.street, clinicAddress?.city].filter(Boolean).join(', ')

  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-foreground text-base truncate">
            {doctorName ? `Dr. ${doctorName}` : <span className="text-foreground/40 text-sm">Loading…</span>}
          </p>
          {doctorSpec && <p className="text-sm text-primary mt-0.5">{doctorSpec}</p>}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.color}`}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-foreground/70">
        {date && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary/60 shrink-0" />
            <span>
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
        )}
        {startTime && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary/60 shrink-0" />
            <span>{startTime}{endTime ? ` – ${endTime}` : ''}</span>
          </div>
        )}
        {clinicLabel && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
            <span>{clinicLabel}</span>
          </div>
        )}
      </div>

      {['booked', 'confirmed'].includes(status) && onCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 font-medium disabled:opacity-50 transition-colors"
        >
          {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
        </button>
      )}
    </div>
  )
}
