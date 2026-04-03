import { Type, Static } from '@feathersjs/typebox'

export const appointmentSchema = Type.Object({
  _id: Type.Optional(Type.String()),
  slotId: Type.String(),
  doctorId: Type.String(),
  patientId: Type.String(),
  status: Type.Union([
    Type.Literal('booked'),
    Type.Literal('cancelled'),
    Type.Literal('completed')
  ]),
  createdAt: Type.String()
})

export type Appointment = Static<typeof appointmentSchema>

export const appointmentDataSchema = Type.Pick(appointmentSchema, [
  'slotId'
])

export const appointmentPatchSchema = Type.Partial(
  Type.Pick(appointmentSchema, ['status'])
)
