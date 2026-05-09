import { authenticate } from '@feathersjs/authentication'
import { Forbidden, BadRequest } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const onlyPatientCreate = async (context: HookContext) => {
  const { user } = context.params
  if (!user || user.role !== 'patient') throw new Forbidden('Only patients can leave reviews')

  const { appointmentId } = context.data
  if (!appointmentId) throw new BadRequest('appointmentId is required')

  const appt = await context.app.service('appointments').get(appointmentId, { provider: undefined })
  if (appt.patientId !== user._id.toString()) throw new Forbidden('Not your appointment')
  if (appt.status !== 'completed') throw new BadRequest('Can only review completed appointments')

  const existing = await (context.app.service('reviews') as any).find({
    query: { appointmentId, patientId: user._id.toString() },
    provider: undefined,
    paginate: false
  })
  const list = Array.isArray(existing) ? existing : existing?.data || []
  if (list.length > 0) throw new BadRequest('You already reviewed this appointment')

  context.data.patientId = user._id.toString()
  context.data.doctorId  = appt.doctorId
  context.data.createdAt = new Date().toISOString()
  return context
}

const joinPatientName = async (context: HookContext) => {
  const join = async (review: any) => {
    try {
      const user = await context.app.service('users').get(review.patientId, { provider: undefined })
      return { ...review, patientName: user.name }
    } catch { return review }
  }
  if (Array.isArray(context.result?.data)) {
    context.result.data = await Promise.all(context.result.data.map(join))
  } else if (Array.isArray(context.result)) {
    context.result = await Promise.all(context.result.map(join))
  } else if (context.result && typeof context.result === 'object') {
    context.result = await join(context.result)
  }
  return context
}

// Patient sees their own reviews; doctor sees reviews for their doctorId;
// admin sees all; anonymous public reads MUST scope to a specific doctorId
// (otherwise we'd leak every patient's review of every doctor).
const filterByRole = async (context: HookContext) => {
  if (!context.params.query) context.params.query = {}

  // Anonymous: require explicit doctorId — public doctor profile pages already
  // pass it. Without it we'd serve a global review feed to scrapers.
  if (!context.params.user) {
    if (!context.params.query.doctorId) {
      throw new BadRequest('doctorId query parameter is required for unauthenticated review queries')
    }
    return context
  }

  const { user } = context.params

  if (user.role === 'patient') {
    // Patient can filter by doctorId (for public profile) or see their own
    if (!context.params.query.doctorId) {
      context.params.query.patientId = user._id.toString()
    }
  } else if (user.role === 'doctor') {
    if (!context.params.query.doctorId) {
      context.params.query.doctorId = user._id.toString()
    }
  }
  return context
}

export default {
  before: {
    all:    [],            // No global auth — find is public for doctor profile pages
    find:   [filterByRole],
    get:    [],
    create: [authenticate('jwt'), onlyPatientCreate],
    patch:  [authenticate('jwt')],
    remove: [authenticate('jwt')]
  },
  after: {
    find: [joinPatientName],
    get:  [joinPatientName]
  },
  error: {}
}
