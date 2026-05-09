import crypto from 'crypto'
import { BadRequest, NotFound } from '@feathersjs/errors'
import type { Application } from '../../declarations'

/**
 * POST /verify-otp { email, otp }
 *   - Looks up user by email
 *   - Validates OTP against stored hash
 *   - Enforces expiry + max-attempts
 *   - On success: sets emailVerified=true, clears OTP fields
 *   - On failure: increments attempts; after max, invalidates the OTP entirely
 */
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10)

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex')

export class VerifyOtpService {
  constructor(private app: Application) {}

  async create(data: any) {
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : ''
    const otp = typeof data?.otp === 'string' ? data.otp.trim() : ''

    if (!email || !otp) {
      throw new BadRequest('Email and OTP are required')
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequest('OTP must be exactly 6 digits')
    }

    const users = this.app.service('users')
    const found = await users.find({ query: { email }, paginate: false, provider: undefined } as any)
    const list = Array.isArray(found) ? found : found?.data || []
    if (list.length === 0) {
      throw new NotFound('No account found with this email address')
    }
    const user = list[0]

    if (user.emailVerified === true) {
      // Idempotent — already verified accounts shouldn't error.
      return { message: 'Email already verified', emailVerified: true }
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      throw new BadRequest('No active OTP. Please request a new code.')
    }

    if (new Date(user.otpExpiresAt).getTime() < Date.now()) {
      // Clear stale OTP.
      await users.patch(
        user._id,
        { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
        { provider: undefined }
      )
      throw new BadRequest('OTP has expired. Please request a new code.')
    }

    const attempts = (user.otpAttempts ?? 0) + 1
    const submittedHash = hashOtp(otp)

    if (submittedHash !== user.otpHash) {
      if (attempts >= MAX_ATTEMPTS) {
        // Too many wrong tries — invalidate the OTP entirely so attacker can't
        // keep guessing on the same code; user must request a fresh one.
        await users.patch(
          user._id,
          { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
          { provider: undefined }
        )
        throw new BadRequest(
          `Too many incorrect attempts. The OTP has been invalidated — please request a new code.`
        )
      }
      await users.patch(user._id, { otpAttempts: attempts }, { provider: undefined })
      const remaining = MAX_ATTEMPTS - attempts
      throw new BadRequest(`Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`)
    }

    // ── Success: mark verified, wipe OTP fields ──
    await users.patch(
      user._id,
      {
        emailVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0
      },
      { provider: undefined }
    )

    return { message: 'Email verified successfully', emailVerified: true }
  }
}
