import crypto from 'crypto'
import type { Application } from '../../declarations'

export class ResetPasswordService {
  constructor(private app: Application) {}

  async create(data: any) {
    const { token, password } = data

    if (!token || !password) {
      throw new Error('Token and password are required')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    const users = this.app.service('users')
    const passwordResets = this.app.service('password-resets')

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

    // ── Find token and verify it is active ──
    const found = await passwordResets.find({
      query: { token: hashedToken, status: 'active' }
    })

    if (!found.data || !found.data.length) {
      throw new Error('Invalid or expired reset token. Please request a new one.')
    }

    const reset = found.data[0]

    // ── Check expiry ──
    if (new Date(reset.expiresAt) < new Date()) {
      // Mark expired for audit trail (TTL will clean up the record)
      await passwordResets.patch(reset._id, { status: 'expired' }, { provider: undefined })
      throw new Error('This reset link has expired. Please request a new one.')
    }

    // ── Update password (the users hook will hash it) ──
    await users.patch(
      reset.userId,
      { password },
      { provider: undefined }
    )

    // ── Mark token as used (audit trail — TTL auto-deletes later) ──
    await passwordResets.patch(reset._id, { status: 'used' }, { provider: undefined })

    return { message: 'Password updated successfully' }
  }
}
