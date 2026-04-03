import api from './api'

export interface Appointment {
  _id: string
  slotId: string
  doctorId: string
  patientId: string
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  notes?: string
  createdAt: string
  date?: string
  startTime?: string
  endTime?: string
  consultationFee?: number
}

export interface Slot {
  _id: string
  doctorId: string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
  createdAt?: string
}

export const getAppointmentById = async (id: string) => {
  const res = await api.get(`/appointments/${id}`)
  return res.data
}

export const getMyAppointments = async () => {
  const res = await api.get('/appointments')
  return res.data?.data || res.data || []
}

export const bookAppointment = async (slotId: string, notes?: string) => {
  const res = await api.post('/appointments', { slotId, notes })
  return res.data
}

export const cancelAppointment = async (appointmentId: string) => {
  const res = await api.patch(`/appointments/${appointmentId}`, { status: 'cancelled' })
  return res.data
}

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: 'confirmed' | 'completed' | 'rejected'
) => {
  const res = await api.patch(`/appointments/${appointmentId}`, { status })
  return res.data
}

// Slots
export const getSlotsByDoctor = async (doctorId: string, date?: string) => {
  const params: any = { doctorId }
  if (date) params.date = date
  const res = await api.get('/slots', { params })
  return res.data?.data || res.data || []
}

export const createSlot = async (data: {
  date: string
  startTime: string
  endTime: string
}) => {
  const res = await api.post('/slots', data)
  return res.data
}

export const deleteSlot = async (slotId: string) => {
  const res = await api.delete(`/slots/${slotId}`)
  return res.data
}

export const getMySlots = async () => {
  const res = await api.get('/slots')
  return res.data?.data || res.data || []
}

// Reschedule: swap to a new slot
export const rescheduleAppointment = async (appointmentId: string, newSlotId: string) => {
  const res = await api.patch(`/appointments/${appointmentId}`, { slotId: newSlotId })
  return res.data
}
