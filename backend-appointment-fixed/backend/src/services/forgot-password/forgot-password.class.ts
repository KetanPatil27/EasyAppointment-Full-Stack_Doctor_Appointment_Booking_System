import crypto from 'crypto'
import type { Application } from '../../declarations'
import { sendResetEmail } from '../../utils/mailer'

export class ForgotPasswordService {
  constructor(private app: Application) {}

  async create(data: any) {
    const { email } = data

    if (!email) {
      throw new Error('Email is required')
    }

    const users = this.app.service('users')
    const passwordResets = this.app.service('password-resets')

    const found = await users.find({ query: { email } })

    // For security, always return success even if email not found
    if (!found.data || found.data.length === 0) {
      return { message: 'If that email exists, a reset link has been sent' }
    }

    const user = found.data[0]
    const userId = user._id.toString()

    // ── Invalidate all previous tokens for this user ──
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
      // Silently continue — old tokens will expire via TTL anyway
    }

    // ── Generate new token ──
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15) // 15 minutes

    await passwordResets.create({
      userId,
      email,
      token: hashedToken,
      status: 'active',
      expiresAt,
      createdAt: new Date().toISOString()
    }, { provider: undefined } as any)

    try {
      await sendResetEmail(email, rawToken)
    } catch (err) {
      console.error('Email send failed:', err)
      // Don't expose email errors to client
    }

    return { message: 'If that email exists, a reset link has been sent' }
  }
}
