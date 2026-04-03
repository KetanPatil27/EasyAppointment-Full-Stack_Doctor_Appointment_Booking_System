'use client'

import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { Calendar, Users, Clock, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { getMyAppointments, Appointment } from '@/services/appointmentService'
import { getMyDoctorProfile, Doctor } from '@/services/doctorService'
import { DoctorPendingGate } from '@/components/doctor-pending-gate'
import api from '@/services/api'

interface EnrichedAppointment extends Appointment {
  patientName?: string
  patientEmail?: string
}

export default function DoctorDashboardPage() {
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()
  const router = useRouter()
  const [appointments, setAppointments]   = useState<EnrichedAppointment[]>([])
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null)
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || currentUser?.role !== 'doctor') {
        router.push('/login')
        return
      }
      loadData()
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      const [appts, profile] = await Promise.all([
        getMyAppointments().catch(() => []),
        getMyDoctorProfile().catch(() => null)
      ])

      // Enrich appointments with patient names
      const sorted = (Array.isArray(appts) ? appts : []).sort((a: Appointment, b: Appointment) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const enriched: EnrichedAppointment[] = await Promise.all(
        sorted.slice(0, 10).map(async (apt: Appointment) => {
          try {
            const user = await api.get(`/users/${apt.patientId}`)
            return { ...apt, patientName: user.data.name, patientEmail: user.data.email }
          } catch {
            return { ...apt, patientName: 'Deleted Account' }
          }
        })
      )
      setAppointments(enriched)
      setDoctorProfile(profile)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  if (isAuthLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground/60">Loading…</p>
      </div>
    )
  }

  const pending   = appointments.filter(a => a.status === 'booked').length
  const confirmed = appointments.filter(a => a.status === 'confirmed').length
  const completed = appointments.filter(a => a.status === 'completed').length
  const today     = new Date().toISOString().split('T')[0]
  const todayCount = appointments.filter(a =>
    a.date === today && ['booked', 'confirmed'].includes(a.status)
  ).length

  return (
    <div className="min-h-screen bg-background flex">
      <DoctorSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <DoctorPendingGate>
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Welcome back, Dr. {currentUser.name}
            </h1>
            {doctorProfile && (
              <p className="text-foreground/60">
                {doctorProfile.specialization} · {doctorProfile.experience} years experience
              </p>
            )}
          </div>

          {!doctorProfile && !loading && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-800 font-medium">Your doctor profile is incomplete.</p>
              <Link href="/doctor/profile" className="text-primary hover:underline text-sm mt-1 inline-block">
                Complete your profile →
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Today's Appointments", value: todayCount,  icon: Calendar,    color: 'text-primary' },
              { label: 'Pending',              value: pending,    icon: Clock,        color: 'text-yellow-500' },
              { label: 'Confirmed',            value: confirmed,  icon: Users,        color: 'text-green-500' },
              { label: 'Completed',            value: completed,  icon: IndianRupee,  color: 'text-blue-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-6 w-6 ${color}`} />
                  <span className="text-2xl font-bold text-foreground">{loading ? '…' : value}</span>
                </div>
                <p className="text-sm font-medium text-foreground/70">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Appointments — with patient name */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Recent Appointments</h2>
              {loading ? (
                <p className="text-foreground/60 text-sm">Loading…</p>
              ) : appointments.length === 0 ? (
                <p className="text-foreground/60 text-sm">No appointments yet.</p>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 5).map(apt => (
                    <div key={apt._id} className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {apt.patientName || 'Patient'}
                        </p>
                        {apt.patientEmail && (
                          <p className="text-xs text-foreground/50 truncate">{apt.patientEmail}</p>
                        )}
                        {(apt.date || apt.startTime) && (
                          <p className="text-xs text-foreground/40 mt-0.5">
                            {apt.date && new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {apt.startTime && ` · ${apt.startTime}`}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        apt.status === 'booked'     ? 'bg-yellow-100 text-yellow-700' :
                        apt.status === 'confirmed'  ? 'bg-blue-100   text-blue-700'   :
                        apt.status === 'completed'  ? 'bg-green-100  text-green-700'  :
                        'bg-red-100 text-red-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/doctor/appointments" className="block mt-4 text-primary hover:underline text-sm font-medium">
                View All →
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {[
                  { href: '/doctor/availability', label: 'Manage Availability', desc: 'Set your appointment slots' },
                  { href: '/doctor/appointments', label: 'View Appointments',   desc: 'Manage patient bookings'   },
                  { href: '/doctor/medical-records', label: 'Prescriptions',    desc: 'Write prescriptions'       },
                  { href: '/doctor/profile',       label: 'Update Profile',     desc: 'Keep your profile current' },
                ].map(({ href, label, desc }) => (
                  <Link key={href} href={href} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground text-sm">{label}</p>
                      <p className="text-xs text-foreground/60">{desc}</p>
                    </div>
                    <span className="text-primary text-lg">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        </DoctorPendingGate>
      </div>
    </div>
  )
}
