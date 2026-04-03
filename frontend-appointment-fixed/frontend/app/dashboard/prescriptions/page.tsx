'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { useApp } from '@/lib/app-context'
import { getMyPrescriptions, Prescription } from '@/services/prescriptionService'
import { Pill, Calendar, AlertCircle, Loader2, User, Clock, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

function PrescriptionCard({ presc }: { presc: Prescription }) {
  const [expanded, setExpanded] = useState(false)
  const expired = new Date() > new Date(presc.validUntil)

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      expired ? 'border-red-200 bg-red-50/40' : 'border-border bg-card'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            expired ? 'bg-red-100' : 'bg-primary/10'
          }`}>
            <Pill className={`h-5 w-5 ${expired ? 'text-red-500' : 'text-primary'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground">{presc.diagnosis}</p>
            {presc.doctorName && (
              <p className="text-sm text-primary mt-0.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Dr. {presc.doctorName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {expired
              ? <><AlertCircle className="h-3 w-3" /> Expired</>
              : <><CheckCircle className="h-3 w-3" /> Active</>
            }
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-foreground/60">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Issued: {new Date(presc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Valid until: {new Date(presc.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="flex items-center gap-1">
          <Pill className="h-3.5 w-3.5" />
          {presc.medications.length} medication{presc.medications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Toggle expanded */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline font-medium"
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? 'Hide details' : 'View details'}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Medications */}
          <div>
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-2">Medications</p>
            <div className="space-y-2">
              {presc.medications.map((med, i) => (
                <div key={i} className="rounded-lg bg-muted/50 border border-border/60 px-4 py-3 text-sm">
                  <p className="font-semibold text-foreground">{med.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-foreground/60">
                    {med.dosage    && <span>Dosage: {med.dosage}</span>}
                    {med.frequency && <span>· {med.frequency}</span>}
                    {med.duration  && <span>· {med.duration}</span>}
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-foreground/50 mt-1 italic">{med.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {presc.notes && (
            <div>
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-1">Doctor's Notes</p>
              <p className="text-sm text-foreground/70 bg-muted/50 px-4 py-3 rounded-lg">{presc.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PrescriptionsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    const load = async () => {
      try {
        const data = await getMyPrescriptions()
        setPrescriptions(
          [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        )
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [currentUser, isAuthenticated, router])

  const active  = prescriptions.filter(p => new Date() <= new Date(p.validUntil))
  const expired = prescriptions.filter(p => new Date()  > new Date(p.validUntil))

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-6 md:p-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">My Prescriptions</h1>
            <p className="text-foreground/60">Prescriptions issued by your doctors</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Pill className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/60 font-medium">No prescriptions yet</p>
              <p className="text-sm text-foreground/40 mt-2">Prescriptions issued by doctors will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {active.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                    Active Prescriptions ({active.length})
                  </h2>
                  <div className="space-y-3">
                    {active.map(p => <PrescriptionCard key={p._id} presc={p} />)}
                  </div>
                </div>
              )}
              {expired.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                    Expired Prescriptions ({expired.length})
                  </h2>
                  <div className="space-y-3">
                    {expired.map(p => <PrescriptionCard key={p._id} presc={p} />)}
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
