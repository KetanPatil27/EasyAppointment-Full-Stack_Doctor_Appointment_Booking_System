import api from './api'

export interface Doctor {
  _id: string
  userId: string
  specialization: string
  bio?: string
  experience: number
  hourlyRate: number
  licenseNumber: string
  languages: string[]
  clinicAddress: {
    clinicName?: string
    street: string
    locality?: string
    city: string
    state: string
    zipCode: string
  }
  consultationDuration: number
  verified?: boolean
  status?: 'active' | 'pending' | 'suspended'
  createdAt?: string
  updatedAt?: string
  profileImage?: string     // base64 data URL stored in DB
  qualifications?: Qualification[]
  // Joined from users service by backend after hook
  name?: string
  email?: string
  phone?: string
}

export interface Qualification {
  degree: string
  college: string
  year: number
  certification?: string
}

export const SPECIALIZATIONS = [
  'Cardiologist', 'Dermatologist', 'Neurologist', 'Orthopedic',
  'Pediatrician', 'General Physician', 'Dentist', 'Gynecologist',
  'Psychiatrist', 'Gastroenterologist', 'ENT Specialist', 'Ophthalmologist',
  'Urologist', 'Oncologist', 'Radiologist', 'Anesthesiologist'
]

export const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Tamil', 'Telugu',
  'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'
]

export const getAllDoctors = async (query?: Record<string, any>) => {
  const response = await api.get('/doctors', { params: query })
  return response.data
}

export const getDoctorById = async (id: string) => {
  const response = await api.get(`/doctors/${id}`)
  return response.data
}

// Fetch doctor profile by their userId (used when you only have appointment.doctorId)
// appointment.doctorId = the doctor's user _id, NOT the doctor profile _id
export const getDoctorByUserId = async (userId: string): Promise<Doctor | null> => {
  try {
    const response = await api.get('/doctors', { params: { userId, $limit: 1 } })
    const data = response.data?.data || response.data
    if (Array.isArray(data)) return data[0] || null
    return data || null
  } catch {
    return null
  }
}

export const getMyDoctorProfile = async (): Promise<Doctor | null> => {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
  if (!user._id) return null
  const response = await api.get('/doctors', { params: { userId: user._id, $limit: 1 } })
  const data = response.data?.data || response.data
  if (Array.isArray(data)) return data[0] || null
  return data || null
}

export const createDoctorProfile = async (data: Partial<Doctor>) => {
  const response = await api.post('/doctors', data)
  return response.data
}

export const updateDoctorProfile = async (id: string, data: Partial<Doctor>) => {
  const response = await api.patch(`/doctors/${id}`, data)
  return response.data
}
