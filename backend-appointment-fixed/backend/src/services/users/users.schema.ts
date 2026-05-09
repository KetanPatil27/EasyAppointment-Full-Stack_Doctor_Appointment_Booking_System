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
  emailVerified: Type.Optional(Type.Boolean()),
  otpHash: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  otpExpiresAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  otpAttempts: Type.Optional(Type.Number()),

  // ── Suspend/Delete metadata (Upgrades 5+7) ──
  // `suspendedReason` is set when status flips to 'suspended', cleared on
  // restore. `suspendedAt` is when the action happened.
  suspendedReason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  suspendedAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  // Soft delete — never hard-delete medical-data-bearing accounts. Kept for
  // legal retention. Restorable within 30 days via admin "Restore" action.
  isDeleted: Type.Optional(Type.Boolean()),
  deletedAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  deletedReason: Type.Optional(Type.Union([Type.String(), Type.Null()])),

  createdAt: Type.Optional(Type.String({ format: 'date-time' })),
  updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
})

export type User = Static<typeof userSchema>

// Data required to create
export const userDataSchema = Type.Pick(userSchema, ['name', 'email', 'phone', 'password', 'role', 'status'])

// Data allowed to patch
export const userPatchSchema = Type.Partial(userDataSchema)
