import api from './api'

export interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface Prescription {
  _id: string
  patientId: string
  doctorId: string
  appointmentId?: string
  medications: Medication[]
  diagnosis: string
  notes?: string
  validUntil: string
  createdAt: string
  updatedAt: string
  // Joined
  doctorName?: string
  patientName?: string
}

export const getMyPrescriptions = async (): Promise<Prescription[]> => {
  const res = await api.get('/prescriptions')
  return res.data?.data || res.data || []
}

export const getPrescription = async (id: string): Promise<Prescription> => {
  const res = await api.get(`/prescriptions/${id}`)
  return res.data
}

export const createPrescription = async (data: Omit<Prescription, '_id' | 'doctorId' | 'createdAt' | 'updatedAt'>): Promise<Prescription> => {
  const res = await api.post('/prescriptions', data)
  return res.data
}

export const updatePrescription = async (id: string, data: Partial<Prescription>): Promise<Prescription> => {
  const res = await api.patch(`/prescriptions/${id}`, data)
  return res.data
}

export const deletePrescription = async (id: string): Promise<void> => {
  await api.delete(`/prescriptions/${id}`)
}
