import api from './api'

export interface Review {
  _id: string
  patientId: string
  patientName?: string
  doctorId: string
  appointmentId: string
  rating: number        // 1-5
  text: string
  createdAt: string
}

export const getReviewsByDoctor = async (doctorId: string): Promise<Review[]> => {
  const res = await api.get('/reviews', { params: { doctorId, $limit: 100 } })
  return res.data?.data || res.data || []
}

export const getMyReviews = async (): Promise<Review[]> => {
  // Pass no extra params — backend filterByRole will add patientId for patient role
  const res = await api.get('/reviews', { params: { $limit: 100 } })
  return res.data?.data || res.data || []
}

export const hasReviewedAppointment = async (appointmentId: string): Promise<boolean> => {
  try {
    const res = await api.get('/reviews', { params: { appointmentId, $limit: 1 } })
    const data = res.data?.data || res.data || []
    return Array.isArray(data) ? data.length > 0 : false
  } catch { return false }
}

export const createReview = async (data: {
  appointmentId: string
  rating: number
  text: string
}): Promise<Review> => {
  const res = await api.post('/reviews', data)
  return res.data
}

export const getAverageRating = (reviews: Review[]): number => {
  if (!reviews.length) return 0
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
}
