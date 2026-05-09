import api from './api'

export interface Doctor {
  _id: string
  userId: string
  /**
   * NEW canonical field — array of one or more specializations.
   * Always prefer this over the legacy `specialization`.
   */
  specializations?: string[]
  /**
   * LEGACY single-string field. Still appears on un-migrated records and is
   * accepted on input for backward compatibility. Use `getSpecializations()`
   * helper to read transparently from either field.
   */
  specialization?: string
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

/**
 * Read a doctor's specializations regardless of which field shape the record
 * uses. During the migration window we may see records with:
 *   - `specializations: ["A", "B"]` (new format, preferred)
 *   - `specialization: "A"`         (legacy)
 *   - both                           (rare; new wins)
 *   - neither                        (incomplete profile)
 *
 * Always returns an array — empty if nothing is set.
 */
export const getSpecializations = (doctor: Pick<Doctor, 'specializations' | 'specialization'> | null | undefined): string[] => {
  if (!doctor) return []
  if (Array.isArray(doctor.specializations) && doctor.specializations.length > 0) {
    return doctor.specializations
  }
  if (typeof doctor.specialization === 'string' && doctor.specialization.trim()) {
    return [doctor.specialization.trim()]
  }
  return []
}

/** Comma-joined string for compact UI displays. */
export const formatSpecializations = (doctor: Pick<Doctor, 'specializations' | 'specialization'> | null | undefined): string => {
  return getSpecializations(doctor).join(', ')
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
