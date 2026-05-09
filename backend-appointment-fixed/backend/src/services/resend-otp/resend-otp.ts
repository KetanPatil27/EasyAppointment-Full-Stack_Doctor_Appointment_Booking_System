import type { Application } from '../../declarations'
import { ResendOtpService } from './resend-otp.class'

declare module '../../declarations' {
  interface ServiceTypes {
    'resend-otp': ResendOtpService
  }
}

export const resendOtp = (app: Application) => {
  app.use('resend-otp', new ResendOtpService(app) as any)
}
