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

    const found = await passwordResets.find({
      query: { token: hashedToken }
    })

    if (!found.data || !found.data.length) {
      throw new Error('Invalid or expired token')
    }

    const reset = found.data[0]

    // Check expiry
    if (new Date(reset.expiresAt) < new Date()) {
      await passwordResets.remove(reset._id, { provider: undefined })
      throw new Error('Token has expired')
    }

    // Update password (hook will hash it)
    await users.patch(
      reset.userId,
      { password },
      { provider: undefined }
    )

    // Clean up used token
    await passwordResets.remove(reset._id, { provider: undefined })

    return { message: 'Password updated successfully' }
  }
}
