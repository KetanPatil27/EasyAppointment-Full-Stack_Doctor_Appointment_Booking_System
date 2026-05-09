import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'

/**
 * Try to authenticate the request via JWT.
 *
 * The JWT strategy (see src/authentication.ts) reads from EITHER:
 *   - the `accessToken` httpOnly cookie (default since Phase 1)
 *   - the legacy `Authorization: Bearer …` header
 *
 * If authentication succeeds → context.params.user is populated downstream
 * hooks can scope the query.
 * If authentication fails → we swallow the error and proceed as anonymous.
 * That's intentional: patients and unauth visitors must still be able to
 * GET /slots to browse a doctor's availability before signing in.
 *
 * Why try/catch instead of a header-presence check?
 *   The previous implementation only checked `headers.authorization` and was
 *   silently broken once we switched to cookie auth (the cookie isn't in the
 *   `authorization` header). Always-attempt-then-catch is robust to whichever
 *   transport the JWT arrived on and forward-compatible with future ones.
 */
const tryAuthenticate = async (context: HookContext) => {
  if (!context.params.provider) return context // internal calls bypass auth
  try {
    await authenticate('jwt')(context as any)
  } catch {
    // Anonymous request — leave context.params.user undefined and continue.
  }
  return context
}

/**
 * Layer 1 of doctor-isolation defense:
 *   Force the find query to filter by the logged-in doctor's _id.
 *
 *   We OVERWRITE any client-supplied doctorId — never trust it. If a doctor
 *   sends `?doctorId=<other-doctor>` to peek at someone else's calendar,
 *   the server replaces it with their own id before the DB sees the query.
 *
 *   Admins are exempt and can see all slots (for moderation/support).
 *   Patients and anonymous visitors aren't filtered here — they're allowed
 *   to browse any doctor's slots (that's the public booking flow).
 */
const filterSlotsByDoctor = async (context: HookContext) => {
  const user = context.params.user
  if (!user) return context // anonymous — public browsing
  if (user.role === 'admin') return context // admin sees everything

  if (user.role === 'doctor') {
    if (!context.params.query) context.params.query = {}
    context.params.query.doctorId = user._id.toString()
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
    // Order matters: tryAuthenticate must run FIRST so filterSlotsByDoctor can
    // see context.params.user. Reversing the order silently disables the filter.
    find: [tryAuthenticate, filterSlotsByDoctor],
    get: [],
    create: [authenticate('jwt'), onlyDoctors, attachDoctorId],
    patch: [authenticate('jwt')],
    remove: [authenticate('jwt'), onlyDoctors, restrictDeleteToOwner]
  },
  after: {},
  error: {}
}
