import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const restrictToOwner = async (context: HookContext) => {
  if (!context.params.provider) return context
  const { user } = context.params
  if (!context.params.query) context.params.query = {}
  if (user.role === 'patient') {
    context.params.query.userId = user._id.toString()
  }
  return context
}

const attachUserId = async (context: HookContext) => {
  context.data.userId = context.params.user._id.toString()
  context.data.updatedAt = new Date().toISOString()
  if (!context.data.createdAt) context.data.createdAt = new Date().toISOString()
  return context
}

export default {
  before: {
    all: [authenticate('jwt')],
    find: [restrictToOwner],
    get: [],
    create: [attachUserId],
    patch: [
      async (context: HookContext) => {
        context.data.updatedAt = new Date().toISOString()
        return context
      }
    ],
    remove: []
  },
  after: {},
  error: {}
}
