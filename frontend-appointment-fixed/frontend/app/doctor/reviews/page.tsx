'use client'

import { useState, useEffect } from 'react'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { Star, Loader2, MessageSquare } from 'lucide-react'
import { getReviewsByDoctor, getAverageRating, Review } from '@/services/reviewService'
import { getMyDoctorProfile } from '@/services/doctorService'

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
      ))}
    </div>
  )
}

export default function DoctorReviewsPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    if (currentUser.role !== 'doctor') { router.push('/'); return }
    const load = async () => {
      try {
        const profile = await getMyDoctorProfile()
        if (profile) {
          const revs = await getReviewsByDoctor(profile.userId)
          setReviews(revs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [currentUser])

  const avg = getAverageRating(reviews)
  const dist = [5,4,3,2,1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-6 md:p-8 max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-1">Patient Reviews</h1>
          <p className="text-foreground/60 mb-8">See what patients say about you</p>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <MessageSquare className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/60 font-medium">No reviews yet</p>
              <p className="text-sm text-foreground/40 mt-1">Reviews from patients will appear here after completed appointments</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-6 mb-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-foreground">{avg.toFixed(1)}</p>
                    <StarRow rating={Math.round(avg)} />
                    <p className="text-sm text-foreground/50 mt-1">{reviews.length} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {dist.map(({ star, count, pct }) => (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="text-foreground/60 w-4 text-right">{star}</span>
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-foreground/50 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review._id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {(review.patientName || 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{review.patientName || 'Patient'}</p>
                          <p className="text-xs text-foreground/50">
                            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <StarRow rating={review.rating} />
                    </div>
                    {review.text && <p className="text-sm text-foreground/70">{review.text}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
