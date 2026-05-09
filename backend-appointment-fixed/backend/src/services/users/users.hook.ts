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
    create: [addTimestampsOnCreate, initEmailVerification, hashPassword('password')],
    update: [authenticateExternal(), selfOrAdmin, updateTimestamp, hashPassword('password')],
    patch: [authenticateExternal(), selfOrAdmin, updateTimestamp, hashPassword('password')],
    remove: [authenticateExternal(), selfOrAdmin, cascadeDelete]
  },
  after: {
    all: [protect('password', 'otpHash')],
    create: [sendOtpAfterCreate]
  }
}
