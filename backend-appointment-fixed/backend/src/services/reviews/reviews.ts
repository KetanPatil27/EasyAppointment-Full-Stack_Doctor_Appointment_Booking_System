import type { Application } from '../../declarations'
import { ReviewsService } from './reviews.class'
import reviewsHooks from './reviews.hook'

// Register 'reviews' in ServiceTypes so TypeScript accepts app.service('reviews')
declare module '../../declarations' {
  interface ServiceTypes {
    reviews: ReviewsService
  }
}

export const reviews = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('reviews', new ReviewsService({
    paginate: app.get('paginate'),
    Model: dbPromise.then((db: any) => {
      db.collection('reviews').createIndex(
        { appointmentId: 1, patientId: 1 },
        { unique: true }
      ).catch(() => {})
      db.collection('reviews').createIndex({ doctorId: 1 }).catch(() => {})
      return db.collection('reviews')
    })
  }), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('reviews').hooks(reviewsHooks)
}
