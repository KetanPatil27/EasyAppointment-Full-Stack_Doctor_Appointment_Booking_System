import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as localHooks } from '@feathersjs/authentication-local'
import { Forbidden, BadRequest } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const { authenticate } = authHooks
const { hashPassword, protect } = localHooks

const authenticateExternal = () => async (context: HookContext) => {
  if (!context.params.provider) return context
  return authenticate('jwt')(context)
}

const addTimestampsOnCreate = async (context: HookContext) => {
  const now = new Date().toISOString()
  // Doctors start as 'pending' until admin approval; others start as 'active'
  if (!context.data.status) {
    context.data.status = context.data.role === 'doctor' ? 'pending' : 'active'
  }
  context.data.createdAt = now
  context.data.updatedAt = now
  return context
}

const updateTimestamp = async (context: HookContext) => {
  context.data.updatedAt = new Date().toISOString()
  return context
}

const restrictUserAccess = async (context: HookContext) => {
  if (!context.params.provider) return context
  const user = context.params.user
  if (!user) throw new Forbidden('Not authenticated')
  if (user.role === 'admin') return context

  if (context.method === 'find') {
    context.params.query = { ...context.params.query, _id: user._id }
  }
  if (context.id && context.id.toString() !== user._id.toString()) {
    throw new Forbidden('Access denied')
  }
  return context
}

const selfOrAdmin = async (context: HookContext) => {
  if (!context.params.provider) return context
  const user = context.params.user
  if (!user) throw new Forbidden('Not authenticated')
  if (user.role === 'admin') return context
  if (context.id && context.id.toString() !== user._id.toString()) {
    throw new Forbidden('You can only modify your own account')
  }
  return context
}

// Clean up associated data when user is deleted
const cascadeDelete = async (context: HookContext) => {
  if (!context.params.provider) return context
  try {
    const userId = context.id?.toString()
    if (!userId) return context

    // Get the user before deletion to know their role
    const user = await context.service.get(context.id).catch(() => null)
    if (!user) return context

    // Cancel active appointments and release slots
    const cancelStatus = user.role === 'doctor' ? 'cancelled_by_doctor' : 'cancelled_by_patient'
    const queryField = user.role === 'doctor' ? 'doctorId' : 'patientId'
    const appointmentService = context.app.service('appointments')
    const slotService = context.app.service('slots')

    try {
      const result = await appointmentService.find({
        query: { [queryField]: userId, status: { $in: ['booked', 'confirmed'] } },
        paginate: false,
        provider: undefined
      } as any)
      const appointments = Array.isArray(result) ? result : result.data || []
      for (const appt of appointments) {
        await appointmentService.patch(appt._id, { status: cancelStatus }, { provider: undefined }).catch(() => {})
        if (appt.slotId) {
          await slotService.patch(appt.slotId, { isBooked: false }, { provider: undefined }).catch(() => {})
        }
      }
    } catch {}

    // Delete patient profile if exists
    await context.app.service('patients').remove(null as any, {
      query: { userId },
      provider: undefined
    } as any).catch(() => {})

    // Delete doctor profile if exists
    if (user.role === 'doctor') {
      await context.app.service('doctors').remove(null as any, {
        query: { userId },
        provider: undefined
      } as any).catch(() => {})
      // Delete doctor's slots
      await slotService.remove(null as any, {
        query: { doctorId: userId },
        provider: undefined
      } as any).catch(() => {})
    }
  } catch {}
  return context
}

export default {
  before: {
    find: [authenticateExternal(), restrictUserAccess],
    get: [],
    create: [addTimestampsOnCreate, hashPassword('password')],
    update: [authenticateExternal(), selfOrAdmin, updateTimestamp, hashPassword('password')],
    patch: [authenticateExternal(), selfOrAdmin, updateTimestamp, hashPassword('password')],
    remove: [authenticateExternal(), selfOrAdmin, cascadeDelete]
  },
  after: {
    all: [protect('password')]
  }
}
