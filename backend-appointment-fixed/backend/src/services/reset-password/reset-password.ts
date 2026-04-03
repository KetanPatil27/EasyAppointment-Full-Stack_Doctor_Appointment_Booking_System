import type { Application } from '../../declarations'
import { ResetPasswordService } from './reset-password.class'

declare module '../../declarations' {
  interface ServiceTypes {
    'reset-password': ResetPasswordService
  }
}

export const resetPassword = (app: Application) => {
  app.use('reset-password', new ResetPasswordService(app) as any)
}