import { Type, Static } from '@feathersjs/typebox'

export const patientSchema = Type.Object({
  _id: Type.Optional(Type.String()),

  userId: Type.String(),

  fullName: Type.String(),
  dateOfBirth: Type.String({ format: 'date' }),

  gender: Type.Union([
    Type.Literal('male'),
    Type.Literal('female'),
    Type.Literal('other')
  ]),

  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  bloodGroup: Type.Optional(Type.String()),
  allergies: Type.Optional(Type.String()),
  medicalHistory: Type.Optional(Type.String()),

  createdAt: Type.Optional(Type.String({ format: 'date-time' })),
  updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
})

export type Patient = Static<typeof patientSchema>

export const patientDataSchema = Type.Pick(patientSchema, [
  'fullName',
  'dateOfBirth',
  'gender',
  'phone',
  'address',
  'bloodGroup',
  'allergies',
  'medicalHistory'
])

export const patientPatchSchema = Type.Partial(patientDataSchema)
