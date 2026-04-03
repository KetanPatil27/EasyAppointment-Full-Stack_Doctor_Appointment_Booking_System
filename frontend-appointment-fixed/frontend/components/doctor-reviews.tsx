import { Star } from 'lucide-react'

interface Review {
  _id: string
  patientName: string
  rating: number
  comment: string
  createdAt: string
}

interface DoctorReviewsProps {
  reviews?: Review[]
}

export function DoctorReviews({ reviews = [] }: DoctorReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Star className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
        <p className="text-foreground/50 text-sm">No reviews yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review._id} className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-foreground">{review.patientName}</p>
              <p className="text-xs text-foreground/50">{new Date(review.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-foreground/20'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-foreground/70">{review.comment}</p>
        </div>
      ))}
    </div>
  )
}
