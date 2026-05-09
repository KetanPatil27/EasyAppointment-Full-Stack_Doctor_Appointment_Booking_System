import type { Application } from '../../declarations'
import { VerifyOtpService } from './verify-otp.class'

declare module '../../declarations' {
  interface ServiceTypes {
    'verify-otp': VerifyOtpService
  }
}

export const verifyOtp = (app: Application) => {
  app.use('verify-otp', new VerifyOtpService(app) as any)
}
