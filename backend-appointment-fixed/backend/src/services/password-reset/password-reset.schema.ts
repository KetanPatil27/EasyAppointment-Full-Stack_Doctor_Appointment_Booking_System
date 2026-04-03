export interface PasswordReset {
  _id?: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: number
}