import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const joinUserData = async (context: HookContext) => {
  const joinOne = async (doctor: any) => {
    try {
      const user = await context.app.service('users').get(doctor.userId, { provider: undefined })
      return {
        ...doctor,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        isDeleted: user.isDeleted === true
      }
    } catch {
      return doctor
    }
  }
  if (Array.isArray(context.result?.data)) {
    context.result.data = await Promise.all(context.result.data.map(joinOne))
  } else if (context.result && !Array.isArray(context.result)) {
    context.result = await joinOne(context.result)
  }
  return context
}

/**
 * Public listings (anonymous + patient) must never show deleted or suspended
 * doctors. Admins still see everything.
 */
const hideRemovedFromPublic = async (context: HookContext) => {
  // Admin and internal calls bypass the filter.
  if (!context.params.provider) return context
  if (context.params.user?.role === 'admin') return context

  // Defer to the after-hook joinUserData to filter, since the user status
  // lives on the joined user record, not the doctor profile itself.
  ;(context.params as any)._filterRemovedAfterJoin = true
  return context
}

const dropRemovedAfterJoin = async (context: HookContext) => {
  if (!(context.params as any)._filterRemovedAfterJoin) return context
  if (Array.isArray(context.result?.data)) {
    context.result.data = context.result.data.filter(
      (d: any) => !d.isDeleted && d.status !== 'suspended'
    )
  } else if (context.result?.isDeleted || context.result?.status === 'suspended') {
    // Single get → return null-ish to indicate the doctor is hidden.
    context.result = { ...context.result, hidden: true }
  }
  return context
}

export default {
  before: {
    all: [],
    find: [hideRemovedFromPublic],
    get:  [hideRemovedFromPublic],
    create: [
      authenticate('jwt'),
      async (context: HookContext) => {
        const user = context.params.user
        if (user.role !== 'doctor' && user.role !== 'admin') {
          throw new Forbidden('Only doctor can create profile')
        }
        context.data.userId    = user._id.toString()
        context.data.createdAt = new Date().toISOString()
        context.data.updatedAt = new Date().toISOString()
        context.data.verified  = false
        return context
      }
    ],
    patch: [
      authenticate('jwt'),
      async (context: HookContext) => {
        const user = context.params.user
        if (user.role !== 'doctor' && user.role !== 'admin') {
          throw new Forbidden('Only doctor can update profile')
        }
        if (user.role === 'doctor') {
          const doctor = await context.service.get(context.id)
          if (doctor.userId.toString() !== user._id.toString()) {
            throw new Forbidden('You can update only your own profile')
          }
        }
        context.data.updatedAt = new Date().toISOString()
        return context
      }
    ],
    remove: [
      authenticate('jwt'),
      async (context: HookContext) => {
        if (context.params.user.role !== 'admin') {
          throw new Forbidden('Only admin can delete doctor')
        }
        return context
      }
    ]
  },
  after: {
    find: [joinUserData, dropRemovedAfterJoin],
    get:  [joinUserData, dropRemovedAfterJoin]
  },
  error: {}
}
