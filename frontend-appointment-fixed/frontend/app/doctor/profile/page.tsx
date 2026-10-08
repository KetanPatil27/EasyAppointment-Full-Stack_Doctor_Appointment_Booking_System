'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import {
  Save, Camera, X, Plus, Trash2, GraduationCap,
  Loader2, CheckCircle, IndianRupee, AlertCircle
} from 'lucide-react'
import {
  getMyDoctorProfile, createDoctorProfile, updateDoctorProfile,
  Doctor, Qualification, SPECIALIZATIONS, LANGUAGES, getSpecializations
} from '@/services/doctorService'
import { DoctorPendingGate } from '@/components/doctor-pending-gate'

const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary'

// ── Client-side image compression ─────────────────────────────────────────────
// Resizes & re-encodes to JPEG quality 0.80, max 800px wide.
// Returns a base64 data-URL that's typically 50–150 KB.
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
        if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.80))
      }
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function DoctorProfilePage() {
  const { currentUser, isAuthenticated } = useApp()
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile,    setProfile]    = useState<Doctor | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)
  const [imgError,   setImgError]   = useState('')

  const [form, setForm] = useState({
    specializations:      [] as string[],
    bio:                  '',
    experience:           0,
    hourlyRate:           0,
    licenseNumber:        '',
    languages:            [] as string[],
    consultationDuration: 30,
    clinicAddress:        { clinicName: '', street: '', locality: '', city: '', state: '', zipCode: '' },
    qualifications:       [] as Qualification[],
  })

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    if (currentUser.role !== 'doctor')    { router.push('/');      return }
    loadProfile()
  }, [currentUser, isAuthenticated])

  const loadProfile = async () => {
    try {
      const p = await getMyDoctorProfile()
      if (p) {
        setProfile(p)
        setImgPreview(p.profileImage || null)
        setForm({
          // Read transparently from new array OR legacy single-string field.
          specializations:      getSpecializations(p),
          bio:                  p.bio                  || '',
          experience:           p.experience           || 0,
          hourlyRate:           p.hourlyRate           || 0,
          licenseNumber:        p.licenseNumber        || '',
          languages:            p.languages            || [],
          consultationDuration: p.consultationDuration || 30,
          clinicAddress:        {
            clinicName: p.clinicAddress?.clinicName || '',
            street: p.clinicAddress?.street || '',
            locality: p.clinicAddress?.locality || '',
            city: p.clinicAddress?.city || '',
            state: p.clinicAddress?.state || '',
            zipCode: p.clinicAddress?.zipCode || ''
          },
          qualifications:       p.qualifications       || [],
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Image upload ─────────────────────────────────────────────────────────────
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImgError('Please select a valid image file (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImgError('Image must be under 5 MB')
      return
    }

    setImgLoading(true)
    setImgError('')

    try {
      // Compress → base64 JPEG ≤ ~150 KB
      const compressed = await compressImage(file)
      setImgPreview(compressed)

      // Save immediately if profile already exists
      if (profile?._id) {
        await updateDoctorProfile(profile._id, { profileImage: compressed })
      }
      // If profile doesn't exist yet, image will be included in handleSubmit payload
    } catch (err: any) {
      console.error('Image upload error:', err)
      setImgError(err?.response?.data?.message || 'Failed to save image. Please try again.')
      setImgPreview(profile?.profileImage || null) // revert preview on failure
    } finally {
      setImgLoading(false)
      // Reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    setImgPreview(null)
    setImgError('')
    if (profile?._id) {
      try {
        await updateDoctorProfile(profile._id, { profileImage: '' })
      } catch (err: any) {
        setImgError('Failed to remove image')
        setImgPreview(profile?.profileImage || null)
      }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Qualifications ────────────────────────────────────────────────────────
  const addQualification = () =>
    setForm(f => ({
      ...f,
      qualifications: [
        ...f.qualifications,
        { degree: '', college: '', year: new Date().getFullYear(), certification: '' }
      ]
    }))

  const removeQualification = (i: number) =>
    setForm(f => ({ ...f, qualifications: f.qualifications.filter((_, idx) => idx !== i) }))

  const updateQualification = (i: number, field: keyof Qualification, val: string | number) =>
    setForm(f => ({
      ...f,
      qualifications: f.qualifications.map((q, idx) => idx === i ? { ...q, [field]: val } : q)
    }))

  // ── Languages ─────────────────────────────────────────────────────────────
  const toggleLanguage = (lang: string) =>
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter(l => l !== lang)
        : [...f.languages, lang]
    }))

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.specializations.length === 0) {
      setError('Please add at least one specialization.')
      return
    }
    setSaving(true); setError(''); setSuccess(false)
    try {
      // Persist the new array field; explicitly clear the legacy single-string
      // field so any old data on this record gets cleaned up on save.
      const payload: any = {
        ...form,
        specialization: '', // clear legacy single-string on every write
        profileImage: imgPreview || ''
      }
      if (profile?._id) {
        await updateDoctorProfile(profile._id, payload)
      } else {
        const created = await createDoctorProfile(payload)
        setProfile(created)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />
      <div className="flex-1 flex items-center justify-center ml-0 pt-14 lg:ml-64 lg:pt-0">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )

  const initials = (currentUser?.name || 'D')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />
      <main className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <DoctorPendingGate>
        <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Doctor Profile</h1>
            <p className="text-foreground/60 text-sm">
              {profile ? 'Update your professional information' : 'Complete your profile to start accepting appointments'}
            </p>
          </div>

          {/* Global alerts */}
          {error   && (
            <div className="mb-4 flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Profile saved successfully!
            </div>
          )}

          {/* ── Profile photo card ── */}
          <div className="bg-card rounded-xl border border-border p-5 sm:p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-4">Profile Photo</h2>

            {imgError && (
              <div className="mb-3 flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-3 py-2 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {imgError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              {/* Avatar preview */}
              <div className="relative shrink-0">
                {imgPreview ? (
                  <img
                    src={imgPreview}
                    alt="Profile preview"
                    className="h-24 w-24 rounded-2xl object-cover border-2 border-border shadow-sm"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-primary text-2xl font-bold select-none">
                    {initials}
                  </div>
                )}
                {imgLoading && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={imgLoading}
                    onClick={() => { setImgError(''); fileRef.current?.click() }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4 text-primary" />
                    {imgPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {imgPreview && (
                    <button
                      type="button"
                      disabled={imgLoading}
                      onClick={handleRemoveImage}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-foreground/50">
                  JPG, PNG or WebP · Max 5 MB · Auto-compressed for fast loading
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Account info (read-only) ── */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
              <h2 className="font-semibold text-foreground mb-3">Account Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Name',  value: currentUser?.name },
                  { label: 'Email', value: currentUser?.email },
                  { label: 'Phone', value: currentUser?.phone || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-foreground/50 text-xs mb-0.5">{label}</p>
                    <p className="font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Professional details ── */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Professional Details</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Specializations * <span className="text-foreground/50 font-normal">(one or more)</span>
                </label>

                {/* Selected as chips */}
                <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
                  {form.specializations.length === 0 ? (
                    <span className="text-sm text-foreground/40 italic">None selected yet</span>
                  ) : (
                    form.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full border border-primary/20"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              specializations: f.specializations.filter((s) => s !== spec)
                            }))
                          }
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${spec}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add picker — only shows specializations not already selected */}
                <select
                  value=""
                  onChange={(e) => {
                    const chosen = e.target.value
                    if (!chosen) return
                    setForm((f) =>
                      f.specializations.includes(chosen)
                        ? f
                        : { ...f, specializations: [...f.specializations, chosen] }
                    )
                    e.target.value = '' // reset so the same option can be added again later if removed
                  }}
                  className={inputCls}
                >
                  <option value="">+ Add specialization…</option>
                  {SPECIALIZATIONS
                    .filter((s) => !form.specializations.includes(s))
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>

                {form.specializations.length === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Please select at least one specialization
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">License Number *</label>
                <input
                  type="text" value={form.licenseNumber} required placeholder="MCI-XXXXXXXX"
                  onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Experience (years)</label>
                  <input
                    type="number" min="0" max="60" value={form.experience}
                    onChange={e => setForm(f => ({ ...f, experience: parseInt(e.target.value) || 0 }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Consultation Fee (₹)</span>
                  </label>
                  <input
                    type="number" min="0" value={form.hourlyRate} placeholder="e.g. 500"
                    onChange={e => setForm(f => ({ ...f, hourlyRate: parseInt(e.target.value) || 0 }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Consultation Duration</label>
                <select
                  value={form.consultationDuration}
                  onChange={e => setForm(f => ({ ...f, consultationDuration: parseInt(e.target.value) }))}
                  className={inputCls}
                >
                  {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bio / About</label>
                <textarea
                  value={form.bio} rows={3}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell patients about yourself and your expertise…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {/* ── Qualifications ── */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Qualifications</h2>
                </div>
                <button
                  type="button" onClick={addQualification}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {form.qualifications.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <GraduationCap className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-foreground/50">No qualifications added yet</p>
                  <button
                    type="button" onClick={addQualification}
                    className="mt-3 text-sm text-primary hover:underline font-medium"
                  >
                    + Add your first qualification
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.qualifications.map((q, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">
                          Qualification {i + 1}
                        </p>
                        <button
                          type="button" onClick={() => removeQualification(i)}
                          className="text-destructive hover:text-destructive/70 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-foreground/60 mb-1">Degree *</label>
                          <input
                            type="text" value={q.degree} required
                            onChange={e => updateQualification(i, 'degree', e.target.value)}
                            placeholder="e.g. MBBS, MD Cardiology"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground/60 mb-1">College / University *</label>
                          <input
                            type="text" value={q.college} required
                            onChange={e => updateQualification(i, 'college', e.target.value)}
                            placeholder="e.g. AIIMS Delhi"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground/60 mb-1">Year *</label>
                          <input
                            type="number" value={q.year} required min={1970} max={new Date().getFullYear()}
                            onChange={e => updateQualification(i, 'year', parseInt(e.target.value) || 2000)}
                            className={inputCls}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-foreground/60 mb-1">Certification (optional)</label>
                          <input
                            type="text" value={q.certification || ''}
                            onChange={e => updateQualification(i, 'certification', e.target.value)}
                            placeholder="e.g. Board Certified in Cardiology"
                            className={inputCls}
                          />
                        </div>
                      </div>
                      {q.degree && q.college && (
                        <p className="text-xs text-foreground/50 mt-2 pt-2 border-t border-border">
                          {q.degree} – {q.college} – {q.year}
                          {q.certification && ` · ${q.certification}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Languages ── */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
              <h2 className="font-semibold text-foreground mb-3">Languages Spoken</h2>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang} type="button" onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.languages.includes(lang)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground/70 border-border hover:border-primary'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              {form.languages.length > 0 && (
                <p className="text-xs text-foreground/50 mt-2">Selected: {form.languages.join(', ')}</p>
              )}
            </div>

            {/* ── Clinic address ── */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Clinic / Hospital Details</h2>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Clinic / Hospital Name</label>
                <input
                  type="text" value={form.clinicAddress.clinicName || ''}
                  onChange={e => setForm(f => ({ ...f, clinicAddress: { ...f.clinicAddress, clinicName: e.target.value } }))}
                  placeholder="e.g. Apollo Clinic"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Address (Street)</label>
                <input
                  type="text" value={form.clinicAddress.street}
                  onChange={e => setForm(f => ({ ...f, clinicAddress: { ...f.clinicAddress, street: e.target.value } }))}
                  placeholder="e.g. 123 MG Road, Near Central Mall"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Locality / Area</label>
                  <input
                    type="text"
                    value={form.clinicAddress.locality || ''}
                    placeholder="e.g. Dharampeth"
                    onChange={e => setForm(f => ({
                      ...f,
                      clinicAddress: { ...f.clinicAddress, locality: e.target.value }
                    }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">City</label>
                  <input
                    type="text"
                    value={form.clinicAddress.city}
                    placeholder="e.g. Nagpur"
                    onChange={e => setForm(f => ({
                      ...f,
                      clinicAddress: { ...f.clinicAddress, city: e.target.value }
                    }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State</label>
                  <input
                    type="text"
                    value={form.clinicAddress.state}
                    placeholder="e.g. Maharashtra"
                    onChange={e => setForm(f => ({
                      ...f,
                      clinicAddress: { ...f.clinicAddress, state: e.target.value }
                    }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Pincode</label>
                  <input
                    type="text"
                    value={form.clinicAddress.zipCode}
                    placeholder="e.g. 440010"
                    onChange={e => setForm(f => ({
                      ...f,
                      clinicAddress: { ...f.clinicAddress, zipCode: e.target.value }
                    }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={saving || imgLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-base"
            >
              {saving
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</>
                : <><Save className="h-5 w-5" /> {profile ? 'Update Profile' : 'Create Profile'}</>
              }
            </button>
          </form>
        </div>
        </DoctorPendingGate>
      </main>
    </div>
  )
}
