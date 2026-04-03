'use client'

import { useEffect, useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { Save } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { getMyPatientProfile, createPatientProfile, updatePatientProfile, Patient } from '@/services/patientService'

export default function ProfilePage() {
  const { currentUser, isAuthenticated, isAuthLoading } = useApp()
  const router = useRouter()
  const [existingProfile, setExistingProfile] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    phone: '',
    address: '',
    bloodGroup: '',
    allergies: '',
    medicalHistory: ''
  })

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || currentUser?.role !== 'patient') {
        router.push('/login')
        return
      }
      loadProfile()
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await getMyPatientProfile()
      if (data) {
        setExistingProfile(data)
        setForm({
          fullName: data.fullName || '',
          dateOfBirth: data.dateOfBirth || '',
          gender: data.gender || '',
          phone: data.phone || '',
          address: data.address || '',
          bloodGroup: data.bloodGroup || '',
          allergies: data.allergies || '',
          medicalHistory: data.medicalHistory || ''
        })
      } else if (currentUser) {
        setForm(prev => ({ ...prev, fullName: currentUser.name, phone: currentUser.phone || '' }))
      }
    } catch (err) {
      console.error('Failed to load profile', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.gender) {
      setError('Please select a gender')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      fullName: form.fullName,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender as 'male' | 'female' | 'other',
      phone: form.phone,
      address: form.address,
      bloodGroup: form.bloodGroup,
      allergies: form.allergies,
      medicalHistory: form.medicalHistory
    }

    try {
      if (existingProfile) {
        await updatePatientProfile(existingProfile._id, payload)
      } else {
        await createPatientProfile(payload)
      }
      setSuccess('Profile saved successfully!')
      loadProfile()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (isAuthLoading || loading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />
      <main className="flex-1">
        <div className="border-b border-border">
          <div className="mx-auto max-w-3xl px-8 py-6">
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-foreground/60 mt-1">
              {existingProfile ? 'Update your medical profile' : 'Complete your medical profile'}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-bold text-foreground mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Full Name *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Date of Birth *</label>
                  <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Gender *</label>
                  <select name="gender" value={form.gender} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-1">Address</label>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="123 Main St, City, State"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-bold text-foreground mb-4">Medical Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Blood Group</label>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Select blood group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Known Allergies</label>
                  <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="e.g. Penicillin, Pollen"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-1">Medical History</label>
                  <textarea name="medicalHistory" value={form.medicalHistory} onChange={handleChange} rows={4}
                    placeholder="List any chronic conditions, past surgeries, medications..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
