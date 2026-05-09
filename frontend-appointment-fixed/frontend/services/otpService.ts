import api from './api'

export interface OtpVerifyResponse {
  message: string
  emailVerified: boolean
}

export interface OtpResendResponse {
  message: string
  cooldownSeconds: number
}

export const verifyOtp = async (email: string, otp: string): Promise<OtpVerifyResponse> => {
  const res = await api.post('/verify-otp', { email, otp })
  return res.data
}

export const resendOtp = async (email: string): Promise<OtpResendResponse> => {
  const res = await api.post('/resend-otp', { email })
  return res.data
}
