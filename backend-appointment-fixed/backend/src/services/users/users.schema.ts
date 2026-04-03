import { Type, Static } from '@feathersjs/typebox'

// Main data model
export const userSchema = Type.Object({
  _id: Type.Optional(Type.String()),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  phone: Type.String(),
  password: Type.String(),
  role: Type.Union([Type.Literal('patient'), Type.Literal('doctor'), Type.Literal('admin')]),
  status: Type.Union([
  Type.Literal('active'),
  Type.Literal('suspended'),
  Type.Literal('inactive')
], { default: 'active' }),
  createdAt: Type.Optional(Type.String({ format: 'date-time' })),
  updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
})

export type User = Static<typeof userSchema>

// Data required to create
export const userDataSchema = Type.Pick(userSchema, ['name', 'email', 'phone', 'password', 'role', 'status'])

// Data allowed to patch
export const userPatchSchema = Type.Partial(userDataSchema)
