import api from './api'

export interface Patient {
  _id: string
  userId: string
  fullName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  phone?: string
  address?: string
  bloodGroup?: string
  allergies?: string
  medicalHistory?: string
  createdAt?: string
  updatedAt?: string
}

export type PatientCreatePayload = Omit<Patient, '_id' | 'userId' | 'createdAt' | 'updatedAt'>
export type PatientUpdatePayload = Partial<PatientCreatePayload>

export const getMyPatientProfile = async (): Promise<Patient | null> => {
  const res = await api.get('/patients')
  const data = res.data?.data || res.data
  if (Array.isArray(data)) return data[0] || null
  return data || null
}

export const createPatientProfile = async (data: PatientCreatePayload): Promise<Patient> => {
  const res = await api.post('/patients', data)
  return res.data
}

export const updatePatientProfile = async (id: string, data: PatientUpdatePayload): Promise<Patient> => {
  const res = await api.patch(`/patients/${id}`, data)
  return res.data
}
