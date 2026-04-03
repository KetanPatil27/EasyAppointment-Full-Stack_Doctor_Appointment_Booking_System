import type { Appointment } from './appointment.schema'
import type { AppointmentsService } from './appointment.class'

export const appointmentPath = 'appointments'

export const appointmentMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export type AppointmentService = AppointmentsService

export type {
  Appointment
}
