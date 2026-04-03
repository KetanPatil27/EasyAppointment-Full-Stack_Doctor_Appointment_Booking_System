import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

const onlyDoctorCreate = async (context: HookContext) => {
  const { user } = context.params
  if (user.role !== 'doctor' && user.role !== 'admin') {
    throw new Forbidden('Only doctors can add prescriptions')
  }
  context.data.doctorId = user._id.toString()
  context.data.createdAt = new Date().toISOString()
  context.data.updatedAt = new Date().toISOString()
  return context
}

const filterByRole = async (context: HookContext) => {
  const { user } = context.params
  if (!context.params.query) context.params.query = {}
  if (user.role === 'patient') {
    context.params.query.patientId = user._id.toString()
  } else if (user.role === 'doctor') {
    context.params.query.doctorId = user._id.toString()
  }
  return context
}

const onlyDoctorPatch = async (context: HookContext) => {
  const { user } = context.params
  if (user.role !== 'doctor' && user.role !== 'admin') {
    throw new Forbidden('Only doctors can update prescriptions')
  }
  context.data.updatedAt = new Date().toISOString()
  return context
}

// Join doctor name and patient name after fetch
const joinUserNames = async (context: HookContext) => {
  const join = async (presc: any) => {
    try {
      const [doctorUser, patientUser] = await Promise.all([
        context.app.service('users').get(presc.doctorId, { provider: undefined }).catch(() => null),
        context.app.service('users').get(presc.patientId, { provider: undefined }).catch(() => null)
      ])
      return {
        ...presc,
        doctorName:  doctorUser?.name  || 'Doctor',
        patientName: patientUser?.name || 'Patient',
      }
    } catch {
      return presc
    }
  }

  if (Array.isArray(context.result?.data)) {
    context.result.data = await Promise.all(context.result.data.map(join))
  } else if (context.result && !Array.isArray(context.result)) {
    context.result = await join(context.result)
  }
  return context
}

export default {
  before: {
    all:    [authenticate('jwt')],
    find:   [filterByRole],
    get:    [],
    create: [onlyDoctorCreate],
    patch:  [onlyDoctorPatch],
    remove: [
      async (context: HookContext) => {
        if (!['admin', 'doctor'].includes(context.params.user.role)) {
          throw new Forbidden('Not allowed')
        }
        return context
      }
    ]
  },
  after: {
    find: [joinUserNames],
    get:  [joinUserNames],
  },
  error: {}
}
