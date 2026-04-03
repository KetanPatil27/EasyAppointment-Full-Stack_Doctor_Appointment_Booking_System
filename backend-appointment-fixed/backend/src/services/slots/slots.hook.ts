import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

// Doctors see only their own slots; patients/public see all (for booking)
const filterSlotsByDoctor = async (context: HookContext) => {
  if (context.params.user?.role === 'doctor') {
    if (!context.params.query) context.params.query = {}
    context.params.query.doctorId = context.params.user._id.toString()
  }
  return context
}

// Optional auth: authenticate if token present, allow through if not
const optionalAuth = async (context: HookContext) => {
  if (context.params.provider && context.params.headers?.authorization) {
    return authenticate('jwt')(context)
  }
  return context
}

const onlyDoctors = async (context: HookContext) => {
  if (context.params.user?.role !== 'doctor' && context.params.user?.role !== 'admin') {
    throw new Forbidden('Only doctors can create or delete slots')
  }
  return context
}

const attachDoctorId = async (context: HookContext) => {
  // doctorId = the doctor user's _id (same as userId on doctors profile)
  context.data.doctorId = context.params.user._id.toString()
  context.data.isBooked = false
  context.data.createdAt = new Date().toISOString()
  return context
}

const restrictDeleteToOwner = async (context: HookContext) => {
  const user = context.params.user
  if (user.role === 'admin') return context
  const slot = await context.service.get(context.id)
  if (slot.doctorId !== user._id.toString()) {
    throw new Forbidden('You can only delete your own slots')
  }
  return context
}

export default {
  before: {
    all: [],
    find: [optionalAuth, filterSlotsByDoctor],   // doctors see own slots; patients/public see all
    get: [],
    create: [authenticate('jwt'), onlyDoctors, attachDoctorId],
    patch: [authenticate('jwt')],
    remove: [authenticate('jwt'), onlyDoctors, restrictDeleteToOwner]
  },
  after: {},
  error: {}
}
