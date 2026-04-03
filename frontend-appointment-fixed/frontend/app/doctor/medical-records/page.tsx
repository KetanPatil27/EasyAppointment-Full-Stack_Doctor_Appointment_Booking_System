'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { useApp } from '@/lib/app-context'
import {
  createPrescription, getMyPrescriptions, deletePrescription,
  Prescription, Medication
} from '@/services/prescriptionService'
import { getMyAppointments } from '@/services/appointmentService'
import {
  Pill, Plus, X, Save, Loader2, CheckCircle,
  Trash2, User, Calendar, AlertTriangle
} from 'lucide-react'
import api from '@/services/api'
import { DoctorPendingGate } from '@/components/doctor-pending-gate'

// ── Confirmation dialog ───────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, message, onConfirm, onCancel, loading
}: {
  open: boolean; title: string; message: string
  onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="font-bold text-foreground text-lg">{title}</h3>
        </div>
        <p className="text-foreground/60 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary'

export default function DoctorMedicalRecordsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients,      setPatients]      = useState<{ id: string; name: string }[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error,    setError]    = useState('')

  // Delete state
  const [deleteId,      setDeleteId]      = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [form, setForm] = useState({
    patientId: '',
    diagnosis: '',
    notes: '',
    validUntil: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }] as Medication[]
  })

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    if (currentUser.role !== 'doctor')   { router.push('/');       return }
    loadData()
  }, [currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      const [appts, presc] = await Promise.all([
        getMyAppointments(),
        getMyPrescriptions()
      ])
      // Build unique patient list from appointments for the "create" dropdown
      const seen = new Set<string>()
      const patientData: { id: string; name: string }[] = []
      for (const a of appts) {
        if (!seen.has(a.patientId)) {
          seen.add(a.patientId)
          try {
            const user = await api.get(`/users/${a.patientId}`)
            patientData.push({ id: a.patientId, name: user.data.name || 'Patient' })
          } catch {
            patientData.push({ id: a.patientId, name: 'Patient …' + a.patientId.slice(-4) })
          }
        }
      }
      setPatients(patientData)
      setPrescriptions(presc)
    } catch (err) {
      console.error('loadData error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Medication helpers ────────────────────────────────────────────────────
  const addMedication = () =>
    setForm(f => ({
      ...f,
      medications: [...f.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }))

  const removeMedication = (idx: number) =>
    setForm(f => ({ ...f, medications: f.medications.filter((_, i) => i !== idx) }))

  const updateMed = (idx: number, field: keyof Medication, value: string) =>
    setForm(f => ({
      ...f,
      medications: f.medications.map((m, i) => i === idx ? { ...m, [field]: value } : m)
    }))

  // ── Create prescription ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId) { setError('Select a patient'); return }
    if (!form.diagnosis)  { setError('Enter diagnosis');  return }
    if (!form.validUntil) { setError('Enter valid until date'); return }
    if (form.medications.some(m => !m.name || !m.dosage)) {
      setError('Fill medicine name and dosage for all entries')
      return
    }
    setSaving(true); setError('')
    try {
      const presc = await createPrescription(form)
      // Reload to get server-joined patientName
      const updated = await getMyPrescriptions()
      setPrescriptions(updated)
      setShowForm(false)
      setSaved(true)
      setForm({
        patientId: '', diagnosis: '', notes: '', validUntil: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
      })
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create prescription')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete prescription ───────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      await deletePrescription(deleteId)
      setPrescriptions(prev => prev.filter(p => p._id !== deleteId))
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete prescription')
    } finally {
      setDeleteLoading(false)
      setDeleteId(null)
    }
  }

  // ── Prescription being deleted (for confirm dialog message) ───────────────
  const prescToDelete = prescriptions.find(p => p._id === deleteId)

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Prescription"
        message={`Are you sure you want to delete the prescription for ${prescToDelete?.patientName || 'this patient'} (${prescToDelete?.diagnosis || ''})?  This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />

      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <DoctorPendingGate>
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Prescriptions</h1>
              <p className="text-foreground/60 text-sm">Create and manage patient prescriptions</p>
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Saved!
                </span>
              )}
              <button
                onClick={() => { setShowForm(!showForm); setError('') }}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> New Prescription
              </button>
            </div>
          </div>

          {/* Global error */}
          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* ── Create Form ── */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 mb-8 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-foreground text-lg">New Prescription</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-foreground/40 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Patient *</label>
                  <select
                    value={form.patientId}
                    onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                    required className={inputCls}
                  >
                    <option value="">Select patient…</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {patients.length === 0 && (
                    <p className="text-xs text-foreground/40 mt-1">
                      Patients appear here once you have appointments with them.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Valid Until *</label>
                  <input
                    type="date" value={form.validUntil} required
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Diagnosis *</label>
                <input
                  type="text" value={form.diagnosis} required
                  placeholder="Primary diagnosis"
                  onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Medications *</label>
                  <button type="button" onClick={addMedication}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add medication
                  </button>
                </div>
                <div className="space-y-3">
                  {form.medications.map((med, idx) => (
                    <div key={idx} className="bg-muted/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">
                          Medication {idx + 1}
                        </span>
                        {form.medications.length > 1 && (
                          <button type="button" onClick={() => removeMedication(idx)}
                            className="text-destructive hover:text-destructive/70 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" value={med.name} required placeholder="Medicine name *"
                          onChange={e => updateMed(idx, 'name', e.target.value)}
                          className={inputCls} />
                        <input type="text" value={med.dosage} required placeholder="Dosage (e.g. 500mg) *"
                          onChange={e => updateMed(idx, 'dosage', e.target.value)}
                          className={inputCls} />
                        <input type="text" value={med.frequency} placeholder="Frequency (e.g. Twice daily)"
                          onChange={e => updateMed(idx, 'frequency', e.target.value)}
                          className={inputCls} />
                        <input type="text" value={med.duration} placeholder="Duration (e.g. 7 days)"
                          onChange={e => updateMed(idx, 'duration', e.target.value)}
                          className={inputCls} />
                        <input type="text" value={med.instructions} placeholder="Instructions (optional)"
                          onChange={e => updateMed(idx, 'instructions', e.target.value)}
                          className="sm:col-span-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes} rows={2} placeholder="Additional notes…"
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Create Prescription'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ── Prescriptions List ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Pill className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/60 font-medium">No prescriptions created yet</p>
              <p className="text-foreground/40 text-sm mt-1">Click "New Prescription" to create one</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-foreground/50">{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}</p>
              {prescriptions.map(p => (
                <div key={p._id} className="bg-card rounded-xl border border-border p-5 sm:p-6 hover:border-primary/30 transition-colors">

                  {/* Card header: patient info + delete button */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      {/* Patient name — prominent */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground leading-tight">
                            {p.patientName || 'Patient'}
                          </p>
                          <p className="text-xs text-foreground/50">Patient</p>
                        </div>
                      </div>
                    </div>

                    {/* Date + delete */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <button
                        onClick={() => setDeleteId(p._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors"
                        title="Delete prescription"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="mb-3 px-4 py-3 bg-muted/40 rounded-xl">
                    <p className="text-xs text-foreground/50 uppercase tracking-wide font-semibold mb-0.5">Diagnosis</p>
                    <p className="font-semibold text-foreground">{p.diagnosis}</p>
                  </div>

                  {/* Medications */}
                  <div className="mb-3">
                    <p className="text-xs text-foreground/50 uppercase tracking-wide font-semibold mb-2">Medications</p>
                    <div className="space-y-1.5">
                      {p.medications.map((med, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-sm text-foreground/80">
                          <span className="text-primary font-bold shrink-0">•</span>
                          <span>
                            <span className="font-semibold text-foreground">{med.name}</span>
                            {med.dosage    && <span> {med.dosage}</span>}
                            {med.frequency && <span className="text-foreground/60"> — {med.frequency}</span>}
                            {med.duration  && <span className="text-foreground/50"> for {med.duration}</span>}
                            {med.instructions && (
                              <span className="text-foreground/40 italic"> ({med.instructions})</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer row: valid until + notes */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border text-xs text-foreground/50">
                    <span>
                      Valid until:{' '}
                      <span className="font-medium text-foreground/70">
                        {new Date(p.validUntil).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </span>
                    {p.notes && (
                      <span className="italic">Note: {p.notes}</span>
                    )}
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
