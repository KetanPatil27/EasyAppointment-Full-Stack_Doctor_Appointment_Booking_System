import { Type, Static } from '@sinclair/typebox'

export const doctorsSchema = Type.Object({
  _id: Type.Optional(Type.String()),
  userId: Type.String(),

  /**
   * NEW canonical field: array of specializations.
   * Reads should prefer this; writes should target this.
   */
  specializations: Type.Optional(Type.Array(Type.String())),

  /**
   * LEGACY single-string field, kept Optional for rollback safety during the
   * migration window. New code should NOT write this. After
   * `npm run migrate:specializations` has been run in production AND verified,
   * this field can be removed in a follow-up cleanup.
   */
  specialization: Type.Optional(Type.String()),

  bio: Type.Optional(Type.String()),
  experience: Type.Number(),
  hourlyRate: Type.Number(),
  licenseNumber: Type.String(),
  languages: Type.Array(Type.String()),

  clinicAddress: Type.Object({
    clinicName: Type.Optional(Type.String()),
    street: Type.Optional(Type.String()),
    locality: Type.Optional(Type.String()),
    city: Type.String(),
    state: Type.String(),
    zipCode: Type.String()
  }),

  consultationDuration: Type.Number(),
  verified: Type.Optional(Type.Boolean()),
  status: Type.Optional(Type.String()) // 'active' | 'pending' | 'suspended'
})

export type Doctor = Static<typeof doctorsSchema>
