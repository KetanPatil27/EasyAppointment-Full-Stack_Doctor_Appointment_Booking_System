import type { Application } from '../../declarations'
import { ForgotPasswordService } from './forgot-password.class'

declare module '../../declarations' {
  interface ServiceTypes {
    'forgot-password': ForgotPasswordService
  }
}

export const forgotPassword = (app: Application) => {
  app.use('forgot-password', new ForgotPasswordService(app) as any)
}