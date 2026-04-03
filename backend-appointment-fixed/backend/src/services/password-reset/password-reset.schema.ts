export interface PasswordReset {
  _id?: string
  userId: string
  email: string
  token: string
  status: 'active' | 'used' | 'expired'
  expiresAt: Date
  createdAt: string
}