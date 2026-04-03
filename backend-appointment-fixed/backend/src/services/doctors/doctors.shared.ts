import type { DoctorsService } from './doctors.class'

export const doctorsPath = 'doctors'

export const doctorsMethods = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
] as const

declare module '../../declarations' {
  interface ServiceTypes {
    [doctorsPath]: DoctorsService
  }
} 