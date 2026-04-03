// This file is kept for type reference only.
// All data is now fetched from the backend API.
export type User = {
  id: string
  _id?: string
  name: string
  email: string
  phone?: string
  role: 'patient' | 'doctor' | 'admin'
  status: string
}

export type Doctor = {
  id: string
  _id?: string
  name: string
  specialization: string
  experience: number
  hourlyRate: number
  clinicAddress?: { city: string; state: string }
}

export type Appointment = {
  id: string
  _id?: string
  patientId: string
  doctorId: string
  slotId: string
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  createdAt: string
}

export type Prescription = { id: string; patientId: string; doctorId: string; medication: string; dosage: string; createdAt: string }
export type MedicalRecord = { id: string; patientId: string; diagnosis: string; createdAt: string }
export type Notification = { id: string; userId: string; message: string; read: boolean; createdAt: string }
export type Message = { id: string; senderId: string; receiverId: string; content: string; createdAt: string }
export type Transaction = { id: string; userId: string; amount: number; status: string; createdAt: string }
export type Review = { id: string; doctorId: string; patientId: string; rating: number; comment: string; createdAt: string }
export type DoctorAvailability = { id: string; doctorId: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }

export const mockUsers: User[] = []
export const mockDoctors: Doctor[] = []
export const mockAppointments: Appointment[] = []
export const mockPrescriptions: Prescription[] = []
export const mockMedicalRecords: MedicalRecord[] = []
export const mockNotifications: Notification[] = []
export const mockMessages: Message[] = []
export const mockTransactions: Transaction[] = []
export const mockReviews: Review[] = []
