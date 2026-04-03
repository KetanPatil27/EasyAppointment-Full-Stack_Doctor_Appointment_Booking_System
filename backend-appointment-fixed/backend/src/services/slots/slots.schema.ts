import { Type, Static } from '@feathersjs/typebox'

// Slot stored in MongoDB
export const slotSchema = Type.Object({
  _id: Type.Optional(Type.String()),
  doctorId: Type.String(),       // auto-attached from logged-in doctor
  date: Type.String(),           // ISO date string e.g., "2026-02-10"
  startTime: Type.String(),      // e.g., "10:00"
  endTime: Type.String(),        // e.g., "10:30"
  isBooked: Type.Boolean()       // default false
})

export type Slot = Static<typeof slotSchema>

// Data required to create
export const slotDataSchema = Type.Pick(slotSchema, ['date', 'startTime', 'endTime'])

// Data allowed to patch
export const slotPatchSchema = Type.Partial(slotSchema)
