import { authenticate } from '@feathersjs/authentication'
import type { HookContext } from '../../declarations'

const attachSender = async (context: HookContext) => {
  context.data.senderId = context.params.user._id.toString()
  context.data.createdAt = new Date().toISOString()
  context.data.read = false
  return context
}

const filterByParticipant = async (context: HookContext) => {
  const userId = context.params.user._id.toString()
  const query = context.params.query || {}
  const { otherUserId, ...rest } = query

  if (otherUserId) {
    // Conversation between two specific users
    context.params.query = {
      ...rest,
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      $sort: { createdAt: 1 },
      $limit: context.params.query?.$limit || 200
    }
  } else {
    // All messages where this user participated
    context.params.query = {
      ...rest,
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      $sort: { createdAt: -1 },
      $limit: context.params.query?.$limit || 500
    }
  }
  return context
}

export default {
  before: {
    all: [authenticate('jwt')],
    find: [filterByParticipant],
    get: [],
    create: [attachSender],
    patch: [],
    remove: []
  },
  after: {},
  error: {}
}
