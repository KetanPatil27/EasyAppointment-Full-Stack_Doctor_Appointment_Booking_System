'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { useApp } from '@/lib/app-context'
import { getMyAppointments, updateAppointmentStatus, Appointment } from '@/services/appointmentService'
import { createPrescription, Medication } from '@/services/prescriptionService'
import {
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
  Loader2, X, Eye, Pill, Plus, Trash2
} from 'lucide-react'
import api from '@/services/api'
import { DoctorPendingGate } from '@/components/doctor-pending-gate'

interface EnrichedAppointment extends Appointment {
  patientName?: string
  patientEmail?: string
  patientPhone?: string
}

const STATUS_STYLES: Record<string, string> = {
  booked:    'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100  text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100   text-red-800',
  rejected:  'bg-gray-100  text-gray-800',
}

// ── Patient Details Modal ──────────────────────────────────────────────────────
function PatientDetailsModal({ apt, onClose }: { apt: EnrichedAppointment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Patient Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-foreground/60" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{apt.patientName || 'Patient'}</p>
              <p className="text-sm text-foreground/50">Patient</p>
            </div>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {[
              { label: 'Full Name',  value: apt.patientName  || '—' },
              { label: 'Email',      value: apt.patientEmail || '—' },
              { label: 'Phone',      value: apt.patientPhone || '—' },
              { label: 'Appt. Date', value: apt.date
                  ? new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })
                  : '—' },
              { label: 'Time',       value: apt.startTime
                  ? `${apt.startTime}${apt.endTime ? ` – ${apt.endTime}` : ''}`
                  : '—' },
              { label: 'Status',     value: apt.status, capitalize: true },
              { label: 'Notes',      value: apt.notes || 'None' },
            ].map(({ label, value, capitalize }) => (
              <div key={label} className="flex items-start px-4 py-3 bg-card">
                <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide w-28 shrink-0 pt-0.5">
                  {label}
                </p>
                <p className={`text-sm text-foreground ${capitalize ? 'capitalize' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Write Prescription Modal ───────────────────────────────────────────────────
function PrescriptionModal({ apt, onClose, onSaved }: {
  apt: EnrichedAppointment; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({
    diagnosis: '',
    notes: '',
    validUntil: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }] as Medication[]
  })

  const addMed = () =>
    setForm(f => ({ ...f, medications: [...f.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }] }))

  const removeMed = (i: number) =>
    setForm(f => ({ ...f, medications: f.medications.filter((_, idx) => idx !== i) }))

  const updateMed = (i: number, field: keyof Medication, val: string) =>
    setForm(f => ({
      ...f,
      medications: f.medications.map((m, idx) => idx === i ? { ...m, [field]: val } : m)
    }))

  const handleSave = async () => {
    if (!form.diagnosis.trim()) { setError('Diagnosis is required'); return }
    if (!form.validUntil)        { setError('Valid until date is required'); return }
    if (form.medications.some(m => !m.name.trim())) { setError('All medications need a name'); return }
    setSaving(true)
    setError('')
    try {
      await createPrescription({
        patientId: apt.patientId,
        appointmentId: apt._id,
        diagnosis: form.diagnosis,
        notes: form.notes,
        validUntil: form.validUntil,
        medications: form.medications,
      })
      setSaved(true)
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save prescription')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Write Prescription</h2>
            <p className="text-sm text-foreground/60 mt-0.5">Patient: {apt.patientName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-foreground/60" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Diagnosis *</label>
            <input
              value={form.diagnosis}
              onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="e.g. Hypertension, Diabetes Type 2"
              className={inputCls}
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground/70">Medications *</label>
              <button onClick={addMed} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add medication
              </button>
            </div>
            <div className="space-y-3">
              {form.medications.map((med, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-foreground/50">Medication {i + 1}</p>
                    {form.medications.length > 1 && (
                      <button onClick={() => removeMed(i)} className="text-destructive hover:text-destructive/70">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input value={med.name} onChange={e => updateMed(i, 'name', e.target.value)}
                        placeholder="Drug name *" className={inputCls} />
                    </div>
                    <input value={med.dosage}    onChange={e => updateMed(i, 'dosage', e.target.value)}
                      placeholder="Dosage (e.g. 500mg)" className={inputCls} />
                    <input value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}
                      placeholder="Frequency (e.g. Twice daily)" className={inputCls} />
                    <input value={med.duration}  onChange={e => updateMed(i, 'duration', e.target.value)}
                      placeholder="Duration (e.g. 7 days)" className={inputCls} />
                    <input value={med.instructions || ''} onChange={e => updateMed(i, 'instructions', e.target.value)}
                      placeholder="Instructions (optional)" className={inputCls} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Valid Until */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Valid Until *</label>
              <input type="date" value={form.validUntil}
                onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes" className={inputCls} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          {saved  && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Prescription saved!</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Prescription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DoctorAppointmentsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [appointments,   setAppointments]   = useState<EnrichedAppointment[]>([])
  const [loading,        setLoading]        = useState(true)
  const [filter,         setFilter]         = useState<string>('all')
  const [actionLoading,  setActionLoading]  = useState<string | null>(null)
  const [viewPatient,    setViewPatient]    = useState<EnrichedAppointment | null>(null)
  const [writePrescription, setWritePrescription] = useState<EnrichedAppointment | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    if (currentUser.role !== 'doctor')    { router.push('/');       return }
    loadAppointments()
  }, [currentUser])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const { getMyDoctorProfile } = await import('@/services/doctorService')
      const [data, doctorProfile] = await Promise.all([
        getMyAppointments(),
        getMyDoctorProfile()
      ])
      const fallbackFee = doctorProfile?.hourlyRate || 0

      const enriched = await Promise.all(data.map(async (apt: Appointment) => {
        try {
          const user = await api.get(`/users/${apt.patientId}`)
          return {
            ...apt,
            consultationFee: apt.consultationFee || fallbackFee,
            patientName:  user.data.name,
            patientEmail: user.data.email,
            patientPhone: user.data.phone || '—',
          }
        } catch {
          return { ...apt, consultationFee: apt.consultationFee || fallbackFee, patientName: 'Deleted Account' }
        }
      }))
      setAppointments(enriched.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleStatusUpdate = async (id: string, status: 'confirmed' | 'completed' | 'rejected') => {
    setActionLoading(id)
    try {
      await updateAppointmentStatus(id, status)
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status } : a))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status')
    } finally { setActionLoading(null) }
  }

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter)

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />

      {viewPatient && (
        <PatientDetailsModal apt={viewPatient} onClose={() => setViewPatient(null)} />
      )}
      {writePrescription && (
        <PrescriptionModal
          apt={writePrescription}
          onClose={() => setWritePrescription(null)}
          onSaved={loadAppointments}
        />
      )}

      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <DoctorPendingGate>
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Appointments</h1>
            <p className="text-foreground/60">Manage patient appointments and consultations</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'booked', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
              <button key={status} onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/70 hover:bg-muted/80'
                }`}>
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
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Calendar className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/60">No {filter === 'all' ? '' : filter} appointments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(apt => (
                <div key={apt._id} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Patient info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{apt.patientName || 'Patient'}</h3>
                        {apt.patientEmail && (
                          <p className="text-sm text-foreground/50">{apt.patientEmail}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-foreground/60">
                          {apt.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', {
                                weekday: 'short', day: 'numeric', month: 'short'
                              })}
                            </span>
                          )}
                          {apt.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {apt.startTime}{apt.endTime && ` – ${apt.endTime}`}
                            </span>
                          )}
                        </div>
                        {apt.notes && <p className="text-sm text-foreground/50 mt-1 italic">"{apt.notes}"</p>}

                        {/* Fee Display */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-foreground/60">Consultation Fee:</span>
                          <span className="text-sm font-semibold text-foreground">
                            {apt.consultationFee ? `₹${apt.consultationFee}` : 'Not set'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions column */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[apt.status]}`}>
                        {apt.status}
                      </span>

                      {/* View patient + Write prescription */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewPatient(apt)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground/70 hover:bg-muted/80 transition-colors">
                          <Eye className="h-3.5 w-3.5" /> Patient
                        </button>
                        {(apt.status === 'confirmed' || apt.status === 'completed') && (
                          <button
                            onClick={() => setWritePrescription(apt)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
                            <Pill className="h-3.5 w-3.5" /> Prescribe
                          </button>
                        )}
                      </div>

                      {/* Status actions */}
                      {apt.status === 'booked' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleStatusUpdate(apt._id, 'confirmed')}
                            disabled={actionLoading === apt._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
                            <CheckCircle className="h-3 w-3" /> Confirm
                          </button>
                          <button onClick={() => handleStatusUpdate(apt._id, 'rejected')}
                            disabled={actionLoading === apt._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      )}
                      {apt.status === 'confirmed' && (
                        <button onClick={() => handleStatusUpdate(apt._id, 'completed')}
                          disabled={actionLoading === apt._id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
                          {actionLoading === apt._id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle className="h-3 w-3" />}
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </DoctorPendingGate>
      </div>
    </div>
  )
}
