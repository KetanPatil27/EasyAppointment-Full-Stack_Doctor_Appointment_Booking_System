import crypto from 'crypto'
import { BadRequest, TooManyRequests } from '@feathersjs/errors'
import type { Application } from '../../declarations'
import { sendResetEmail } from '../../utils/mailer'

/**
 * Per-email rate limit: an attacker cannot grind through one email at 4-per-second
 * even if they rotate IPs. Stops abuse of password-reset emails as a "send-spam"
 * vector and protects users from being flooded with reset emails.
 */
const PER_EMAIL_LIMIT = 3
const PER_EMAIL_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * STRICT_EMAIL_VALIDATION env var (default: false):
 *   - true  → returns 400 "No account found..." when email isn't registered.
 *             Better UX (instant typo feedback). Trades enumeration safety for clarity.
 *   - false → returns generic "If that email exists..." for every request.
 *             Better security (no enumeration). Worse UX.
 *
 * The per-email rate limit applies regardless of which mode you pick.
 */
const isStrictValidation = () => process.env.STRICT_EMAIL_VALIDATION === 'true'

const GENERIC_MESSAGE = 'If that email exists, a reset link has been sent'

export class ForgotPasswordService {
  constructor(private app: Application) {}

  async create(data: any) {
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : ''

    if (!email) {
      throw new BadRequest('Email is required')
    }

    const users = this.app.service('users')
    const passwordResets = this.app.service('password-resets')

    // ── Per-email rate limit ──
    // Count any reset entry created for this email within the last hour. We count
    // ALL statuses (active, used, expired) — the goal is to throttle the *send*,
    // not just successful sends.
    const since = new Date(Date.now() - PER_EMAIL_WINDOW_MS)
    const recent = await passwordResets.find({
      query: {
        email,
        createdAt: { $gte: since.toISOString() },
        $limit: PER_EMAIL_LIMIT + 1
      },
      provider: undefined
    } as any)
    const recentCount = Array.isArray(recent) ? recent.length : recent.total ?? recent.data?.length ?? 0
    if (recentCount >= PER_EMAIL_LIMIT) {
      throw new TooManyRequests(
        `Too many reset attempts for this email. Please wait an hour before trying again.`
      )
    }

    const found = await users.find({ query: { email } })
    const userExists = Array.isArray(found?.data) && found.data.length > 0

    // ── Email-existence handling ──
    if (!userExists) {
      if (isStrictValidation()) {
        throw new BadRequest('No account found with this email address')
      }
      // Generic mode: return success without revealing that the email is unknown.
      // Don't even create a password-resets record (would just bloat the DB).
      return { message: GENERIC_MESSAGE }
    }

    const user = found.data[0]
    const userId = user._id.toString()

    // ── Invalidate all previous active tokens for this user ──
    try {
      const existing = await passwordResets.find({
        query: { userId, status: 'active' },
        paginate: false
      } as any)
      const tokens = Array.isArray(existing) ? existing : existing.data || []
      for (const tok of tokens) {
        await passwordResets.patch(tok._id, { status: 'expired' }, { provider: undefined })
      }
    } catch {
      // Old tokens will expire via TTL anyway
    }

    // ── Generate new token ──
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15) // 15 min

    await passwordResets.create(
      {
        userId,
        email,
        token: hashedToken,
        status: 'active',
        expiresAt,
        createdAt: new Date().toISOString()
      },
      { provider: undefined } as any
    )

    try {
      await sendResetEmail(email, rawToken)
    } catch (err) {
      console.error('[ForgotPassword] Email send failed:', err)
      // Email errors are NEVER exposed to the client (they would leak existence too).
    }

    // In strict mode we can confirm "Reset link sent" because we already proved
    // the user exists. In generic mode we still use the boilerplate message.
    return {
      message: isStrictValidation()
        ? 'Reset link sent. Check your email — link expires in 15 minutes.'
        : GENERIC_MESSAGE
    }
  }
}
