import crypto from 'crypto'
import { BadRequest, NotFound, TooManyRequests } from '@feathersjs/errors'
import type { Application } from '../../declarations'
import { sendOtpEmail } from '../../utils/mailer'

/**
 * POST /resend-otp { email }
 *   - Looks up user by email
 *   - Enforces a per-email cooldown so the user can't trigger N emails per second
 *   - Generates a fresh 6-digit OTP, stores its hash, and emails the plain code
 *
 * The cooldown is computed from `otpExpiresAt`:
 *   the OTP was issued at (otpExpiresAt - EXPIRY_MINUTES). If less than
 *   COOLDOWN_SECONDS have passed since that moment, reject with 429.
 */
const EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)
const COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10)

const generateOtp = (): string => {
  // crypto-secure 6-digit numeric OTP. randomInt avoids modulo bias.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex')

export class ResendOtpService {
  constructor(private app: Application) {}

  async create(data: any) {
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : ''
    if (!email) throw new BadRequest('Email is required')

    const users = this.app.service('users')
    const found = await users.find({ query: { email }, paginate: false, provider: undefined } as any)
    const list = Array.isArray(found) ? found : found?.data || []
    if (list.length === 0) {
      throw new NotFound('No account found with this email address')
    }
    const user = list[0]

    if (user.emailVerified === true) {
      throw new BadRequest('Email already verified — you can sign in directly.')
    }

    // ── Cooldown check ──
    if (user.otpExpiresAt) {
      const issuedAt = new Date(user.otpExpiresAt).getTime() - EXPIRY_MINUTES * 60 * 1000
      const elapsedSec = (Date.now() - issuedAt) / 1000
      if (elapsedSec < COOLDOWN_SECONDS) {
        const wait = Math.ceil(COOLDOWN_SECONDS - elapsedSec)
        throw new TooManyRequests(
          `Please wait ${wait} more second${wait === 1 ? '' : 's'} before requesting a new code.`
        )
      }
    }

    // ── Generate + persist + send ──
    const otp = generateOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000).toISOString()

    await users.patch(
      user._id,
      { otpHash, otpExpiresAt: expiresAt, otpAttempts: 0 },
      { provider: undefined }
    )

    try {
      await sendOtpEmail(email, otp, EXPIRY_MINUTES)
    } catch (err) {
      console.error('[ResendOtp] Email send failed', { email, error: (err as Error).message })
      // Don't expose mailer details to the client; the OTP is in DB anyway.
    }

    return {
      message: `New verification code sent to ${email}. It expires in ${EXPIRY_MINUTES} minutes.`,
      cooldownSeconds: COOLDOWN_SECONDS
    }
  }
}
