import crypto from 'crypto'
import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as localHooks } from '@feathersjs/authentication-local'
import { Forbidden, BadRequest } from '@feathersjs/errors'
import type { HookContext } from '../../declarations'
import { sendOtpEmail } from '../../utils/mailer'

const { authenticate } = authHooks
const { hashPassword, protect } = localHooks

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)

const generateOtp = (): string =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex')

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

/**
 * Initialise email-verification state at create time. Admins skip the OTP step
 * (we trust seeded admin accounts). Patients and doctors get an OTP issued and
 * saved on the user document; they must verify before login.
 */
const initEmailVerification = async (context: HookContext) => {
  if (context.data.role === 'admin') {
    context.data.emailVerified = true
    return context
  }
  context.data.emailVerified = false

  const otp = generateOtp()
  context.data.otpHash = hashOtp(otp)
  context.data.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
  context.data.otpAttempts = 0

  // Stash the plain OTP on params so the after-hook can email it. We can't
  // include it in the response body — it would leak the code and bypass the
  // "send via email" requirement.
  context.params._pendingOtp = otp
  return context
}

/**
 * After the user is created, deliver the plain OTP via email. We do this in
 * an after-hook (not before-hook) so the email only goes out if the DB write
 * actually succeeded.
 */
const sendOtpAfterCreate = async (context: HookContext) => {
  const otp: string | undefined = (context.params as any)._pendingOtp
  const email: string | undefined = context.result?.email
  if (!otp || !email) return context // admin or some other path

  try {
    await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES)
  } catch (err) {
    console.error('[Signup] OTP email send failed', {
      email,
      error: (err as Error).message
    })
    // Don't fail the registration — the user can request a resend.
  }
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

/**
 * Replaced the previous hard-delete cascade with a single transactional
 * orchestrator (utils/cascade-suspend-delete.ts) that handles suspend,
 * unsuspend, AND soft-delete consistently. See that file for the full matrix
 * of effects.
 *
 * Hook wiring:
 *   - patch with status transition → run cascade, short-circuit Feathers's
 *     own update so user doc + slots + appointments + audit-log all commit
 *     in the SAME MongoDB transaction.
 *   - remove → run cascade as soft-delete, short-circuit the actual DB delete
 *     so historical records are retained for medical/legal compliance.
 */
const adminOnlyForCascade = async (context: HookContext) => {
  if (!context.params.provider) return context
  if (context.params.user?.role !== 'admin') {
    throw new Forbidden('Only admins can suspend or delete user accounts')
  }
  return context
}

const detectSuspendTransition = async (context: HookContext) => {
  if (!context.params.provider) return context
  const incomingStatus = context.data?.status
  if (incomingStatus !== 'suspended' && incomingStatus !== 'active') return context
  if (context.params.user?.role !== 'admin') return context
  if (!context.id) return context

  const target = await context.service.get(context.id, { provider: undefined } as any).catch(() => null)
  if (!target) return context

  const currentStatus = target.status
  const reason = (typeof context.data?.reason === 'string' ? context.data.reason : '').trim()

  let action: 'suspend' | 'unsuspend' | null = null
  if (incomingStatus === 'suspended' && currentStatus !== 'suspended') action = 'suspend'
  if (incomingStatus === 'active' && currentStatus === 'suspended') action = 'unsuspend'
  if (!action) return context

  const { cascadeSuspendOrDelete } = await import('../../utils/cascade-suspend-delete')
  const result = await cascadeSuspendOrDelete({
    app: context.app,
    action,
    user: {
      _id: target._id.toString(),
      name: target.name,
      email: target.email,
      role: target.role
    },
    reason,
    actorId: context.params.user._id.toString()
  })

  // Short-circuit Feathers' own update — the cascade already updated the user doc
  // inside the transaction. Return the freshly fetched user as the response.
  context.result = await context.service.get(context.id, { provider: undefined } as any)
  ;(context.result as any).cascade = result
  return context
}

const softDeleteViaCascade = async (context: HookContext) => {
  if (!context.params.provider) return context
  if (context.params.user?.role !== 'admin') {
    throw new Forbidden('Only admins can delete user accounts')
  }
  if (!context.id) return context

  const target = await context.service.get(context.id, { provider: undefined } as any).catch(() => null)
  if (!target) return context

  const reason = (typeof (context.data as any)?.reason === 'string' ? (context.data as any).reason : '').trim()

  const { cascadeSuspendOrDelete } = await import('../../utils/cascade-suspend-delete')
  const result = await cascadeSuspendOrDelete({
    app: context.app,
    action: 'delete',
    user: {
      _id: target._id.toString(),
      name: target.name,
      email: target.email,
      role: target.role
    },
    reason,
    actorId: context.params.user._id.toString()
  })

  // Short-circuit so the actual DB delete never runs — record is now
  // soft-deleted with isDeleted: true.
  context.result = await context.service.get(context.id, { provider: undefined } as any)
  ;(context.result as any).cascade = result
  return context
}

export default {
  before: {
    find: [authenticateExternal(), restrictUserAccess],
    get: [],
    create: [addTimestampsOnCreate, initEmailVerification, hashPassword('password')],
    update: [authenticateExternal(), selfOrAdmin, updateTimestamp, hashPassword('password')],
    patch: [authenticateExternal(), selfOrAdmin, updateTimestamp, detectSuspendTransition, hashPassword('password')],
    remove: [authenticateExternal(), adminOnlyForCascade, softDeleteViaCascade]
  },
  after: {
    all: [protect('password', 'otpHash')],
    create: [sendOtpAfterCreate]
  }
}
