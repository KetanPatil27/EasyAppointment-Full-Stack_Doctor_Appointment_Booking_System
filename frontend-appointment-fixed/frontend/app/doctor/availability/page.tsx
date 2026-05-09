'use client'

import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { createSlot, deleteSlot, getMySlots, Slot } from '@/services/appointmentService'
import { Plus, Trash2, Calendar, RefreshCw } from 'lucide-react'
import { DoctorPendingGate } from '@/components/doctor-pending-gate'

export default function DoctorAvailabilityPage() {
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || currentUser?.role !== 'doctor') {
        router.push('/login')
        return
      }
      loadSlots()
      // Auto-refresh every 30s to pick up status changes from bookings
      const interval = setInterval(loadSlots, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  const loadSlots = async () => {
    if (!currentUser?._id) return
    setLoading(true)
    try {
      // Pass currentUser._id so the wire request explicitly scopes to this doctor
      // (layer 3 of defense-in-depth; backend hook also enforces this).
      const data = await getMySlots(currentUser._id)
      setSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load slots', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date || !form.startTime || !form.endTime) {
      setError('All fields are required')
      return
    }
    if (form.startTime >= form.endTime) {
      setError('End time must be after start time')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createSlot(form)
      setSuccess('Slot added successfully')
      setForm({ date: '', startTime: '', endTime: '' })
      loadSlots()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add slot')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slotId: string) => {
    if (!confirm('Delete this slot?')) return
    try {
      await deleteSlot(slotId)
      setSlots(prev => prev.filter(s => s._id !== slotId))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete slot')
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const upcomingSlots = slots.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  const pastSlots = slots.filter(s => s.date < today)

  return (
    <div className="min-h-screen bg-background flex">
      <DoctorSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <DoctorPendingGate blockPending={true}>
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Manage Availability</h1>
          <div className="flex items-center gap-3 mb-8">
            <p className="text-foreground/60">Add and manage your appointment slots</p>
            <button
              onClick={loadSlots}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground/70 hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh slots"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Add Slot Form */}
          <div className="rounded-xl border border-border bg-card p-6 mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Add New Slot</h2>
            <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  min={today}
                  onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Start Time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm(p => ({ ...p, startTime: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">End Time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm(p => ({ ...p, endTime: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'Adding...' : 'Add Slot'}
                </button>
              </div>
            </form>
            {error && <p className="text-destructive text-sm mt-3">{error}</p>}
            {success && <p className="text-green-600 text-sm mt-3">{success}</p>}
          </div>

          {/* Upcoming Slots */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Slots ({upcomingSlots.length})
            </h2>
            {loading ? (
              <p className="text-foreground/60">Loading slots...</p>
            ) : upcomingSlots.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-foreground/60">No upcoming slots. Add some above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingSlots.map(slot => (
                  <div key={slot._id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{slot.date}</p>
                      <p className="text-foreground/60 text-sm">{slot.startTime} – {slot.endTime}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${slot.isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {slot.isBooked ? 'Booked' : 'Available'}
                      </span>
                    </div>
                    {!slot.isBooked && (
                      <button
                        onClick={() => handleDelete(slot._id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </DoctorPendingGate>
      </div>
    </div>
  )
}
