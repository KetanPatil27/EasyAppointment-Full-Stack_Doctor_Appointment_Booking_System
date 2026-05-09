'use client'

import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DoctorCard } from '@/components/doctor-card'
import { ChevronDown, Search, MapPin, Stethoscope, X } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getAllDoctors, Doctor, SPECIALIZATIONS, getSpecializations } from '@/services/doctorService'
import { getReviewsByDoctor, getAverageRating } from '@/services/reviewService'

interface DoctorWithRating extends Doctor {
  avgRating: number
  reviewCount: number
}

// ── Inner component that reads useSearchParams (needs Suspense wrapper) ────────
function DoctorsPageInner() {
  const searchParams  = useSearchParams()
  const router        = useRouter()

  const [doctors,  setDoctors]  = useState<DoctorWithRating[]>([])
  const [loading,  setLoading]  = useState(true)

  // Filter state — initialised from URL params (set by homepage search)
  const [searchQuery,  setSearchQuery]  = useState(() => {
    const search = searchParams.get('search') || ''
    const locality = searchParams.get('locality') || ''
    // If a locality was passed from homepage, combine it into the search query
    return locality && !search.toLowerCase().includes(locality.toLowerCase())
      ? (search ? `${search} ${locality}` : locality)
      : search
  })
  const [pincode,      setPincode]      = useState(() => searchParams.get('pincode') || '')
  const [selectedSpec, setSelectedSpec] = useState<string | null>(() => searchParams.get('spec') || null)
  const [priceRange,   setPriceRange]   = useState<[number, number]>([0, 10000])
  const [sortBy,       setSortBy]       = useState<'experience' | 'hourlyRate' | 'rating'>('experience')
  const [expandedSpec, setExpandedSpec] = useState(() => !!searchParams.get('spec'))

  // Load ALL doctors once (client-side filtering avoids N+1 API calls)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getAllDoctors({ $limit: 50 })
        const raw: Doctor[] = data?.data || data || []
        // Only show active doctors (exclude pending/suspended/deleted)
        const list = raw.filter(d => !d.status || d.status === 'active')

        const withRatings: DoctorWithRating[] = await Promise.all(
          list.map(async (doc) => {
            try {
              const reviews = await getReviewsByDoctor(doc.userId)
              return { ...doc, avgRating: getAverageRating(reviews), reviewCount: reviews.length }
            } catch {
              return { ...doc, avgRating: 0, reviewCount: 0 }
            }
          })
        )
        setDoctors(withRatings)
      } catch (err) {
        console.error('Failed to load doctors', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const clearAll = useCallback(() => {
    setSearchQuery(''); setPincode(''); setSelectedSpec(null); setPriceRange([0, 10000])
    router.replace('/doctors', { scroll: false })
  }, [router])

  const activeFilterCount = [
    searchQuery, pincode, selectedSpec,
    priceRange[1] < 10000 ? 'price' : null
  ].filter(Boolean).length

  // ── Client-side filtering — same logic as homepage uses for display ───────
  const filtered = useMemo(() => {
    let r = [...doctors]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      r = r.filter(d => {
        const specs = getSpecializations(d).map((s) => s.toLowerCase())
        return (
          (d.name || '').toLowerCase().includes(q) ||
          specs.some((s) => s.includes(q)) ||
          (d.clinicAddress?.clinicName || '').toLowerCase().includes(q) ||
          (d.clinicAddress?.locality || '').toLowerCase().includes(q) ||
          (d.clinicAddress?.city || '').toLowerCase().includes(q) ||
          (d.clinicAddress?.state || '').toLowerCase().includes(q) ||
          (d.bio || '').toLowerCase().includes(q)
        )
      })
    }

    // Pincode filter — match clinicAddress.zipCode exactly
    if (pincode.trim()) {
      r = r.filter(d =>
        (d.clinicAddress?.zipCode || '').replace(/\s/g, '') === pincode.trim().replace(/\s/g, '')
      )
    }

    // Specialization filter: doctor matches if ANY of their specializations equals selectedSpec.
    if (selectedSpec) {
      r = r.filter(d => getSpecializations(d).includes(selectedSpec))
    }
    r = r.filter(d => d.hourlyRate >= priceRange[0] && d.hourlyRate <= priceRange[1])

    r.sort((a, b) =>
      sortBy === 'experience' ? b.experience - a.experience :
      sortBy === 'hourlyRate' ? a.hourlyRate - b.hourlyRate :
      b.avgRating - a.avgRating
    )
    return r
  }, [doctors, searchQuery, pincode, selectedSpec, priceRange, sortBy])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">

        {/* Page heading */}
        <section className="border-b border-border bg-muted/30 py-8 md:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Find Your Doctor</h1>
            <p className="text-lg text-foreground/60">
              {loading ? 'Loading…' : `${doctors.length} qualified healthcare professional${doctors.length !== 1 ? 's' : ''} available`}
            </p>
            {/* Active search summary */}
            {!loading && (searchQuery || pincode || selectedSpec) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-foreground/50">Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''} for</span>
                {searchQuery   && <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">"{searchQuery}"</span>}
                {selectedSpec  && <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">{selectedSpec}</span>}
                {pincode       && <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{pincode}</span>}
                <button onClick={clearAll} className="text-foreground/40 hover:text-foreground transition-colors ml-1 flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* ── Filters sidebar ── */}
            <aside className="lg:col-span-1">
              <div className="sticky top-6 space-y-5 bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAll} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <X className="h-3 w-3" /> Clear all ({activeFilterCount})
                    </button>
                  )}
                </div>

                {/* Text search */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Name, specialty, city…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pincode filter */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-2">Pincode</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {pincode && (
                      <button onClick={() => setPincode('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-foreground/40 mt-1">Find doctors in your area</p>
                </div>

                {/* Specialization */}
                <div>
                  <button
                    onClick={() => setExpandedSpec(!expandedSpec)}
                    className="flex items-center justify-between w-full mb-2"
                  >
                    <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                      Specialization {selectedSpec && <span className="text-primary">✓</span>}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-foreground/60 transition-transform ${expandedSpec ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSpec && (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {SPECIALIZATIONS.map(spec => (
                        <label key={spec} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="spec"
                            checked={selectedSpec === spec}
                            onChange={() => setSelectedSpec(selectedSpec === spec ? null : spec)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">{spec}</span>
                        </label>
                      ))}
                      {selectedSpec && (
                        <button onClick={() => setSelectedSpec(null)} className="text-xs text-primary hover:underline mt-1">
                          Clear specialization
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-2">
                    Max Fee: ₹{priceRange[1] === 10000 ? 'Any' : priceRange[1]}
                  </label>
                  <input
                    type="range" min="0" max="10000" step="100"
                    value={priceRange[1]}
                    onChange={e => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-foreground/40 mt-1">
                    <span>₹0</span><span>₹10,000</span>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="experience">Most Experience</option>
                    <option value="hourlyRate">Lowest Fees</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>
            </aside>

            {/* ── Doctor grid ── */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="rounded-2xl border border-border bg-card h-80 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map(doctor => (
                    <DoctorCard
                      key={doctor._id}
                      doctor={doctor}
                      avgRating={doctor.avgRating}
                      reviewCount={doctor.reviewCount}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-12 text-center">
                  <Search className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
                  <p className="text-foreground/60 text-lg font-medium mb-1">No doctors found</p>
                  {pincode ? (
                    <p className="text-foreground/40 text-sm mb-4">
                      No doctors registered with pincode {pincode}. Try a nearby pincode or remove the pincode filter.
                    </p>
                  ) : (
                    <p className="text-foreground/40 text-sm mb-4">Try adjusting your search criteria.</p>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// Wrap in Suspense because useSearchParams() requires it in Next.js 14+
export default function DoctorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/60">Loading doctors…</div>
      </div>
    }>
      <DoctorsPageInner />
    </Suspense>
  )
}
