'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { AppointmentCard } from '@/components/appointment-card'
import { Calendar, Clock, CheckCircle, Search, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMyAppointments, Appointment } from '@/services/appointmentService'
import { getDoctorByUserId } from '@/services/doctorService'

interface EnrichedAppointment extends Appointment {
  doctorName?: string
  doctorSpec?: string
  clinicAddress?: { street?: string; city?: string }
}

export default function DashboardPage() {
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()
  const router = useRouter()
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || currentUser?.role !== 'patient') {
        router.push('/login')
        return
      }
      loadAppointments()
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  const loadAppointments = async () => {
    try {
      const data = await getMyAppointments()
      const enriched = await Promise.all(data.map(async (apt: Appointment) => {
        try {
          const doctor = await getDoctorByUserId(apt.doctorId)
          return {
            ...apt,
            doctorName:    doctor?.name           || 'Doctor',
            doctorSpec:    doctor?.specialization || '',
            clinicAddress: doctor?.clinicAddress,
          }
        } catch {
          return { ...apt, doctorName: 'Doctor' }
        }
      }))
      setAppointments(Array.isArray(enriched) ? enriched : [])
    } catch (err) {
      console.error('Failed to load appointments', err)
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

  const upcomingAppts  = appointments.filter(a => ['booked', 'confirmed'].includes(a.status))
  const completedAppts = appointments.filter(a => a.status === 'completed')
  const cancelledAppts = appointments.filter(a => a.status === 'cancelled')

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">

        {/* Page header */}
        <div className="border-b border-border">
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-foreground/60 mt-1 text-sm">Manage your health appointments in one place</p>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-5xl">

          {/* ── Quick actions — prominent "Find a Doctor" at top ── */}
          <section className="mb-8 sm:mb-10">
            <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

              {/* Find a Doctor — primary action */}
              <Link
                href="/doctors"
                className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Search className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-base">Find a Doctor</p>
                  <p className="text-primary-foreground/70 text-xs mt-0.5">Browse & book appointments</p>
                </div>
              </Link>

              {/* View Appointments */}
              <Link
                href="/dashboard/appointments"
                className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-base text-foreground">Appointments</p>
                  <p className="text-foreground/50 text-xs mt-0.5">View all bookings</p>
                </div>
              </Link>

              {/* Messages */}
              <Link
                href="/dashboard/messages"
                className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-base text-foreground">Messages</p>
                  <p className="text-foreground/50 text-xs mt-0.5">Chat with doctors</p>
                </div>
              </Link>
            </div>
          </section>

          {/* ── Stats ── */}
          <section className="mb-8 sm:mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">{loading ? '—' : upcomingAppts.length}</span>
                </div>
                <p className="font-semibold text-foreground text-sm sm:text-base">Upcoming</p>
                <p className="text-xs sm:text-sm text-foreground/50 mt-0.5">Booked & confirmed</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">{loading ? '—' : completedAppts.length}</span>
                </div>
                <p className="font-semibold text-foreground text-sm sm:text-base">Completed</p>
                <p className="text-xs sm:text-sm text-foreground/50 mt-0.5">Past consultations</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">{loading ? '—' : cancelledAppts.length}</span>
                </div>
                <p className="font-semibold text-foreground">Cancelled</p>
                <p className="text-sm text-foreground/50 mt-0.5">Cancelled appointments</p>
              </div>
            </div>
          </section>

          {/* ── Upcoming appointments ── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">Upcoming Appointments</h2>
              <Link href="/dashboard/appointments" className="text-primary hover:underline font-medium text-sm">
                View All →
              </Link>
            </div>
            {loading ? (
              <p className="text-foreground/60 text-sm">Loading appointments…</p>
            ) : upcomingAppts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {upcomingAppts.slice(0, 4).map(apt => (
                  <AppointmentCard
                    key={apt._id}
                    id={apt._id}
                    doctorId={apt.doctorId}
                    doctorName={apt.doctorName}
                    doctorSpec={apt.doctorSpec}
                    status={apt.status as any}
                    slotId={apt.slotId}
                    createdAt={apt.createdAt}
                    date={apt.date}
                    startTime={apt.startTime}
                    endTime={apt.endTime}
                    clinicAddress={apt.clinicAddress}
                    onCancel={loadAppointments}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 text-center">
                <Calendar className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                <p className="text-foreground/60 font-medium mb-4">No upcoming appointments</p>
                <Link
                  href="/doctors"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Find a Doctor
                </Link>
              </div>
            )}
          </section>

          {/* ── Recently completed ── */}
          {completedAppts.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-foreground mb-5">Recently Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {completedAppts.slice(0, 2).map(apt => (
                  <AppointmentCard
                    key={apt._id}
                    id={apt._id}
                    doctorId={apt.doctorId}
                    doctorName={apt.doctorName}
                    doctorSpec={apt.doctorSpec}
                    status={apt.status as any}
                    slotId={apt.slotId}
                    createdAt={apt.createdAt}
                    date={apt.date}
                    startTime={apt.startTime}
                    endTime={apt.endTime}
                    clinicAddress={apt.clinicAddress}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
