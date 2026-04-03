import Link from 'next/link'
import { MapPin, Star, Clock, IndianRupee, Languages, Building2 } from 'lucide-react'
import { Doctor } from '@/services/doctorService'

interface DoctorCardProps {
  doctor: Doctor
  avgRating?: number
  reviewCount?: number
}

export function DoctorCard({ doctor, avgRating = 0, reviewCount = 0 }: DoctorCardProps) {
  const locality = doctor.clinicAddress?.locality
  const city = doctor.clinicAddress?.city
  const location = locality && city
    ? `${locality}, ${city}`
    : city
      ? `${city}${doctor.clinicAddress?.state ? ', ' + doctor.clinicAddress.state : ''}`
      : null

  const clinicName = doctor.clinicAddress?.clinicName

  const initials = (doctor.name || 'D')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden">

      {/* ── Profile image — top, 3:2 aspect ratio ── */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary/8 to-primary/20 overflow-hidden shrink-0">
        {doctor.profileImage ? (
          <img
            src={doctor.profileImage}
            alt={`Dr. ${doctor.name}`}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center text-primary text-3xl font-bold select-none">
              {initials}
            </div>
          </div>
        )}

        {/* Rating badge — top-right overlay */}
        {avgRating > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md text-xs font-bold text-gray-800">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span>{avgRating.toFixed(1)}</span>
            {reviewCount > 0 && (
              <span className="text-gray-400 font-normal">({reviewCount})</span>
            )}
          </div>
        )}
      </div>

      {/* ── Info panel ── */}
      <div className="flex flex-col flex-1 p-5 gap-3">

        {/* Name & specialization */}
        <div>
          <h3 className="font-bold text-foreground text-lg leading-tight">
            Dr. {doctor.name || '—'}
          </h3>
          <p className="text-primary text-sm font-semibold mt-0.5">{doctor.specialization}</p>
          {clinicName && (
            <p className="flex items-center gap-1 text-xs text-foreground/60 mt-1">
              <Building2 className="h-3 w-3 text-primary/50 shrink-0" />
              {clinicName}
            </p>
          )}
        </div>

        {/* Rating row (text) — only when no badge visible */}
        {avgRating === 0 && (
          <p className="text-xs text-foreground/40 italic">No reviews yet</p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 text-xs text-foreground/60">
          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
            <Clock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            {doctor.experience}+ yrs exp
          </span>
          {location && (
            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
              <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              {location}
            </span>
          )}
        </div>

        {/* Languages */}
        {doctor.languages && doctor.languages.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-foreground/60">
            <Languages className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span>{doctor.languages.slice(0, 3).join(', ')}{doctor.languages.length > 3 ? ` +${doctor.languages.length - 3}` : ''}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Fee + CTA */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-foreground/40 font-medium">Consultation Fee</p>
            <p className="flex items-center gap-0.5 font-bold text-primary text-lg leading-tight">
              <IndianRupee className="h-4 w-4" />
              {doctor.hourlyRate}
            </p>
          </div>
          <Link
            href={`/doctors/${doctor._id}`}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  )
}
