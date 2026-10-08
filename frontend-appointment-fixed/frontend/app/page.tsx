'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { StatCard } from '@/components/stat-card'
import { Users, Heart, Calendar, Search, MapPin, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPECIALIZATIONS } from '@/services/doctorService'

export default function LandingPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [pincode, setPincode] = useState('')
  const [locality, setLocality] = useState('')
  const [selectedSpec, setSelectedSpec] = useState('')

  // Build URL params matching exactly what /doctors page reads
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (pincode.trim()) params.set('pincode', pincode.trim())
    if (locality.trim()) params.set('locality', locality.trim())
    if (selectedSpec) params.set('spec', selectedSpec)
    router.push(`/doctors?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative py-12 md:py-20 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 h-72 w-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-10 h-72 w-72 bg-accent/5 rounded-full blur-3xl" />
          </div>

          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4 sm:mb-6 text-balance">
                  Book Doctor Appointments Anytime, Anywhere
                </h1>
                <p className="text-base sm:text-lg text-foreground/70 mb-6 sm:mb-8 leading-relaxed">
                  Connect with qualified healthcare professionals, schedule appointments at your convenience, and receive expert medical care near you.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link
                    href="/doctors"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-6 sm:px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
                  >
                    Book Appointment
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-6 sm:px-8 py-3 text-base font-semibold text-primary hover:bg-primary/5 transition-colors w-full sm:w-auto"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
              <div className="relative h-96 lg:h-[450px] xl:h-[400px] 2xl:h-[500px] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1758691461530-b215ed4ede6a?q=80&w=1032&auto=format&fit=crop"
                  alt="Doctor consultation"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Search Section — synced with /doctors page ── */}
        <section className="py-8 md:py-12 bg-muted/20">
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
            <div className="rounded-2xl bg-card border border-border p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Find Your Doctor</h2>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  {/* Doctor name / free text */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Doctor name or keyword…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                  </div>

                  {/* Specialization */}
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                    <select
                      value={selectedSpec}
                      onChange={e => setSelectedSpec(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-shadow"
                    >
                      <option value="">All Specializations</option>
                      {SPECIALIZATIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* City / Locality */}
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="City or Locality…"
                      value={locality}
                      onChange={e => setLocality(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                  </div>

                  {/* Pincode */}
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Pincode (e.g. 400001)"
                      value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 sm:px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
                  >
                    <Search className="h-4 w-4" />
                    Search Doctors
                  </button>
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    {(searchQuery || pincode || locality || selectedSpec) && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setPincode(''); setLocality(''); setSelectedSpec('') }}
                        className="text-sm text-foreground/50 hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <Link href="/doctors" className="sm:ml-auto text-sm text-primary hover:underline font-medium">
                      Browse all doctors →
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-12 md:py-20">
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Trusted by Healthcare Community
              </h2>
              <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
                Join thousands of patients who have found their ideal doctor and scheduled appointments seamlessly.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={Users} value="10,000+" label="Active Doctors" description="Qualified healthcare professionals" />
              <StatCard icon={Calendar} value="50,000+" label="Appointments Booked" description="Successful consultations completed" />
              <StatCard icon={Heart} value="4.8/5" label="Patient Rating" description="Based on verified reviews" />
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-12 md:py-20 bg-muted/30">
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
              <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
                Booking a doctor appointment has never been easier.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: 1, icon: '🔍', title: 'Search & Browse', description: 'Search by name, specialization, location or pincode. View profiles, experience, and patient reviews.' },
                { step: 2, icon: '📅', title: 'Check Availability', description: 'View available time slots and choose one that fits you. Real-time availability shown.' },
                { step: 3, icon: '✅', title: 'Book & Confirm', description: 'Complete your booking and receive instant confirmation with reminder notifications.' },
              ].map(item => (
                <div key={item.step} className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-foreground/70 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Admin Portal ── */}
        <section className="py-12 md:py-20">
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Admin & Management Portal</h2>
              <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
                Manage doctors, appointments, and system analytics with our comprehensive admin dashboard.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all">
                <h3 className="text-2xl font-bold text-foreground mb-3">Admin Login</h3>
                <p className="text-foreground/70 mb-6 leading-relaxed">
                  Access the admin dashboard to manage doctors, view appointments, and monitor system analytics.
                </p>
                <Link href="/admin/login"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Admin Login
                </Link>
              </div>
              <div className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all">
                <h3 className="text-2xl font-bold text-foreground mb-3">Create Admin Account</h3>
                <p className="text-foreground/70 mb-6 leading-relaxed">
                  Register a new admin account. Authorized registration required.
                </p>
                <Link href="/admin/register"
                  className="inline-flex items-center justify-center rounded-lg bg-secondary px-6 py-3 text-base font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors">
                  Create Admin
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-12 md:py-20">
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-accent p-6 sm:p-10 md:p-16 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-4 sm:mb-6">
                Ready to Book Your Appointment?
              </h2>
              <p className="text-base sm:text-lg text-primary-foreground/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Join our community of satisfied patients and get expert healthcare at your fingertips.
              </p>
              <Link href="/doctors"
                className="inline-flex items-center justify-center rounded-lg bg-background px-6 sm:px-8 py-3.5 sm:py-4 text-base font-semibold text-foreground hover:bg-background/90 transition-colors w-full sm:w-auto">
                Explore Doctors Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
