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

    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15) // 15 min

    await passwordResets.create({
      userId: user._id.toString(),
      token: hashedToken,
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
