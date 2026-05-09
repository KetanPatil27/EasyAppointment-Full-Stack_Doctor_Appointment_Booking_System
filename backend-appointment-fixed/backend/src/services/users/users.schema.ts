import { Type, Static } from '@feathersjs/typebox'

// Main data model
export const userSchema = Type.Object({
  _id: Type.Optional(Type.String()),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  phone: Type.String(),
  password: Type.String(),
  role: Type.Union([Type.Literal('patient'), Type.Literal('doctor'), Type.Literal('admin')]),
  status: Type.Union(
    [Type.Literal('active'), Type.Literal('suspended'), Type.Literal('inactive')],
    { default: 'active' }
  ),

  // ── Email-verification (Upgrade 4) ──
  // emailVerified is the gate that login checks. Until true, the user cannot
  // authenticate via the local strategy.
  emailVerified: Type.Optional(Type.Boolean()),
  // OTP state — all nullable. Populated when an OTP is issued, cleared on
  // successful verification.
  otpHash: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  otpExpiresAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  otpAttempts: Type.Optional(Type.Number()),

  createdAt: Type.Optional(Type.String({ format: 'date-time' })),
  updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
})

export type User = Static<typeof userSchema>

// Data required to create
export const userDataSchema = Type.Pick(userSchema, ['name', 'email', 'phone', 'password', 'role', 'status'])

// Data allowed to patch
export const userPatchSchema = Type.Partial(userDataSchema)
