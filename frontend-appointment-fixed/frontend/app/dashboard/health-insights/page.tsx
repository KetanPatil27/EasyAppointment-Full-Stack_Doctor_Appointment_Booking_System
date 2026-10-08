'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { useApp } from '@/lib/app-context'
import { getMyAppointments } from '@/services/appointmentService'
import { getDoctorByUserId } from '@/services/doctorService'
import { getHealthData, saveHealthData, updateHealthData, HealthData } from '@/services/healthDataService'
import { getMyPatientProfile } from '@/services/patientService'
import { Activity, Heart, Loader2, Save, TrendingUp, Calendar, CheckCircle, Stethoscope } from 'lucide-react'

export default function HealthInsightsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)

  const [stats, setStats] = useState({ total: 0, completed: 0, upcoming: 0, cancelled: 0 })
  const [topConcerns, setTopConcerns] = useState<{ spec: string; count: number }[]>([])

  const [vitals, setVitals] = useState<Partial<HealthData>>({
    weight: undefined, height: undefined,
    heartRate: undefined, bloodSugar: undefined,
    bloodPressure: { systolic: 0, diastolic: 0 },
    notes: ''
  })

  const [patientProfile, setPatientProfile] = useState<any>(null)

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    loadData()
  }, [currentUser, isAuthenticated])

  const loadData = async () => {
    setLoading(true)
    try {
      const [appts, healthRecords, profile] = await Promise.all([
        getMyAppointments(),
        getHealthData(),
        getMyPatientProfile()
      ])

      setStats({
        total:     appts.length,
        completed: appts.filter((a: any) => a.status === 'completed').length,
        upcoming:  appts.filter((a: any) => ['booked', 'confirmed'].includes(a.status)).length,
        cancelled: appts.filter((a: any) => a.status === 'cancelled').length,
      })

      // Top Medical Concerns: count specializations from completed/confirmed appointments
      const relevantAppts = appts.filter((a: any) => ['completed', 'confirmed', 'booked'].includes(a.status))
      const specCounts: Record<string, number> = {}
      await Promise.all(relevantAppts.map(async (a: any) => {
        try {
          const doc = await getDoctorByUserId(a.doctorId)
          if (doc?.specialization) {
            specCounts[doc.specialization] = (specCounts[doc.specialization] || 0) + 1
          }
        } catch { /* skip */ }
      }))
      const concerns = Object.entries(specCounts)
        .map(([spec, count]) => ({ spec, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
      setTopConcerns(concerns)

      setPatientProfile(profile)

      if (healthRecords.length > 0) {
        const latest = healthRecords[0]
        setExistingId(latest._id || null)
        setVitals({
          weight:        latest.weight,
          height:        latest.height,
          heartRate:     latest.heartRate,
          bloodSugar:    latest.bloodSugar,
          bloodPressure: latest.bloodPressure || { systolic: 0, diastolic: 0 },
          notes:         latest.notes || ''
        })
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const getBMI = () => {
    if (!vitals.weight || !vitals.height) return null
    const h = vitals.height / 100
    return (vitals.weight / (h * h)).toFixed(1)
  }
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' }
    if (bmi < 25)   return { label: 'Normal',      color: 'text-green-600' }
    if (bmi < 30)   return { label: 'Overweight',  color: 'text-yellow-600' }
    return               { label: 'Obese',         color: 'text-red-600' }
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      const bmi = getBMI()
      const data = { ...vitals, bmi: bmi ? parseFloat(bmi) : undefined }
      if (existingId) {
        await updateHealthData(existingId, data)
      } else {
        const result = await saveHealthData(data)
        setExistingId(result._id || null)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const bmi = getBMI()
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null

  if (loading) return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex items-center justify-center ml-0 pt-14 lg:ml-64 lg:pt-0">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Health Insights</h1>
            <p className="text-foreground/60 text-sm">Track your health metrics and appointment history</p>
          </div>

          {/* Appointment Status Summary */}
          <section className="mb-8">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Appointment Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Total',     value: stats.total,     color: 'bg-blue-100  text-blue-700',   icon: Calendar    },
                { label: 'Completed', value: stats.completed, color: 'bg-green-100 text-green-700',  icon: CheckCircle },
                { label: 'Upcoming',  value: stats.upcoming,  color: 'bg-yellow-100 text-yellow-700', icon: TrendingUp  },
                { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-100   text-red-700',    icon: Activity    },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className={`inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${color} mb-3`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs sm:text-sm text-foreground/60">{label} Appointments</p>
                </div>
              ))}
            </div>
          </section>

          {/* Top Medical Concerns */}
          {topConcerns.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-foreground mb-1">Top Medical Concerns</h2>
              <p className="text-sm text-foreground/50 mb-4">Based on your appointment history</p>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="space-y-3">
                  {topConcerns.map(({ spec, count }, i) => {
                    const maxCount = topConcerns[0].count
                    const pct = Math.round((count / maxCount) * 100)
                    return (
                      <div key={spec}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-primary/60 shrink-0" />
                            <span className="text-sm font-medium text-foreground">{spec}</span>
                          </div>
                          <span className="text-xs text-foreground/50">
                            {count} visit{count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Patient profile summary */}
          {patientProfile && (
            <section className="mb-8">
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-semibold text-foreground mb-3">Medical Profile</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {patientProfile.bloodGroup && (
                    <div>
                      <p className="text-foreground/50 text-xs">Blood Group</p>
                      <p className="font-semibold text-foreground mt-0.5">{patientProfile.bloodGroup}</p>
                    </div>
                  )}
                  {patientProfile.gender && (
                    <div>
                      <p className="text-foreground/50 text-xs">Gender</p>
                      <p className="font-semibold text-foreground capitalize mt-0.5">{patientProfile.gender}</p>
                    </div>
                  )}
                  {patientProfile.dateOfBirth && (
                    <div>
                      <p className="text-foreground/50 text-xs">Date of Birth</p>
                      <p className="font-semibold text-foreground mt-0.5">{patientProfile.dateOfBirth}</p>
                    </div>
                  )}
                </div>
                {patientProfile.allergies && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-foreground/50">Allergies</p>
                    <p className="text-sm text-foreground mt-1">{patientProfile.allergies}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Health Vitals */}
          <section>
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Heart className="h-6 w-6 text-red-500" />
                  <h2 className="font-semibold text-foreground text-lg">Health Vitals</h2>
                </div>
                {saved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Saved!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Weight (kg)</label>
                  <input type="number" value={vitals.weight || ''}
                    onChange={e => setVitals(v => ({ ...v, weight: parseFloat(e.target.value) || undefined }))}
                    placeholder="e.g. 70" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Height (cm)</label>
                  <input type="number" value={vitals.height || ''}
                    onChange={e => setVitals(v => ({ ...v, height: parseFloat(e.target.value) || undefined }))}
                    placeholder="e.g. 175" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Heart Rate (bpm)</label>
                  <input type="number" value={vitals.heartRate || ''}
                    onChange={e => setVitals(v => ({ ...v, heartRate: parseFloat(e.target.value) || undefined }))}
                    placeholder="e.g. 72" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Blood Sugar (mg/dL)</label>
                  <input type="number" value={vitals.bloodSugar || ''}
                    onChange={e => setVitals(v => ({ ...v, bloodSugar: parseFloat(e.target.value) || undefined }))}
                    placeholder="e.g. 100" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Blood Pressure</label>
                  <div className="flex gap-2">
                    <input type="number" value={vitals.bloodPressure?.systolic || ''}
                      onChange={e => setVitals(v => ({ ...v, bloodPressure: { ...v.bloodPressure!, systolic: parseInt(e.target.value) || 0 } }))}
                      placeholder="120" className={inputCls} />
                    <span className="text-foreground/40 flex items-center">/</span>
                    <input type="number" value={vitals.bloodPressure?.diastolic || ''}
                      onChange={e => setVitals(v => ({ ...v, bloodPressure: { ...v.bloodPressure!, diastolic: parseInt(e.target.value) || 0 } }))}
                      placeholder="80" className={inputCls} />
                  </div>
                </div>
                {bmi && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3 flex flex-col justify-center">
                    <p className="text-xs text-foreground/50">BMI (auto-calculated)</p>
                    <p className="text-xl font-bold text-foreground">{bmi}</p>
                    {bmiCategory && <p className={`text-xs font-medium ${bmiCategory.color}`}>{bmiCategory.label}</p>}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground/70 mb-1">Notes</label>
                <textarea value={vitals.notes || ''}
                  onChange={e => setVitals(v => ({ ...v, notes: e.target.value }))}
                  rows={2} placeholder="Any health notes…"
                  className={`${inputCls} resize-none`} />
              </div>

              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save Vitals'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
