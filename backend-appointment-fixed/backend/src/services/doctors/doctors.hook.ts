import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const joinUserData = async (context: HookContext) => {
  const joinOne = async (doctor: any) => {
    try {
      const user = await context.app.service('users').get(doctor.userId, { provider: undefined })
      return { ...doctor, name: user.name, email: user.email, phone: user.phone, status: user.status }
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

export default {
  before: {
    all: [],
    find: [],
    get:  [],
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
    find: [joinUserData],
    get:  [joinUserData]
  },
  error: {}
}
