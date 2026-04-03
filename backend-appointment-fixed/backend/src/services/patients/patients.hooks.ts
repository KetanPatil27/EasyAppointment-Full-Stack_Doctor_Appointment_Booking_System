import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const onlyPatientCreate = async (context: HookContext) => {
  const { user } = context.params
  if (!user || user.role !== 'patient') {
    throw new Forbidden('Only patient can create profile')
  }
  context.data.userId = user._id.toString()
  context.data.createdAt = new Date().toISOString()
  context.data.updatedAt = new Date().toISOString()
  return context
}

const restrictToOwner = async (context: HookContext) => {
  if (!context.params.provider) return context
  const { user } = context.params
  if (!user) throw new Forbidden('Not authenticated')

  if (user.role === 'admin') return context

  if (context.method === 'find') {
    context.params.query = {
      ...context.params.query,
      userId: user._id.toString()
    }
  }

  if (context.id) {
    const patient = await context.service.get(context.id, { provider: undefined })
    if (patient.userId.toString() !== user._id.toString()) {
      throw new Forbidden('Access denied')
    }
  }

  return context
}

const preventDuplicateProfile = async (context: HookContext) => {
  const { user } = context.params
  if (!user) throw new Forbidden('Not authenticated')

  const existing = await context.service.find({
    query: { userId: user._id.toString() },
    paginate: false,
    provider: undefined
  } as any)

  if (Array.isArray(existing) && existing.length > 0) {
    throw new Forbidden('Profile already exists. Use PATCH to update.')
  }

  return context
}

const syncUserData = async (context: HookContext) => {
  const { user } = context.params
  if (!user) return context

  const { fullName, phone } = context.result
  const updateData: Record<string, any> = {}

  if (fullName !== undefined) updateData.name = fullName
  if (phone !== undefined) updateData.phone = phone

  if (Object.keys(updateData).length > 0) {
    await context.app.service('users').patch(user._id, updateData, { provider: undefined })
  }

  return context
}

const addUpdatedAt = async (context: HookContext) => {
  if (context.data) {
    context.data.updatedAt = new Date().toISOString()
  }
  return context
}

export default {
  before: {
    all: [authenticate('jwt')],
    find: [restrictToOwner],
    get: [restrictToOwner],
    create: [onlyPatientCreate, preventDuplicateProfile],
    patch: [restrictToOwner, addUpdatedAt],
    remove: [restrictToOwner]
  },
  after: {
    patch: [syncUserData]
  },
  error: {}
}
